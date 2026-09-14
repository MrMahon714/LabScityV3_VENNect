"use server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export async function generateEmbedding(
  text: string,
  taskType: TaskType,
  dimensions: number = 1024
): Promise<number[] | null> {
  if (!text.trim()) return null;

  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
      config: {
        taskType,
        outputDimensionality: dimensions,
      },
    });
    return response.embeddings?.[0]?.values ?? null;
  } catch (err) {
    console.error("Embedding generation failed:", err);
    return null;
  }
}

export async function buildOffersText(userId: string, supabase: any): Promise<string> {
  const parts: string[] = [];

  // Bio
  const { data: profile } = await supabase
    .from("profile")
    .select("about")
    .eq("user_id", userId)
    .maybeSingle();
  if (profile?.about) parts.push(`Bio: ${profile.about}`);

  // Skills 
  const { data: skills } = await supabase
    .from("profile_skills_view")
    .select("name")
    .eq("user_id", userId);
  if (skills?.length) {
    parts.push(`Skills: ${skills.map((s: any) => s.name).join(", ")}`);
  }

  // Research areas
  const { data: tags } = await supabase
    .from("profile_declared_tags_view")
    .select("name")
    .eq("user_id", userId);
  if (tags?.length) {
    parts.push(`Research Areas: ${tags.map((t: any) => t.name).join(", ")}`);
  }

  // Recent publications ai_topics 
  const { data: pubs, error: pubsError } = await supabase
    .from("user_publications")
    .select("publications(ai_topics, date_published)")
    .eq("user_id", userId);

  if (pubsError) {
    console.error("Failed to fetch publications for offers text:", pubsError);
  }

  const sortedPubs = (pubs ?? [])
    .filter((row: any) => row.publications)
    .sort((a: any, b: any) => {
      const dateA = a.publications.date_published ?? "";
      const dateB = b.publications.date_published ?? "";
      return dateB.localeCompare(dateA); 
    })
    .slice(0, 15);

  const allTopics = sortedPubs.flatMap((row: any) => row.publications.ai_topics ?? []);
  const uniqueTopics = [...new Set(allTopics)];
  if (uniqueTopics.length) {
    parts.push(`Publication Topics: ${uniqueTopics.join(", ")}`);
  }

  return parts.join("\n");
}

export async function buildSeeksText(userId: string, supabase: any): Promise<string> {
  const { data: profile, error } = await supabase
    .from("profile")
    .select("seeking_description")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch seeking_description:", error);
    return "";
  }

  return profile?.seeking_description?.trim() ?? "";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const REQUESTS_PER_MINUTE = Number(process.env.GEMINI_RATE_LIMIT_RPM ?? 15);
const DELAY_MS = Math.ceil(60000 / REQUESTS_PER_MINUTE);

export async function generateProfileEmbeddings(
  userId: string,
  supabaseOverride?: any
): Promise<{ success: boolean; hasOffers: boolean; hasSeeks: boolean; error?: string }> {
  const supabase = supabaseOverride;
  if (!supabase) {
    return { success: false, hasOffers: false, hasSeeks: false, error: "No Supabase client provided" };
  }

  const offersText = await buildOffersText(userId, supabase);
  const offersEmbedding = offersText
    ? await generateEmbedding(offersText, "RETRIEVAL_DOCUMENT")
    : null;

  await sleep(DELAY_MS); 

  const seeksText = await buildSeeksText(userId, supabase);
  const seeksEmbedding = seeksText
    ? await generateEmbedding(seeksText, "RETRIEVAL_QUERY")
    : null;

  const { error } = await supabase
    .from("profile")
    .update({
      offers_embedding: offersEmbedding,
      seeks_embedding: seeksEmbedding,
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to save embeddings:", error);
    return { success: false, hasOffers: !!offersEmbedding, hasSeeks: !!seeksEmbedding, error: error.message };
  }

  return { success: true, hasOffers: !!offersEmbedding, hasSeeks: !!seeksEmbedding };
}