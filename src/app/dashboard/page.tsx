// TODO(대시보드): 사장님 로그인 + 주문 목록 (디자인: A. 주문 목록)
// RLS 덕분에 supabase.from("orders").select()만 해도 자기 가게 주문만 나온다.
export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-10">
      <h1 className="text-2xl font-bold">꽃픽 파트너</h1>
      <p className="text-muted">사장님 대시보드는 로그인 기능과 함께 만들어요.</p>
    </main>
  );
}
