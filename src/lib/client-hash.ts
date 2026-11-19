import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

// 주문 횟수 제한에 쓰는 요청 기기 표시. IP를 그대로 저장하지 않고 소금 친 해시만 남긴다.
// x-real-ip, x-forwarded-for는 배포 플랫폼(Vercel 등)이 덮어써 주는 값을 믿는다.
export async function clientHash() {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const salt = process.env.ORDER_HASH_SALT || process.env.SUPABASE_SECRET_KEY || "kkotpick";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
