"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// 위쪽의 "꽃다발 주문하기" 버튼이 화면 밖으로 나가면, 같은 버튼을 화면 아래에 띄운다.
// 처음부터 버튼이 두 개 보이지 않게 하고, 아래까지 내려 읽은 손님도 바로 주문할 수 있게 한다.
export function FloatingOrder({ href, watchId }: { href: string; watchId: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) return;
    const io = new IntersectionObserver(([entry]) => {
      // 버튼이 위로 지나갔을 때만 (아직 도착 전이면 띄우지 않는다)
      setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(target);
    return () => io.disconnect();
  }, [watchId]);

  return (
    <div
      aria-hidden={!show}
      className={`from-ground via-ground fixed inset-x-0 bottom-0 z-20 bg-linear-to-t from-60% to-transparent pt-6 transition-all duration-200 ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div className="mx-auto w-full max-w-md px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <Link
          href={href}
          tabIndex={show ? undefined : -1}
          className="bg-rose active:bg-rose-dark flex min-h-14 items-center justify-center rounded-2xl text-[17px] font-bold text-white shadow-lg"
        >
          꽃다발 주문하기
        </Link>
      </div>
    </div>
  );
}
