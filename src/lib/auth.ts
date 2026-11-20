import "server-only";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export interface OwnerShop {
  id: string;
  slug: string;
  name: string;
  is_published: boolean;
  ready_message: string | null;
}

// 사장님 화면에서 쓰는 로그인 확인. 화면마다 이것만 부른다.
// getUser()는 Auth 서버에 토큰을 확인하므로 쿠키를 조작해도 통과하지 못한다.
export async function getOwner() {
  // 로그인은 요청마다 확인한다. 미리 그려두는 단계(prerender)에서 세션을 만들지 않게 막는다.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: shop } = await supabase
    .from("shops")
    .select("id, slug, name, is_published, ready_message")
    .maybeSingle<OwnerShop>();

  return { supabase, user: data.user, shop };
}

// 꽃집이 연결된 사장님만. 아직이면 연결 화면으로 보낸다.
export async function requireShop() {
  const owner = await getOwner();
  if (!owner.shop) redirect("/dashboard/connect");
  return { ...owner, shop: owner.shop };
}
