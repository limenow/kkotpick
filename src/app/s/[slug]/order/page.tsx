import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageLoading } from "@/components/page-loading";
import { createClient } from "@/lib/supabase/server";
import { reservationDates, seoulToday } from "@/lib/dates";
import type { PublicShop } from "@/lib/types";
import { fetchSlots } from "./actions";
import { OrderForm } from "./order-form";

// 손님 주문서 (디자인: 2. 주문하기)
export default function OrderPage(props: PageProps<"/s/[slug]/order">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <OrderFormContent params={props.params} />
    </Suspense>
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
