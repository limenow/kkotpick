"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const OWNER_ERRORS: Record<string, string> = {
  invalid_transition: "이미 다른 단계로 바뀐 주문이에요. 화면을 새로 고쳤어요.",
  reason_required: "거절하는 이유를 골라주세요.",
  undo_expired: "1분이 지나서 되돌릴 수 없어요.",
  order_not_found: "주문을 찾지 못했어요.",
  input_too_long: "이유는 200자 안으로 적어주세요.",
};

function ownerError(message: string) {
  for (const [code, text] of Object.entries(OWNER_ERRORS)) {
    if (message.includes(code)) return text;
  }
  return "저장하지 못했어요. 잠시 뒤에 다시 해주세요.";
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function changeStatus(
  orderId: string,
  status: OrderStatus,
  reason?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_order_status", {
    p_order_id: orderId,
    p_status: status,
    p_reason: reason ?? null,
  });
  refresh();
  return error ? { ok: false, error: ownerError(error.message) } : { ok: true };
}

export async function undoStatus(orderId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("undo_order_status", { p_order_id: orderId });
  refresh();
  return error ? { ok: false, error: ownerError(error.message) } : { ok: true };
}

export async function changePayment(orderId: string, status: PaymentStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_payment_status", {
    p_order_id: orderId,
    p_status: status,
  });
  refresh();
  return error ? { ok: false, error: ownerError(error.message) } : { ok: true };
}

export interface ConnectState {
  error?: string;
}

export async function connectShop(_prev: ConnectState, formData: FormData): Promise<ConnectState> {
  const code = String(formData.get("code") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_shop", { p_code: code });
  if (error) {
    if (error.message.includes("too_many_attempts")) {
      return { error: "코드를 여러 번 틀렸어요. 한 시간 뒤에 다시 해주세요." };
    }
    if (error.message.includes("already_connected")) redirect("/dashboard");
    return { error: "연결하지 못했어요. 잠시 뒤에 다시 해주세요." };
  }
  if ((data as { error?: string })?.error) {
    return { error: "코드가 맞지 않아요. 꽃픽에서 받은 8자리를 다시 확인해주세요." };
  }
  redirect("/dashboard");
}

export async function saveReadyMessage(message: string): Promise<ActionResult> {
  const text = message.trim();
  if (text.length > 300) return { ok: false, error: "멘트는 300자 안으로 적어주세요." };
  const supabase = await createClient();
  // RLS가 자기 가게만 고칠 수 있게 막아준다
  const { data: shop } = await supabase.from("shops").select("id").maybeSingle<{ id: string }>();
  if (!shop) return { ok: false, error: "꽃집을 찾지 못했어요." };
  const { error } = await supabase
    .from("shops")
    .update({ ready_message: text || null })
    .eq("id", shop.id);
  refresh();
  return error ? { ok: false, error: "저장하지 못했어요. 잠시 뒤에 다시 해주세요." } : { ok: true };
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// 이 기기를 새 주문 알림 받을 곳으로 등록
export async function savePushSubscription(
  sub: PushSubscriptionInput,
  deviceLabel: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: shop } = await supabase.from("shops").select("id").maybeSingle<{ id: string }>();
  if (!auth.user || !shop) return { ok: false, error: "꽃집을 먼저 연결해주세요." };
  // 같은 기기를 다시 켜면 예전 기록을 지우고 새로 넣는다
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: auth.user.id,
    shop_id: shop.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    device_label: deviceLabel.slice(0, 60),
  });
  return error
    ? { ok: false, error: "알림을 켜지 못했어요. 잠시 뒤에 다시 해주세요." }
    : { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true };
}

// 알림이 잘 오는지 확인용
export async function sendTestPush(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("slug")
    .maybeSingle<{ slug: string }>();
  if (!shop) return { ok: false, error: "꽃집을 찾지 못했어요." };
  const { pushToShop } = await import("@/lib/push");
  await pushToShop(shop.slug, {
    title: "알림 테스트",
    body: "새 주문이 들어오면 이렇게 알려드려요",
    url: "/dashboard",
    tag: "test",
  });
  return { ok: true };
}
