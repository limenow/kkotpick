"use server";

import { redirect } from "next/navigation";
import { clientHash } from "@/lib/client-hash";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { nameProblem, normalizeName } from "@/lib/customer-name";
import { orderErrorMessage } from "@/lib/order-errors";
import type { Slot } from "@/lib/types";

export async function fetchSlots(slug: string, date: string): Promise<Slot[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_slug: slug,
    p_date: date,
  });
  if (error) throw error;
  return (data ?? []) as Slot[];
}

export interface OrderFormState {
  error?: string;
}

export async function submitOrder(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  if (formData.get("consent") !== "on") {
    return { error: "주문 안내 문자를 받으려면 연락처 이용에 동의해주세요." };
  }
  const pickupAt = get("pickup_at");
  if (!pickupAt) return { error: "픽업 시간을 골라주세요." };
  const nameError = nameProblem(get("customer_name"));
  if (nameError) return { error: nameError };
  const budget = Number(get("budget"));
  if (!Number.isInteger(budget) || budget <= 0) return { error: "예산을 골라주세요." };

  // create_order는 브라우저에서 바로 부를 수 없게 막아뒀다. 동의와 기기 해시를 실어 서버에서만 부른다.
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_order", {
    p_slug: get("slug"),
    p_pickup_at: pickupAt,
    p_color_key: get("color_key"),
    p_size: get("size"),
    p_budget: budget,
    p_customer_name: normalizeName(get("customer_name")),
    p_customer_phone: get("customer_phone"),
    p_consent: true,
    p_client_hash: await clientHash(),
    p_payment_method: get("payment_method") || "onsite",
    p_purpose: get("purpose") || null,
    p_request_note: get("request_note") || null,
  });

  if (error) return { error: orderErrorMessage(error.message) };

  const { public_token } = data as { public_token: string };
  redirect(`/o/${public_token}`);
}
