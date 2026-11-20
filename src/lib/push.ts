import "server-only";
import { sendNotification, setVapidDetails, type WebPushError } from "web-push";
import { createAdminClient } from "./supabase/admin";

// 새 주문 웹 푸시. VAPID 키가 없으면(아직 설정 전) 조용히 건너뛴다.
// 푸시가 실패해도 주문은 이미 들어갔으므로 손님 화면에는 영향을 주지 않는다.
function ready() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:kkotpick@users.noreply.github.com",
    pub,
    priv,
  );
  return true;
}

export interface PushMessage {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export async function pushToShop(slug: string, message: PushMessage) {
  if (!ready()) return;
  const admin = createAdminClient();
  const { data: shop } = await admin.from("shops").select("id").eq("slug", slug).maybeSingle();
  if (!shop) return;
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("shop_id", shop.id);

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(message),
          { TTL: 60 * 60, urgency: "high", timeout: 5000 },
        );
      } catch (e) {
        // 기기에서 알림을 끄거나 앱을 지운 경우: 구독을 지운다
        const status = (e as WebPushError).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    }),
  );
}
