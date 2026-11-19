import { Suspense } from "react";
import { PageLoading } from "@/components/page-loading";
import Link from "next/link";

// TODO(주문서): 디자인 "2. 주문하기"를 구현한다.
// - get_available_slots(p_slug, p_date)로 시간 버튼 그리기
// - create_order(...) 호출 → 받은 public_token으로 /o/[token] 이동
// - 에러 코드(slot_full, too_soon, budget_below_minimum …)를 손님 말로 바꿔 보여주기
export default function OrderPage(props: PageProps<"/s/[slug]/order">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <OrderFormContent params={props.params} />
    </Suspense>
  );
}

async function OrderFormContent({ params }: { params: PageProps<"/s/[slug]/order">["params"] }) {
  const { slug } = await params;
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 py-10">
      <h1 className="text-xl font-bold">주문하기</h1>
      <p className="text-muted">주문서 화면은 다음 PR에서 만들어요.</p>
      <Link href={`/s/${slug}`} className="text-rose">
        꽃집으로 돌아가기
      </Link>
    </main>
  );
}
