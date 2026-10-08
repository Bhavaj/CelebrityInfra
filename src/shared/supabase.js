import { createClient } from "@supabase/supabase-js";

// These are safe to expose in frontend code. Real protection is Row Level
// Security in the database. Set them in Vercel as environment variables,
// or they fall back to the values below.
const url = import.meta.env.VITE_SUPABASE_URL || "https://suczwoujthnyzqgmvyra.supabase.co";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_h6Xg-Enp4kP1x4nuRoEybw_xKCZHkGn";

export const supabase = createClient(url, key);
