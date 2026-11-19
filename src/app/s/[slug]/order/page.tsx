import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { reservationDates, seoulToday } from "@/lib/dates";
import type { PublicShop } from "@/lib/types";
import { fetchSlots } from "./actions";
import { OrderForm } from "./order-form";

// 손님 주문서 (디자인: 2. 주문하기)
export default function OrderPage(props: PageProps<"/s/[slug]/order">) {
  return (
    <Suspense fallback={<OrderFormSkeleton />}>
      <OrderFormContent params={props.params} />
    </Suspense>
  );
}

function OrderFormSkeleton() {
  return (
    <PageSkeleton>
      <div className="flex flex-col gap-4 px-5 pt-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-1.5" />
        <Skeleton className="mt-4 h-5 w-28" />
        <Skeleton className="h-12 rounded-2xl" />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 w-18 rounded-full" />
          ))}
        </div>
        <Skeleton className="mt-4 h-5 w-36" />
        <div className="grid grid-cols-3 gap-2.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-22 rounded-2xl" />
          ))}
        </div>
      </div>
    </PageSkeleton>
  );
}

async function OrderFormContent({ params }: { params: PageProps<"/s/[slug]/order">["params"] }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shop_public", { p_slug: slug });
  if (error) throw error;
  const shop = data as PublicShop | null;
  if (!shop) notFound();

  const today = seoulToday();
  const dates = reservationDates(today, shop.reservation_max_days, shop.closed_weekdays);
  const todaySlots = shop.same_day_enabled ? await fetchSlots(slug, today) : [];

  // 오늘 남은 시간이 있으면 당일 주문을, 없으면 가장 가까운 예약 날짜를 먼저 보여준다.
  const startWithToday = todaySlots.length > 0;
  const initialDate = startWithToday ? today : (dates[0] ?? today);
  const initialSlots = startWithToday
    ? todaySlots
    : dates[0]
      ? await fetchSlots(slug, dates[0])
      : [];

  return (
    <OrderForm
      shop={shop}
      today={today}
      reservationDates={dates}
      todayOpen={startWithToday}
      initialDate={initialDate}
      initialSlots={initialSlots}
    />
  );
}
