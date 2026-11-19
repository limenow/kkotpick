// TODO(대시보드): 사장님 로그인 + 주문 목록 (디자인: A. 주문 목록)
// RLS 덕분에 supabase.from("orders").select()만 해도 자기 가게 주문만 나온다.
export default function DashboardPage() {
  return (
    <main className="flex flex-col gap-3 p-6">
      <h1 className="text-2xl font-bold">주문</h1>
      <p className="text-muted">로그인 기능과 함께 만들고 있어요.</p>
    </main>
  );
}
