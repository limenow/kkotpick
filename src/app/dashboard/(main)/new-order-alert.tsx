"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import { playChime, soundEnabled } from "@/lib/chime";

// 화면을 열어둔 동안 새 주문이 들어오면 소리, 진동, 토스트, 탭 제목으로 알린다.
// 목록은 30초마다 새로 불러오므로(AutoRefresh), 그때 처음 보는 새 주문이 있으면 울린다.
export function NewOrderAlert({ pendingIds }: { pendingIds: string[] }) {
  const seen = useRef<Set<string> | null>(null);
  const toast = useToast();
  const key = pendingIds.join(",");

  useEffect(() => {
    // 알림을 받으려면 서비스 워커가 등록돼 있어야 한다 (푸시 알림을 켠 기기)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (seen.current === null) {
      seen.current = new Set(ids); // 처음 열었을 때 이미 있던 주문은 울리지 않는다
    } else {
      const fresh = ids.filter((id) => !seen.current!.has(id));
      ids.forEach((id) => seen.current!.add(id));
      if (fresh.length > 0) {
        if (soundEnabled()) playChime();
        navigator.vibrate?.([200, 100, 200]);
        toast({ message: `새 주문 ${fresh.length}건이 들어왔어요` });
      }
    }
    const base = "주문 · 꽃픽 파트너";
    document.title = ids.length > 0 ? `(${ids.length}) 새 주문 · 꽃픽` : base;
  }, [key, toast]);

  return null;
}
