"use server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { DataResponse } from "@/lib/types/data";
import { createClient } from "@/supabase/server";

export async function getOpenToCollaboration(
  supabaseClient?: SupabaseClient,
): Promise<DataResponse<boolean>> {
  try {
    const supabase = supabaseClient ?? (await createClient());
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { success: false, error: "Authentication required" };
    }

    const { data, error } = await supabase
      .from("profile")
      .select("open_to_collaboration")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.open_to_collaboration ?? true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load setting",
    };
  }
}

export async function setOpenToCollaboration(
  open: boolean,
  supabaseClient?: SupabaseClient,
): Promise<DataResponse<boolean>> {
  try {
    const value = z.boolean().parse(open);
    const supabase = supabaseClient ?? (await createClient());
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { success: false, error: "Authentication required" };
    }

    const { error } = await supabase
      .from("profile")
      .update({ open_to_collaboration: value })
      .eq("user_id", authData.user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: value };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: "Value must be true or false" };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update setting",
    };
  }
}
