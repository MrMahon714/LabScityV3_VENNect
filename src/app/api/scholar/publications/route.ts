import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
        );
    }

    return createClient(url, key);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, scholar_id, user_id, articles: selectedArticles } = body;

        const supabase = getSupabaseClient();
        const apiKey = process.env.SCRAPINGDOG_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'Scrapingdog API key not configured on server' },
                { status: 500 }
            );
        }

        // STEP 1: Preview publications and tag those already added by this user
        if (action === 'preview' || !action) {
            if (!scholar_id || !user_id) {
                return NextResponse.json(
                    { error: 'scholar_id and user_id are required for preview' },
                    { status: 400 }
                );
            }

            const url = `https://api.scrapingdog.com/google_scholar/author?api_key=${apiKey}&author_id=${scholar_id}`;
            const response = await fetch(url);
            const responseText = await response.text();

            if (!response.ok) {
                console.error("Scrapingdog Error Response:", responseText);
                throw new Error(`Scrapingdog request failed with status ${response.status}`);
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                throw new Error("Scrapingdog returned non-JSON data");
            }

            const articles = data.articles || [];

            // Fetch all publications already linked to this user
            const { data: userPubs } = await supabase
                .from('user_publications')
                .select('publications(title)')
                .eq('user_id', user_id);

            const existingTitles = new Set(
                (userPubs || []).map((up: any) => up.publications?.title).filter(Boolean)
            );

            // Attach an already_added flag to each article
            const processedArticles = articles.map((art: any) => ({
                ...art,
                already_added: existingTitles.has(art.title),
            }));

            return NextResponse.json({
                success: true,
                articles: processedArticles,
            });
        }

        // STEP 2: Save selected publications to Supabase
        if (action === 'save') {
            if (!user_id || !selectedArticles || !Array.isArray(selectedArticles)) {
                return NextResponse.json(
                    { error: 'user_id and articles array are required for saving' },
                    { status: 400 }
                );
            }

            let { data: authorData } = await supabase
                .from('authors')
                .select('id')
                .eq('user_id', user_id)
                .single();

            if (!authorData) {
                const { data: newAuthor, error: createError } = await supabase
                    .from('authors')
                    .insert({ user_id: user_id, google_scholar_id: body.scholar_id || '' })
                    .select('id')
                    .single();

                if (createError) throw new Error(`Failed to create author record: ${createError.message}`);
                authorData = newAuthor;
            }

            let importedCount = 0;

            for (const article of selectedArticles) {
                if (!article.title) continue;

                // Check if publication exists globally by title
                let { data: pubData } = await supabase
                    .from('publications')
                    .select('publication_id')
                    .eq('title', article.title)
                    .maybeSingle();

                let publication_id;

                if (!pubData) {
                    const { data: newPub, error: pubError } = await supabase
                        .from('publications')
                        .insert({
                            title: article.title,
                            journal: article.publication || null,
                            authors: article.authors ? [article.authors] : [],
                            pdf_url: article.link || null,
                            date_published: article.year ? `${article.year}-01-01` : null,
                        })
                        .select('publication_id')
                        .single();

                    if (pubError || !newPub) continue;
                    publication_id = newPub.publication_id;
                } else {
                    publication_id = pubData.publication_id;
                }

                // Check if user is already linked
                const { data: existingUserPub } = await supabase
                    .from('user_publications')
                    .select('user_id')
                    .eq('user_id', user_id)
                    .eq('publication_id', publication_id)
                    .maybeSingle();

                if (!existingUserPub) {
                    await supabase.from('user_publications').insert({
                        user_id: user_id,
                        publication_id: publication_id,
                        is_featured: false,
                    });
                    importedCount++;
                }

                // Check if author-publication link exists
                const { data: existingAuthorPub } = await supabase
                    .from('authors_publications')
                    .select('author_id')
                    .eq('author_id', authorData.id)
                    .eq('publication_id', publication_id)
                    .maybeSingle();

                if (!existingAuthorPub) {
                    await supabase.from('authors_publications').insert({
                        author_id: authorData.id,
                        publication_id: publication_id,
                    });
                }
            }

            return NextResponse.json({
                success: true,
                imported_count: importedCount,
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Error handling publications:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
