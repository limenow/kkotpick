import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

// 서비스 키 클라이언트. RLS를 건너뛰므로 서버 액션 안에서, 검사를 마친 뒤에만 쓴다.
// 지금은 손님 주문 넣기(create_order)에만 쓴다.
export function createAdminClient() {
  const { url } = supabaseEnv();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "SUPABASE_SECRET_KEY가 없어요. 로컬이면 npm run setup을 다시 실행하고, 배포 환경이면 환경변수에 넣어주세요.",
    );
  }
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
