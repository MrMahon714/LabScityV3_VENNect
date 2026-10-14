import { createClient } from "@supabase/supabase-js";

export function createScriptClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.NEXT_SECRET_SUPABASE_KEY!;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env vars for script client");
  }

  return createClient(url, serviceKey);
}