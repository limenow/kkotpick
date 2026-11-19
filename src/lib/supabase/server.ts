import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabaseEnv } from "./env";

// 서버 컴포넌트, 서버 액션, 라우트 핸들러에서 쓰는 클라이언트.
// 로그인한 사장님의 세션 쿠키를 그대로 실어서 RLS가 적용된다.
export async function createClient() {
  // 요청마다 새로 만든다. Supabase 클라이언트는 만들 때 Date.now()로 세션 만료를 확인하는데,
  // 미리 그려두는 단계(prerender)에서 이게 불리면 Next가 "unstable value Date.now()" 에러를 낸다.
  await connection();
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 세션 갱신은 나중에 proxy에서 처리.
        }
      },
    },
  });
}
