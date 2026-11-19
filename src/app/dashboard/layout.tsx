import { SidebarNav } from "./sidebar-nav";

// 사장님 화면 틀. 넓은 화면(태블릿 가로, PC)에선 왼쪽 사이드바, 폰에선 위쪽에 붙는 가로 메뉴.
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside
        aria-label="사장님 메뉴"
        className="border-line bg-surface sticky top-0 z-10 flex shrink-0 flex-col gap-3 border-b p-3 md:h-dvh md:w-56 md:gap-6 md:border-r md:border-b-0 md:p-4"
      >
        <div className="hidden flex-col px-3 pt-2 md:flex">
          <span className="text-rose text-lg font-bold">꽃픽 파트너</span>
        </div>
        <nav aria-label="사장님 메뉴">
          <SidebarNav />
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
