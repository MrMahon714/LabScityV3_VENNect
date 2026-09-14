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

        //Call Gemini API to extract resume data using structured outputs
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
                            text: 'Extract the research areas and technical skills from this resume.',
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
                            description: 'Technical skills, programming languages, tools, frameworks, and software listed in the resume.',
                        },
                    },
                    required: ['researchAreas', 'skills'],
                },
            },
        });

        const resultText = response.text;
        const extractedData = resultText ? JSON.parse(resultText) : { researchAreas: [], skills: [] };

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
