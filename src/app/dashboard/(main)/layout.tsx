import { Suspense } from "react";
import Link from "next/link";
import { requireShop } from "@/lib/auth";
import { signOut } from "../actions";
import { SidebarNav } from "./sidebar-nav";

// 사장님 화면 틀. 넓은 화면(태블릿 가로, PC)에선 왼쪽 사이드바, 폰에선 위쪽에 붙는 가로 메뉴.
// 로그인 확인은 각 화면이 Suspense 안에서 한다. 여기 맨 위에서 기다리면 화면 전체가 늦어진다.
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside
        aria-label="사장님 메뉴"
        className="border-line bg-surface sticky top-0 z-10 flex shrink-0 flex-col gap-3 border-b p-3 md:h-dvh md:w-56 md:gap-6 md:border-r md:border-b-0 md:p-4"
      >
        <div className="hidden flex-col gap-1 px-3 pt-2 md:flex">
          <span className="text-rose text-lg font-bold">꽃픽 파트너</span>
          <Suspense fallback={<span className="bg-soft h-5 w-24 animate-pulse rounded" />}>
            <ShopName />
          </Suspense>
        </div>
        <nav aria-label="사장님 메뉴">
          <SidebarNav />
        </nav>
        <form action={signOut} className="mt-auto hidden md:block">
          <button
            type="submit"
            className="text-muted hover:bg-ground flex min-h-11 w-full items-center rounded-xl px-3 text-[15px]"
          >
            로그아웃
          </button>
        </form>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

async function ShopName() {
  const { shop } = await requireShop();
  return (
    <Link
      href={`/s/${shop.slug}`}
      target="_blank"
      className="text-muted hover:text-ink text-sm underline-offset-4 hover:underline"
    >
      {shop.name} 손님 화면 ↗
    </Link>
  );
}
