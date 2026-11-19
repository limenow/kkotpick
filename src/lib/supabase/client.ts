import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

// 브라우저(클라이언트 컴포넌트)에서 쓰는 클라이언트.
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
