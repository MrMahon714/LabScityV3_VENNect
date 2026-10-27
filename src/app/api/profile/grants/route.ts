import { NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';

//GET: Fetch all grants for the authenticated user
export async function GET() {
    try {
        const supabase = await createClient();

        //Securely retrieve the authenticated user from session cookies
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: grants, error } = await supabase
            .from('grants')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching grants:', error);
            return NextResponse.json({ error: 'Failed to fetch grants' }, { status: 500 });
        }

        return NextResponse.json({ success: true, grants });
    } catch (err) {
        console.error('Grants GET route error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

//POST: Save extracted/new grants for the authenticated user
export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        //Securely retrieve the authenticated user from session cookies
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { grants } = body;

        if (!Array.isArray(grants)) {
            return NextResponse.json({ error: 'Invalid payload: grants must be an array' }, { status: 400 });
        }

        const grantsToInsert = grants.map((grant) => ({
            user_id: user.id,
            title: grant.title,
            granting_agency: grant.grantingAgency || grant.granting_agency,
            program: grant.program || null,
            years_awarded: grant.yearsAwarded || grant.years_awarded || null,
            role: grant.role || null,
            collaborators: grant.collaborators || [],
        }));

        const { data, error } = await supabase
            .from('grants')
            .insert(grantsToInsert)
            .select();

        if (error) {
            console.error('Error saving grants:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, grants: data });
    } catch (err) {
        console.error('Grants POST route error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

//DELETE: Remove a specific grant by ID for the authenticated user
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();

        //Securely retrieve the authenticated user from session cookies
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        //Get the grant ID from the URL search params (e.g., /api/profile/grants?id=10)
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing grant ID' }, { status: 400 });
        }

        //Delete the grant, ensuring it belongs to the logged-in user (RLS protection)
        const { error } = await supabase
            .from('grants')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error deleting grant:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Grant deleted successfully' });
    } catch (err) {
        console.error('Grants DELETE route error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
