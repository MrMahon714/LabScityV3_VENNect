import { type NextRequest, NextResponse } from "next/server";
import { matchFiltersSchema } from "@/lib/validations/matching";
import { createClient } from "@/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const explicitUserId = request.nextUrl.searchParams.get("user_id");
  const currentUserId = explicitUserId ?? user?.id;

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_collaborators_final", {
    current_user_id: currentUserId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.text();
  let body: unknown = {};
  if (raw.trim()) {
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 },
      );
    }
  }

  const parsed = matchFiltersSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: issue
          ? `${issue.path.join(".")}: ${issue.message}`
          : "Invalid filters",
      },
      { status: 400 },
    );
  }

  // TODO (VDT-78/79)

  const _filters = parsed.data;

  const { data, error } = await supabase.rpc("get_collaborators_final", {
    current_user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
