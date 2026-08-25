import { supabase } from "@/integrations/supabase/client";

// Cache to avoid repeated queries during a session
const verifiedCache = new Map<string, boolean>();

export async function checkVerified(username: string): Promise<boolean> {
  if (!username) return false;
  const lower = username.toLowerCase();
  if (verifiedCache.has(lower)) return verifiedCache.get(lower)!;

  const { data } = await (supabase as any)
    .from("profiles")
    .select("is_verified")
    .eq("username", lower)
    .maybeSingle();

  const result = data?.is_verified === true;
  verifiedCache.set(lower, result);
  return result;
}

export function setVerifiedCache(username: string, value: boolean) {
  verifiedCache.set(username.toLowerCase(), value);
}

export async function setVerified(username: string, verified: boolean) {
  const { error } = await (supabase as any)
    .from("profiles")
    .update({ is_verified: verified })
    .eq("username", username.toLowerCase());

  if (!error) {
    setVerifiedCache(username, verified);
  }
  return { error };
}

// Legacy compat — keep for static checks but prefer async
export function isVerified(_username: string): boolean {
  return verifiedCache.get(_username.toLowerCase()) ?? false;
}
