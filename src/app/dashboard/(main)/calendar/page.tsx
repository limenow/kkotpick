import { Suspense } from "react";
import { requireShop } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

// TODO(예약 캘린더): 시간대별 주문 수와 마감 (디자인: C. 예약 캘린더)
export default function CalendarPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-5 pt-6 pb-24 md:px-8">
      <h1 className="text-[24px] font-bold">예약 캘린더</h1>
      <Suspense fallback={<Skeleton className="h-6 w-48" />}>
        <Calendar />
      </Suspense>
    </main>
  );
}

async function Calendar() {
  await requireShop();
  return (
    <p className="text-muted text-[15px]">
      날짜별 예약은 지금 주문 화면의 예약 탭에서 볼 수 있어요. 시간대별로 마감하는 화면은 만들고
      있어요.
    </p>
  );
}
