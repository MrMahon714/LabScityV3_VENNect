import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    try {
        const { scholar_id, user_id } = await request.json();

        if (!scholar_id || !user_id) {
            return NextResponse.json(
                { error: 'scholar_id and user_id are required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.SCRAPINGDOG_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Scrapingdog API key not configured on server' },
                { status: 500 }
            );
        }

        //Fetch from Scrapingdog Author API
        const url = `https://api.scrapingdog.com/google_scholar/author?api_key=${apiKey}&author_id=${scholar_id}`;
        const response = await fetch(url);

        const responseText = await response.text();

        if (!response.ok) {
            console.error("Scrapingdog Error Response:", responseText);
            throw new Error(`Scrapingdog request failed with status ${response.status}: ${responseText.substring(0, 100)}`);
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse Scrapingdog JSON. Received:", responseText);
            throw new Error("Scrapingdog returned non-JSON data (see terminal console)");
        }

        //Extract articles from the parsed data
        const articles = data.articles || [];

        //Find or create the author record for this user
        let { data: authorData, error: authorError } = await supabase
            .from('authors')
            .select('id')
            .eq('user_id', user_id)
            .single();

        if (!authorData) {

            //Create author record if it does not exist yet with google_scholar_id
            const { data: newAuthor, error: createError } = await supabase
                .from('authors')
                .insert({
                    user_id: user_id,
                    google_scholar_id: scholar_id
                })
                .select('id')
                .single();

            if (createError) {
                throw new Error(`Failed to create author record: ${createError.message}`);
            }
            authorData = newAuthor;
        }

        //Process each article
        for (const article of articles) {

            //Insert publication metadata into publications table
            const { data: pubData, error: pubError } = await supabase
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

            if (pubError || !pubData) continue;

            const publication_id = pubData.publication_id;

            //Link in user_publications
            await supabase.from('user_publications').insert({
                user_id: user_id,
                publication_id: publication_id,
                is_featured: false,
            });

            //Link in authors_publications
            await supabase.from('authors_publications').insert({
                author_id: authorData.id,
                publication_id: publication_id,
            });
        }

        return NextResponse.json({
            success: true,
            imported_count: articles.length,
        });
    } catch (error: any) {
        console.error('Error fetching publications:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
