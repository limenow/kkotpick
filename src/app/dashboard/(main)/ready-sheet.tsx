"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { ctaClass, ctaSecondaryClass } from "@/components/ui/bottom-cta";
import { useToast } from "@/components/ui/toast";
import { dateLabel, seoulToday, timeLabel } from "@/lib/dates";
import { fillReadyMessage } from "@/lib/ready-message";
import { createClient } from "@/lib/supabase/client";
import { publicImageUrl } from "@/lib/supabase/storage";
import type { OwnerOrder } from "@/lib/types";
import { changeStatus, undoStatus } from "../actions";

export interface ShopInfo {
  id: string;
  name: string;
  readyMessage: string | null;
}

// 폰 카메라 사진은 크니까 긴 변 1600px JPEG로 줄여서 올린다 (보통 300~600KB)
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("사진을 줄이지 못했어요"))),
      "image/jpeg",
      0.85,
    ),
  );
}

/**
 * "다 만들었어요" 다음에 뜨는 시트.
 * 1) 사진 찍기 → 주문에 저장하고 완성으로 바꾼다
 * 2) 손님에게 보내기: 공유 창(카톡·문자), 사진 저장, 멘트 복사
 * 꽃집마다 개인 카톡, 카카오톡 채널, 문자를 쓰는 방식이 달라서 세 가지를 다 둔다.
 */
export function ReadySheet({
  order,
  shop,
  startAt,
  onClose,
}: {
  order: OwnerOrder;
  shop: ShopInfo;
  /** "photo": 사진부터, "send": 이미 완성된 주문을 다시 보낼 때 */
  startAt: "photo" | "send";
  onClose: () => void;
}) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"photo" | "send">(startAt);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existing = order.photos.at(-1)?.image_path;
  const photoUrl = preview ?? (existing ? publicImageUrl("order-photos", existing) : null);

  const day = seoulToday(new Date(order.pickup_at));
  const time = `${day === seoulToday() ? "오늘" : dateLabel(day)} ${timeLabel(order.pickup_at)}`;
  // 열 때마다 새로 그린다(카드에서 열 때만 화면에 붙인다). 주문 링크 주소는 브라우저에서 만든다.
  const [message, setMessage] = useState(() =>
    fillReadyMessage(shop.readyMessage, {
      name: order.customer_name,
      time,
      shop: shop.name,
      link: `${location.origin}/o/${order.public_token}`,
    }),
  );

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const small = await shrink(file);
      setBlob(small);
      setPreview(URL.createObjectURL(small));
    } catch {
      setError("사진을 열지 못했어요. 다른 사진으로 해주세요.");
    }
  }

  async function finish(withPhoto: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (withPhoto && blob) {
        const supabase = createClient();
        const path = `${shop.id}/${order.id}/${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage
          .from("order-photos")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (up.error) throw new Error("사진을 올리지 못했어요. 잠시 뒤에 다시 해주세요.");
        const row = await supabase
          .from("order_photos")
          .insert({ order_id: order.id, image_path: path });
        if (row.error) throw new Error("사진을 저장하지 못했어요. 잠시 뒤에 다시 해주세요.");
      }
      if (order.status !== "ready") {
        const res = await changeStatus(order.id, "ready");
        if (!res.ok) throw new Error(res.error);
        toast({
          message: `#${order.order_no} 완성으로 바꿨어요`,
          action: {
            label: "되돌리기",
            onClick: async () => {
              const r = await undoStatus(order.id);
              toast({ message: r.ok ? "되돌렸어요" : r.error });
            },
          },
        });
      }
      if (withPhoto) setStep("send");
      else onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function photoFile(): Promise<File | null> {
    const b = blob ?? (photoUrl ? await (await fetch(photoUrl)).blob() : null);
    return b ? new File([b], `kkotpick-${order.order_no}.jpg`, { type: "image/jpeg" }) : null;
  }

  async function copyMessage(silent = false) {
    try {
      await navigator.clipboard.writeText(message);
      if (!silent) toast({ message: "멘트를 복사했어요" });
      return true;
    } catch {
      if (!silent) toast({ message: "복사하지 못했어요. 멘트를 길게 눌러 복사해주세요." });
      return false;
    }
  }

  async function share() {
    const file = await photoFile();
    // 카톡은 사진과 글을 같이 받으면 글을 빼먹는 경우가 있어서, 멘트를 먼저 복사해 둔다
    const copied = await copyMessage(true);
    const data: ShareData = file ? { files: [file], text: message } : { text: message };
    if (navigator.canShare?.(data)) {
      try {
        await navigator.share(data);
        if (copied) toast({ message: "멘트도 복사해 뒀어요. 글이 안 갔으면 붙여넣어 주세요." });
      } catch {
        // 공유 창을 그냥 닫은 경우
      }
    } else {
      toast({ message: "이 기기에선 공유 창을 열 수 없어요. 사진 저장과 멘트 복사를 써주세요." });
    }
  }

  async function save() {
    const file = await photoFile();
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={
        step === "photo" ? "완성 사진을 찍어주세요" : `${order.customer_name} 님에게 보내주세요`
      }
      description={
        step === "photo"
          ? "손님 주문 화면에도 이 사진이 보여요."
          : "카톡이나 문자를 고르면 사진과 멘트가 같이 가요."
      }
    >
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- 방금 찍은 사진 미리보기
        <img
          src={photoUrl}
          alt="완성 사진"
          className="bg-soft mx-auto max-h-[38dvh] w-auto rounded-2xl object-contain"
        />
      )}

      {error && (
        <p role="alert" className="text-rose text-sm">
          {error}
        </p>
      )}

      {step === "photo" ? (
        <div className="flex flex-col gap-2">
          {preview ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => finish(true)}
                className={ctaClass}
              >
                {busy ? "올리는 중…" : "이 사진으로 완성하기"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
                className={ctaSecondaryClass}
              >
                다시 찍기
              </button>
            </>
          ) : (
            <button type="button" onClick={() => fileInput.current?.click()} className={ctaClass}>
              사진 찍기
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => finish(false)}
            className="text-muted min-h-11 self-center px-3 text-sm underline underline-offset-4"
          >
            사진 없이 완성하기
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2">
            <span className="text-muted text-sm">보낼 멘트 (이번에만 바꿀 수 있어요)</span>
            <textarea
              rows={4}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="border-line bg-ground rounded-2xl border px-4 py-3 text-[15px] leading-relaxed"
            />
          </label>
          <button type="button" onClick={share} className={ctaClass}>
            카톡·문자로 보내기
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className={`${ctaSecondaryClass} min-h-12 flex-1 text-[15px]`}
            >
              사진 저장
            </button>
            <button
              type="button"
              onClick={() => copyMessage()}
              className={`${ctaSecondaryClass} min-h-12 flex-1 text-[15px]`}
            >
              멘트 복사
            </button>
          </div>
          <p className="text-muted text-center text-xs leading-relaxed">
            카카오톡 채널로 대화하는 손님이면 사진 저장, 멘트 복사 후 채널 앱에 붙여넣어 주세요.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-muted min-h-11 self-center px-3 text-sm underline underline-offset-4"
          >
            다 보냈어요
          </button>
        </div>
      )}
    </Sheet>
  );
}
