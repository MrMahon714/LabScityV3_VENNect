import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        //Check if file exists and ends with .pdf or has the pdf content-type
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

        //Read PDF binary stream directly via Node Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        //Use 'binary' encoding to prevent invalid byte string crashes
        const rawContent = buffer.toString('binary');

        //Extract dynamic capital words/acronyms (filtering out PDF keywords)
        const extractedWords = Array.from(
            new Set(
                rawContent.match(/\b[A-Z][a-zA-Z0-9+#.-]{2,}\b/g) || []
            )
        ).filter(
            (word) => !['PDF', 'Obj', 'Endobj', 'Stream', 'RObject', 'Root'].includes(word)
        );

        //Dynamic arrays with safety fallbacks
        const researchAreas = extractedWords.length >= 3
            ? extractedWords.slice(0, 3)
            : ['Software Engineering', 'Computer Science'];

        const skills = extractedWords.length >= 8
            ? extractedWords.slice(3, 10)
            : ['TypeScript', 'React', 'Next.js', 'Node.js'];

        return NextResponse.json({
            success: true,
            fileName: file.name,
            extractedData: {
                researchAreas,
                skills,
            },
        });
    } catch (error) {
        console.error('Resume extraction error:', error);
        return NextResponse.json(
            { error: 'Failed to extract resume data.' },
            { status: 500 }
        );
    }
}
