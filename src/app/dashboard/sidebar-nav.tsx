"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "주문" },
  { href: "/dashboard/calendar", label: "예약 캘린더" },
  { href: "/dashboard/settings", label: "영업 설정" },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {ITEMS.map((item) => {
        const on = pathname === item.href;
        return (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-xl px-3 text-[15px] ${
                on ? "bg-rose-soft text-rose font-bold" : "hover:bg-ground"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
