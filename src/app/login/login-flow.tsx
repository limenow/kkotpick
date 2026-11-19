"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { BottomCTA, ctaClass } from "@/components/ui/bottom-cta";
import { useToast } from "@/components/ui/toast";
import { sendCode, verifyCode, type LoginState } from "./actions";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 토스처럼 한 화면에 한 가지만 묻는다: 이메일 → 코드
export function LoginFlow({ mailboxUrl }: { mailboxUrl?: string }) {
  const [sent, sendAction, sending] = useActionState<LoginState, FormData>(sendCode, {
    step: "email",
  });
  const [checked, verifyAction, verifying] = useActionState<LoginState, FormData>(verifyCode, {
    step: "code",
  });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [editing, setEditing] = useState(false);
  const codeForm = useRef<HTMLFormElement>(null);
  const toast = useToast();

  const step = sent.step === "code" && !editing ? "code" : "email";

  // 코드를 새로 보냈으면 입력칸을 비우고 코드 화면으로 간다 (렌더 중에 맞춰주는 방식)
  const [seenSentAt, setSeenSentAt] = useState<number | undefined>();
  if (sent.sentAt !== seenSentAt) {
    setSeenSentAt(sent.sentAt);
    setCode("");
    setEditing(false);
  }
  useEffect(() => {
    if (sent.sentAt) toast({ message: "메일로 코드를 보냈어요" });
  }, [sent.sentAt, toast]);

  // 6자리를 다 넣으면 바로 확인한다
  useEffect(() => {
    if (code.length === 6 && !verifying) codeForm.current?.requestSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 코드가 바뀔 때만
  }, [code]);

  if (step === "email") {
    return (
      <form action={sendAction} className="flex flex-1 flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-[26px] leading-snug font-bold">
            이메일을
            <br />
            알려주세요
          </h1>
          <p className="text-muted text-[15px]">로그인 코드를 보내드릴게요. 비밀번호는 없어요.</p>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-muted text-sm">이메일</span>
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="flower@example.com"
            aria-invalid={Boolean(sent.error) || undefined}
            aria-describedby={sent.error ? "email-error" : undefined}
            className="border-line focus:border-rose border-b-2 bg-transparent py-2 text-[22px] font-semibold outline-none placeholder:font-normal placeholder:text-[#C9BDB5]"
          />
          {sent.error && (
            <span id="email-error" role="alert" className="text-rose text-sm">
              {sent.error}
            </span>
          )}
        </label>
        <BottomCTA>
          <button
            type="submit"
            disabled={!EMAIL.test(email.trim()) || sending}
            className={ctaClass}
          >
            {sending ? "보내는 중…" : "코드 받기"}
          </button>
        </BottomCTA>
      </form>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-[26px] leading-snug font-bold">
          메일로 받은
          <br />
          코드 6자리를 넣어주세요
        </h1>
        <p className="text-muted text-[15px]">
          {sent.email}
          <button
            type="button"
            onClick={() => {
              setEmail(sent.email ?? "");
              setEditing(true);
            }}
            className="text-ink ml-2 underline underline-offset-4"
          >
            바꾸기
          </button>
        </p>
      </div>

      <form ref={codeForm} action={verifyAction} className="flex flex-col gap-3">
        <input type="hidden" name="email" value={sent.email} />
        <input
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          aria-label="로그인 코드 6자리"
          aria-invalid={Boolean(checked.error) || undefined}
          className="border-line focus:border-rose border-b-2 bg-transparent py-2 text-center text-[32px] font-bold tracking-[0.5em] outline-none"
        />
        {checked.error && (
          <p role="alert" className="text-rose text-center text-sm">
            {checked.error}
          </p>
        )}
        {verifying && <p className="text-muted text-center text-sm">확인하는 중…</p>}
      </form>

      <form action={sendAction} className="flex justify-center">
        <input type="hidden" name="email" value={sent.email} />
        <button
          type="submit"
          disabled={sending}
          className="text-muted min-h-11 px-3 text-[15px] underline underline-offset-4"
        >
          {sending ? "보내는 중…" : "코드 다시 받기"}
        </button>
      </form>

      {mailboxUrl && (
        <p className="bg-soft text-muted rounded-2xl p-4 text-sm">
          로컬 개발 중이에요. 메일은{" "}
          <Link href={mailboxUrl} target="_blank" className="text-ink underline">
            {mailboxUrl}
          </Link>
          에서 볼 수 있어요.
        </p>
      )}
    </div>
  );
}
