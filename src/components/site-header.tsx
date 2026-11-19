"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

const ANCHORS = [
  { href: "#problem", label: "이런 점이 불편했다면" },
  { href: "#solution", label: "꽃픽이 하는 일" },
  { href: "#start", label: "시작하는 법" },
  { href: "#faq", label: "자주 묻는 질문" },
];

const MENU = [
  {
    title: "손님이 보는 화면",
    links: [
      { href: "/s/bomnal", label: "꽃집 페이지", desc: "링크나 QR로 들어오는 첫 화면" },
      { href: "/s/bomnal/order", label: "주문서", desc: "색감, 크기, 예산, 받을 시간" },
    ],
  },
  {
    title: "사장님이 쓰는 도구",
    links: [
      { href: "#solution", label: "주문 한 화면에 모으기", desc: "링크, 전화, 카톡 주문을 같이" },
      { href: "#solution", label: "시간대별 마감", desc: "몰리는 시간은 자동으로 닫기" },
      { href: "/dashboard", label: "사장님 화면", desc: "주문 목록, 캘린더, 영업 설정" },
    ],
  },
  {
    title: "시작하기",
    links: [
      { href: "#start", label: "시작하는 법", desc: "링크 하나 걸면 끝" },
      { href: "#faq", label: "자주 묻는 질문", desc: "수수료, 결제, 네이버 예약" },
      { href: "#apply", label: "무료로 써보기", desc: "2월 졸업 시즌 파일럿" },
    ],
  },
];

// 스티키 헤더 + 메가메뉴 + 앵커 링크. 넓은 화면에선 앵커가 헤더에 펼쳐지고, 좁은 화면에선 메뉴 안으로 들어간다.
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="sticky top-0 z-30">
      <header className="border-line bg-surface/95 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
          <Link href="/" className="text-rose text-xl font-bold">
            꽃픽 <span className="text-muted text-sm font-medium">파트너</span>
          </Link>

          <nav
            aria-label="이 페이지 안 바로가기"
            className="ml-4 hidden items-center gap-1 lg:flex"
          >
            {ANCHORS.map((a) => (
              <a
                key={a.href}
                href={a.href}
                className="text-muted hover:text-ink rounded-lg px-3 py-2 text-sm"
              >
                {a.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen(!open)}
              className="border-line flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm"
            >
              둘러보기
              <svg
                aria-hidden
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <a
              href="#apply"
              className="bg-rose hidden min-h-11 items-center rounded-full px-5 text-sm font-bold text-white sm:flex"
            >
              무료로 써보기
            </a>
          </div>
        </div>
      </header>

      {/* 메가메뉴 패널 */}
      <div
        id={panelId}
        hidden={!open}
        className="border-line bg-surface absolute inset-x-0 border-b shadow-lg"
      >
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 md:grid-cols-3">
          {MENU.map((group) => (
            <div key={group.title} className="flex flex-col gap-3">
              <h2 className="text-muted text-xs font-bold tracking-wide">{group.title}</h2>
              <ul className="flex flex-col gap-1">
                {group.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="hover:bg-ground flex flex-col rounded-xl px-3 py-2.5"
                    >
                      <span className="font-medium">{l.label}</span>
                      <span className="text-muted text-sm">{l.desc}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
