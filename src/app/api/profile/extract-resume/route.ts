import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { ai } from '@/lib/gemini';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        //Check if file exists and is a PDF
        const isPdf = file && (
            file.type === 'application/pdf' ||
            file.name.toLowerCase().endsWith('.pdf')
        );

        if (!file || !isPdf) {
            return NextResponse.json(
                { error: 'Please upload a valid PDF file.' },
                { status: 400 }
            );
        }

        //Convert file to base64 for Gemini multimodal input
        const bytes = await file.arrayBuffer();
        const base64Data = Buffer.from(bytes).toString('base64');

        //Call Gemini API to extract CV/Resume data using structured outputs
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                mimeType: 'application/pdf',
                                data: base64Data,
                            },
                        },
                        {
                            text: `Extract profile information from this CV/Resume document:
1. 'researchAreas': All key research focus areas, fields of study, or academic domains.
2. 'skills': EVERY technical skill, tool, framework, and programming language without artificial capping or truncation. Crucially, DO NOT skip single-character languages or tools (e.g., "C", "R").
3. 'grants': All research grants, fellowships, and funding awards. Include title, granting agency, program, year(s), role, and collaborators. DO NOT extract or include dollar/monetary amounts.
4. 'publications': All academic publications, journal articles, and conference proceedings. Include title, publication type, authors, journal/venue, publication date, DOI/link, and relevant research topic tags.

If grants or publications are not present in the CV, return empty arrays [] for those fields.`,
                        },
                    ],
                },
            ],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        researchAreas: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'Key research areas, fields of study, or academic domains identified in the resume.',
                        },
                        skills: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'Complete list of all technical skills, single-character languages (e.g., C, R), tools, frameworks, and software listed in the resume without artificial limits.',
                        },
                        grants: {
                            type: Type.ARRAY,
                            description: 'List of grants, research funding, or fellowships awarded (excluding financial dollar amounts).',
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING, description: 'Title of the grant or project.' },
                                    grantingAgency: { type: Type.STRING, description: 'Funder or granting agency (e.g., NSF, NIH, DoD).' },
                                    program: { type: Type.STRING, description: 'Specific funding program name, if mentioned.' },
                                    yearsAwarded: { type: Type.STRING, description: 'Year or duration range awarded (e.g., "2023-2025" or "2024").' },
                                    role: { type: Type.STRING, description: 'Role on the grant (e.g., PI, Co-PI, Senior Researcher).' },
                                    collaborators: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING },
                                        description: 'Co-investigators or collaborators listed on the grant.',
                                    },
                                },
                                required: ['title', 'grantingAgency'],
                            },
                        },
                        publications: {
                            type: Type.ARRAY,
                            description: 'List of academic publications, journal articles, or conference papers.',
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING, description: 'Title of the publication.' },
                                    publicationType: {
                                        type: Type.STRING,
                                        description: 'Type of publication (e.g., "Journal Article", "Conference Paper", "Book Chapter", "Preprint").',
                                    },
                                    authors: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING },
                                        description: 'Ordered list of co-authors as formatted on the document.',
                                    },
                                    journalOrVenue: { type: Type.STRING, description: 'Journal, publisher, or conference venue name.' },
                                    publicationDate: {
                                        type: Type.STRING,
                                        description: 'Month/year or year of publication (e.g., "May 2024" or "2024").',
                                    },
                                    doi: { type: Type.STRING, description: 'DOI link or publication URL if available.' },
                                    topics: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING },
                                        description: 'Keywords or research topic tags related to the publication.',
                                    },
                                },
                                required: ['title'],
                            },
                        },
                    },
                    required: ['researchAreas', 'skills', 'grants', 'publications'],
                },
            },
        });

        const resultText = response.text;
        const extractedData = resultText
            ? JSON.parse(resultText)
            : { researchAreas: [], skills: [], grants: [], publications: [] };

        return NextResponse.json({
            success: true,
            fileName: file.name,
            extractedData,
        });
    } catch (error) {
        console.error('Resume extraction error:', error);
        return NextResponse.json(
            { error: 'Failed to extract resume data.' },
            { status: 500 }
        );
    }
}
