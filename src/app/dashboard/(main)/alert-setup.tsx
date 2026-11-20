"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { playChime, setSoundEnabled, soundEnabled, subscribeSound, unlockChime } from "@/lib/chime";
import { removePushSubscription, savePushSubscription, sendTestPush } from "../actions";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type PushState =
  | "checking"
  | "unsupported" // 이 브라우저는 안 됨
  | "ios-install" // 아이폰: 홈 화면에 추가해야 됨
  | "not-configured" // 서버에 VAPID 키가 아직 없음
  | "denied" // 사용자가 알림을 막음
  | "off"
  | "on";

function detectBase(): PushState {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone =
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (!VAPID) return "not-configured";
  if (Notification.permission === "denied") return "denied";
  return "checking";
}

function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return "아이패드";
  if (/iPhone/.test(ua)) return "아이폰";
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? "안드로이드 폰" : "안드로이드 태블릿";
  if (/Mac/.test(ua)) return "맥";
  if (/Windows/.test(ua)) return "윈도우 PC";
  return "기기";
}

/** 새 주문 알림 설정. compact면 주문 화면 위에 띄우는 짧은 안내만 보여준다. */
export function AlertSetup({ compact = false }: { compact?: boolean }) {
  const toast = useToast();
  const [busy, start] = useTransition();
  const sound = useSyncExternalStore(subscribeSound, soundEnabled, () => true);
  const [push, setPush] = useState<PushState>("checking");

  useEffect(() => {
    const base = detectBase();
    if (base !== "checking") {
      queueMicrotask(() => setPush(base));
      return;
    }
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPush(sub ? "on" : "off"))
      .catch(() => setPush("unsupported"));
  }, []);

  function toggleSound() {
    const next = !sound;
    if (next) {
      unlockChime();
      playChime();
    }
    setSoundEnabled(next);
    toast({ message: next ? "이 기기에서 새 주문 소리가 나요" : "소리를 껐어요" });
  }

  function turnOnPush() {
    start(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPush(permission === "denied" ? "denied" : "off");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID!),
        });
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const res = await savePushSubscription(json, deviceLabel());
        if (!res.ok) throw new Error(res.error);
        setPush("on");
        toast({ message: "이 기기로 새 주문 알림이 와요" });
      } catch (e) {
        toast({ message: e instanceof Error ? e.message : "알림을 켜지 못했어요" });
      }
    });
  }

  function turnOffPush() {
    start(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setPush("off");
      toast({ message: "이 기기의 알림을 껐어요" });
    });
  }

  if (compact) {
    // 소리나 알림 중 하나라도 켜져 있으면 안내하지 않는다
    if (sound || push === "on" || push === "checking") return null;
    return (
      <Link
        href="/dashboard/settings#alerts"
        className="bg-rose-soft text-rose-dark flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-[15px]"
      >
        <span>
          <b className="font-bold">새 주문 알림이 꺼져 있어요.</b> 주문을 놓치지 않게 켜주세요.
        </span>
        <span aria-hidden>›</span>
      </Link>
    );
  }

  return (
    <section
      id="alerts"
      className="bg-surface border-line flex scroll-mt-20 flex-col gap-4 rounded-3xl border p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">새 주문 알림</h2>
        <p className="text-muted text-sm leading-relaxed">
          기기마다 따로 켜요. 계산대 태블릿은 소리, 주머니 속 폰은 알림을 켜두면 좋아요.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-semibold">소리로 알려주기</span>
          <span className="text-muted text-sm">이 화면을 열어둔 동안 띵동 소리가 나요</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={sound}
          onClick={toggleSound}
          className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ${
            sound ? "bg-rose text-white" : "bg-soft text-ink"
          }`}
        >
          {sound ? "켜짐" : "켜기"}
        </button>
      </div>

      <div className="border-line flex flex-col gap-3 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-semibold">폰 알림 받기</span>
            <span className="text-muted text-sm">화면을 닫아도 새 주문이 오면 알림이 떠요</span>
          </div>
          {push === "on" ? (
            <button
              type="button"
              role="switch"
              aria-checked
              disabled={busy}
              onClick={turnOffPush}
              className="bg-rose min-h-11 shrink-0 rounded-full px-4 text-sm font-bold text-white"
            >
              켜짐
            </button>
          ) : push === "off" ? (
            <button
              type="button"
              role="switch"
              aria-checked={false}
              disabled={busy}
              onClick={turnOnPush}
              className="bg-soft text-ink min-h-11 shrink-0 rounded-full px-4 text-sm font-bold"
            >
              {busy ? "켜는 중…" : "켜기"}
            </button>
          ) : null}
        </div>

        {push === "on" && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              start(async () => {
                await sendTestPush();
                toast({ message: "테스트 알림을 보냈어요" });
              })
            }
            className="text-muted min-h-11 self-start text-sm underline underline-offset-4"
          >
            테스트 알림 보내기
          </button>
        )}

        {push === "ios-install" && (
          <ol className="bg-ground flex list-decimal flex-col gap-1 rounded-2xl py-3 pr-4 pl-9 text-[15px] leading-relaxed">
            <li>Safari 아래쪽 공유 버튼(□↑)을 눌러요</li>
            <li>&quot;홈 화면에 추가&quot;를 눌러요</li>
            <li>홈 화면의 꽃픽 아이콘으로 열고, 여기서 알림을 켜요</li>
          </ol>
        )}
        {push === "denied" && (
          <p className="bg-ground rounded-2xl p-4 text-[15px] leading-relaxed">
            이 기기에서 꽃픽 알림이 막혀 있어요. 폰 설정 → 알림에서 꽃픽(또는 브라우저)을 허용한 뒤
            다시 열어주세요.
          </p>
        )}
        {push === "unsupported" && (
          <p className="text-muted text-sm">이 브라우저에서는 알림을 받을 수 없어요.</p>
        )}
        {push === "not-configured" && (
          <p className="text-muted text-sm">알림 서버 설정이 아직 안 됐어요. 꽃픽에 알려주세요.</p>
        )}
      </div>
    </section>
  );
}
