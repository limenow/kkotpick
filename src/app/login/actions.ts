"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  step: "email" | "code";
  email?: string;
  error?: string;
  /** 코드를 다시 보냈을 때 화면에 알려주기 위한 값 */
  sentAt?: number;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) {
    return { step: "email", email, error: "이메일 주소를 다시 확인해주세요." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    const msg = /rate|security purposes/i.test(error.message)
      ? "코드를 방금 보냈어요. 1분쯤 뒤에 다시 받아주세요."
      : "코드를 보내지 못했어요. 잠시 뒤에 다시 해주세요.";
    return { step: "email", email, error: msg };
  }
  return { step: "code", email, sentAt: Date.now() };
}

export async function verifyCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const token = String(formData.get("token") ?? "").replace(/\D/g, "");
  if (token.length !== 6) return { step: "code", email, error: "코드 6자리를 모두 넣어주세요." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return { step: "code", email, error: "코드가 맞지 않거나 시간이 지났어요. 다시 받아주세요." };
  }
  redirect("/dashboard");
}
