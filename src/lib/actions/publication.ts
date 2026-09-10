"use server";

import { z } from "zod";
import { createClient } from "@/supabase/server";
import {
    createPublicationSchema,
    doiSchema,
    parsedOpenAlexWorkSchema,
    updatePublicationSchema,
    type CreatePublicationValues,
    type UpdatePublicationValues
} from "@/lib/validations/publication";

import type { DataResponse, Publication } from "@/lib/types/data";
import { OpenAlexWork, ParsedOpenAlexWork } from "../types/publication";
import { MAX_FEATURED_PUBLICATIONS } from "../constants/publications";
import { parseOpenAlexWork } from "../utils/openalex";
import { syncOpenAlexTopics } from "./openalex";
import { generateTopicsForUnprocessedPublications } from "./generate-publication-topics";

export async function addPublicationByDoi(
  doi: string
): Promise<DataResponse<Publication>> {
  try{
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user){
        return { success: false, error: "Authentication required"}
    }

    const parsedDoi = doiSchema.parse(doi);
    const res = await fetch(`https://api.openalex.org/works/doi:${parsedDoi}`);
    if(!res.ok) throw new Error(`OpenAlex Error: ${res.status}`);
    const data: OpenAlexWork = await res.json();

    const parsed: ParsedOpenAlexWork = parseOpenAlexWork(data);
    
    const { data: existing } = await supabase
      .from("user_publications")
      .select("publication_id, publications!inner(doi)")
      .eq("user_id", authData.user.id)
      .eq("publications.doi", parsedDoi)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "You've already added this publication" };
    }

    const createPubResult = await createPublication({
      title: parsed.title,
      doi: parsed.doi!,
      journal: parsed.journal,
      datePublished: parsed.publicationDate,
      authors: parsed.authors,
      isOA: parsed.isOA,
      pdfUrl: parsed.pdfUrl,
      publicationType: parsed.type,
    });

    if(!createPubResult.success) return createPubResult;

    if(parsed?.openAlexTopicIds && parsed.openAlexTopicIds.length > 0) {
      await linkPublicationTopics(
        createPubResult.data!.publication_id,
        parsed.openAlexTopicIds
      )
    }

    const { data: profile } = await supabase
      .from('profile')
      .select('orcid')
      .eq('user_id', authData.user.id)
      .single();

    // sql trigger will skip users with an orchid id and call syncOpenAlexTopics directly
    // otherwise, trigger will call recompute_profile_tags supabsae function to calculate works count manually
    if (profile?.orcid) {
      await syncOpenAlexTopics(profile.orcid, authData.user.id);
    }

    generateTopicsForUnprocessedPublications(1).catch((err) =>
      console.error("Background topic generation failed:", err)
    );

    return createPubResult;
  } catch(err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0]?.message ?? "Malformed publication shape"};
    }
    return { success: false, error: 'Failed to add publication'};
  }
}

export interface BulkInsertPublicationsResponse {
  inserted: number;
  skipped: number;
}

export async function bulkInsertPublications(
  publications: ParsedOpenAlexWork[]
): Promise<DataResponse<BulkInsertPublicationsResponse>> {
  try {
    const supabase = await createClient(); 
    const { data: authData } = await supabase.auth.getUser();

    if(!authData.user) { 
      return { success: false, error: "Authentication required" }
    }

    const parsedPubs = publications.map((pub) => parsedOpenAlexWorkSchema.parse(pub));

    const { data, error } = await supabase
    .rpc('bulk_import_user_publications',
      { p_publications: parsedPubs, p_user_id: authData.user.id }
    );

    if(error){ 
      console.error(error);
      return {
        success: false,
        error: error.message
      };
    }

    generateTopicsForUnprocessedPublications(parsedPubs.length).catch((err) => 
      console.error("Background topic generation failed:", err) 
    );

    return {
      success: true,
      data
    }

  } catch(err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0]?.message ?? "Invalid DOI"};
    }
    return { success: false, error: 'Failed to add publications'};
  }

}

async function linkPublicationTopics(
  publicationId: number,
  openAlexTopicIds: string[],
): Promise<void> {
  const supabase = await createClient();

  const { data: tagRows, error: tagError } = await supabase
    .from('tags')
    .select('id, openalex_id')
    .in('openalex_id', openAlexTopicIds);

  if(tagError) {
    console.warn('Failed to look up tags: ', tagError.message);
    return;
  }

  if(!tagRows || tagRows.length == 0) return;

  const links = tagRows.map((tag) => ({
    publication_id: publicationId,
    tag_id: tag.id
  }));

  const { error: linkError } = await supabase
    .from('publication_tags')
    .upsert(links, { onConflict: 'publication_id,tag_id'});

  if(linkError) {
    console.warn('Failed to link topics:', linkError.message);
  }
}

export async function createPublication(
  input: CreatePublicationValues
): Promise<DataResponse<Publication>> {
    try {
        const parsed = createPublicationSchema.parse(input);
        const supabase = await createClient();
        
        const { data: authData } = await supabase.auth.getUser();

        if (!authData.user){
            return { 
                success: false, 
                error: "Authentication required"
            }
        }

        let publication = null;
        if(parsed.doi) {
          const { data: existing } = await supabase
            .from("publications")
            .select("publication_id")
            .eq("doi", input.doi)
            .maybeSingle();
          publication = existing;
        }

        if (!publication) {
          const { data, error: publicationError } = await supabase
            .from("publications")
            .insert({
                title: parsed.title,
                doi: parsed.doi || null,
                journal: parsed.journal || null,
                date_published: parsed.datePublished ?? null,
                authors: parsed.authors ?? null,
                preview_path: parsed.previewPath ?? null,
                is_oa: parsed.isOA ?? false,
                pdf_url: parsed.pdfUrl || null,
                type: parsed.publicationType ?? "other",
            })
            .select()
            .single();

          if(publicationError){
              return { success: false, error: publicationError.message}
          } 

          publication = data;
        }

        const { error: linkError } = await supabase
            .from("user_publications")
            .insert({
                user_id: authData.user.id,
                publication_id: publication.publication_id
            });

        if(linkError){
            return { success: false, error: linkError.message };
        }

        return {
            success: true,
            data: publication,
        };

    } catch (error ){
        if(error instanceof z.ZodError){
            return {
                success: false,
                error: error.issues[0]?.message ?? "Validation failed",
            }
        }
        return {success: false, error: "Failed to create publication"};
    }
}

async function syncUserPublicationTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  publicationId: number,
  tags: { id: number | null; name: string }[],
) {
  const rows = tags.map((t) =>
    t.id != null
      ? { user_id: userId, publication_id: publicationId, tag_id: t.id, name: null }
      : { user_id: userId, publication_id: publicationId, tag_id: null, name: t.name.trim() },
  );
  const { error: delErr } = await supabase
    .from("user_publication_tags").delete()
    .eq("user_id", userId).eq("publication_id", publicationId);
  if (delErr) throw new Error(`tag delete failed: ${delErr.message}`);
  if (rows.length) {
    const { error: insErr } = await supabase.from("user_publication_tags").insert(rows);
    if (insErr) throw new Error(`tag insert failed: ${insErr.message}`);
  }
}

export async function updatePublication(
  publicationId: number,
  input: UpdatePublicationValues,
): Promise<DataResponse<Publication>> {
  try {
    const parsed = updatePublicationSchema.parse(input);
    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return { success: false, error: "Authentication required" };
    if (!Number.isInteger(publicationId) || publicationId <= 0)
      return { success: false, error: "Invalid publication id" };

    const { data: owned, error: ownErr } = await supabase
      .from("user_publications")
      .select("publication_id")
      .eq("user_id", authData.user.id)
      .eq("publication_id", publicationId)
      .maybeSingle();
    if (ownErr) return { success: false, error: ownErr.message };
    if (!owned) return { success: false, error: "Publication not found or unauthorized" };

    const updates = {
      title: parsed.title,
      type: parsed.type,
      journal: parsed.journal ?? null,
      date_published: parsed.date_published ?? null,
      authors: parsed.authors ?? [],
      is_oa: parsed.is_oa ?? false,
      pdf_url: parsed.pdf_url ?? null,
    };

    const { error: overlayErr } = await supabase
      .from("user_publications")
      .update({ updates, tags_overridden: true })
      .eq("user_id", authData.user.id)
      .eq("publication_id", publicationId);
    if (overlayErr) return { success: false, error: overlayErr.message };

    await syncUserPublicationTags(supabase, authData.user.id, publicationId, parsed.tags ?? []);

    const { data: merged, error: readErr } = await supabase
      .from("user_publications_full")
      .select("*")
      .eq("user_id", authData.user.id)
      .eq("publication_id", publicationId)
      .single();
    if (readErr) return { success: false, error: readErr.message };

    return { success: true, data: merged as Publication };
  } catch (error) {
    if (error instanceof z.ZodError)
      return { success: false, error: error.issues[0]?.message ?? "Validation failed" };
    return { success: false, error: "Failed to update publication" };
  }
}

// gets the logged in user, checks that the publication id is valid and belongs to the user, then deletes the row
// also deleted from the join table
// returns the deleted publication id

export async function deletePublication(
    publicationId: number
): Promise<DataResponse<{ publication_id: number }>> {
    try {
        const supabase = await createClient();

        const { data: authData } = await supabase.auth.getUser();

        if (!authData.user) {
            return {
                success: false,
                error: "Authentication required",
            };
        }

        if (!Number.isInteger(publicationId) || publicationId <= 0) {
            return {
                success: false,
                error: "Invalid publication id",
            };
        }

        const { data: existingPublication, error: ownershipError } =
            await supabase
                .from("user_publications")
                .select("publication_id")
                .eq("user_id", authData.user.id)
                .eq("publication_id", publicationId)
                .maybeSingle();

        if (ownershipError) {
            return {
                success: false,
                error: ownershipError.message,
            };
        }

        if (!existingPublication) {
            return {
                success: false,
                error: "Publication not found or unauthorized",
            };
        }

        const { data, error: deleteError } = 
          await supabase
            .from('user_publications')
            .delete()
            .eq('user_id', authData.user.id)
            .eq('publication_id', publicationId);
        
        if(deleteError) {
          return {
            success: false,
            error: deleteError.message
          };
        }

        return {
            success: true,
            data: {
                publication_id: publicationId,
            },
        };
    } catch {
        return {
            success: false,
            error: "Failed to delete publication",
        };
    }
}

export async function setFeaturedPublication(
  publicationId: number,
  isFeatured: boolean
){
  try {
    if (!Number.isInteger(publicationId) || publicationId <= 0) {
        return {
            success: false,
            error: "Invalid publication id",
        };
    }
    
    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
        return {
            success: false,
            error: "Authentication required",
        };
    }

    if(isFeatured) {
      const { count, error: validationError } = 
        await supabase
          .from("user_publications")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", authData.user.id)
          .eq("is_featured", true)
        
      if (validationError) {
        return {
          success: false,
          error: validationError.message
        }
      }

      if((count ?? 0) >= 3) {
        return { 
          success: false,
          error: `You can only feature up to ${MAX_FEATURED_PUBLICATIONS} publications`
        }
      }
    }

    const { data: publication, error } =
      await supabase
        .from("user_publications")
        .update({ is_featured: isFeatured })
        .eq("user_id", authData.user.id)
        .eq("publication_id", publicationId)
        .select()
        .maybeSingle();

    if (error){
        return {
            success: false,
            error: error.message
        };
    }    

    if(!publication) {
      return {
        success: false,
        error: 'Publication does not exist or user not authorized'
      }
    }

    return {success: true};
    
  } catch(error) {
    console.error("[setFeaturedPublication] error:", error);
    return {
      success: false,
      error: "Failed to set featured publication"
    }
  }
}