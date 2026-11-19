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
