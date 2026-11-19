"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// 새 주문이 들어오면 보이도록 화면이 열려 있는 동안 주기적으로 다시 불러온다.
// 다른 탭에 가 있으면 멈추고, 돌아오면 바로 한 번 불러온다.
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);
  return null;
}
