import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 사장님 화면과 로그인 화면에서만 돈다.
// 1) 로그인 세션 쿠키를 새로 고친다. 2) 로그인 여부에 따라 길을 바꿔준다.
// 실제 권한 확인은 화면(getOwner)과 DB(RLS)에서 한 번 더 한다.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;

  const go = (to: string) => {
    const res = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };
  if (!signedIn && path.startsWith("/dashboard")) return go("/login");
  if (signedIn && path === "/login") return go("/dashboard");
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
