"use client";

import { useRef, useState, useTransition } from "react";
import { ctaClass } from "@/components/ui/bottom-cta";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_READY_MESSAGE, READY_MESSAGE_FIELDS, fillReadyMessage } from "@/lib/ready-message";
import { saveReadyMessage } from "../../actions";

// 완성 사진과 함께 보내는 멘트를 꽃집 말투로 바꾸는 곳
export function ReadyMessageForm({
  initial,
  shopName,
}: {
  initial: string | null;
  shopName: string;
}) {
  const [text, setText] = useState(initial ?? DEFAULT_READY_MESSAGE);
  const [saving, start] = useTransition();
  const toast = useToast();
  const box = useRef<HTMLTextAreaElement>(null);

  const preview = fillReadyMessage(text, {
    name: "김민수",
    time: "오늘 17:00",
    shop: shopName,
    link: "kkotpick.kr/o/…",
  });

  // 커서 자리에 {이름} 같은 칸을 넣는다
  function insert(field: string) {
    const el = box.current;
    if (!el) return setText((t) => t + field);
    const { selectionStart: s, selectionEnd: e } = el;
    const nextText = text.slice(0, s) + field + text.slice(e);
    setText(nextText);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + field.length, s + field.length);
    });
  }

  return (
    <section className="bg-surface border-line flex flex-col gap-4 rounded-3xl border p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">완성 사진 멘트</h2>
        <p className="text-muted text-sm leading-relaxed">
          꽃다발을 다 만들고 사진을 보낼 때 같이 가는 글이에요. 사장님 말투로 바꿔보세요.
        </p>
      </div>

      <textarea
        ref={box}
        rows={5}
        maxLength={300}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="완성 사진 멘트"
        className="border-line bg-ground rounded-2xl border px-4 py-3 text-[15px] leading-relaxed"
      />

      <div className="flex flex-col gap-2">
        <span className="text-muted text-sm">누르면 그 자리에 들어가요</span>
        <div className="flex flex-wrap gap-2">
          {READY_MESSAGE_FIELDS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => insert(f)}
              className="bg-soft active:bg-line min-h-10 rounded-full px-4 text-sm"
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-muted text-sm">손님에게는 이렇게 보여요</span>
        <p className="rounded-2xl rounded-tl-sm bg-[#FEE500]/25 px-4 py-3 text-[15px] leading-relaxed whitespace-pre-line">
          {preview}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setText(DEFAULT_READY_MESSAGE)}
          className="text-muted min-h-11 px-2 text-sm underline underline-offset-4"
        >
          기본 멘트로
        </button>
        <button
          type="button"
          disabled={saving || text === (initial ?? DEFAULT_READY_MESSAGE)}
          onClick={() =>
            start(async () => {
              const res = await saveReadyMessage(text === DEFAULT_READY_MESSAGE ? "" : text);
              toast({ message: res.ok ? "멘트를 저장했어요" : res.error });
            })
          }
          className={`${ctaClass} min-h-12 flex-1 text-[16px]`}
        >
          {saving ? "저장하는 중…" : "저장하기"}
        </button>
      </div>
    </section>
  );
}
