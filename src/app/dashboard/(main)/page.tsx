import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { requireShop } from "@/lib/auth";
import { addDays, dateLabel, seoulToday } from "@/lib/dates";
import type { OwnerOrder } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertSetup } from "./alert-setup";
import { AutoRefresh } from "./auto-refresh";
import { NewOrderAlert } from "./new-order-alert";
import { OrderCard } from "./order-card";

export const metadata: Metadata = { title: "주문 · 꽃픽 파트너" };

const VIEWS = [
  { key: "new", label: "새 주문" },
  { key: "today", label: "오늘" },
  { key: "upcoming", label: "예약" },
  { key: "done", label: "지난 주문" },
] as const;
type View = (typeof VIEWS)[number]["key"];

const EMPTY: Record<View, string> = {
  new: "새로 들어온 주문이 없어요",
  today: "오늘 픽업할 주문이 없어요",
  upcoming: "잡혀 있는 예약이 없어요",
  done: "최근 30일 동안 끝난 주문이 없어요",
};

const OPEN = new Set(["accepted", "making", "ready"]);
const CLOSED = new Set(["picked_up", "rejected", "canceled"]);

export default function OrdersPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-6 pb-24 md:px-8">
      <Suspense fallback={<OrdersSkeleton />}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Orders({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const sp = await searchParams;
  const view: View = VIEWS.some((v) => v.key === sp.view) ? (sp.view as View) : "new";
  const { supabase, shop } = await requireShop();

  const today = seoulToday();
  const from = `${addDays(today, -30)}T00:00:00+09:00`;
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, public_token, order_no, source, type, status, pickup_at, color_key, size, budget, purpose, recipient, mood, request_note, customer_name, customer_phone, payment_method, payment_status, reject_reason, created_at, photos:order_photos(image_path)",
    )
    .eq("shop_id", shop.id)
    .gte("pickup_at", from)
    .order("pickup_at")
    .limit(500)
    .returns<OwnerOrder[]>();
  if (error) throw error;

  const day = (o: OwnerOrder) => seoulToday(new Date(o.pickup_at));
  const all = data ?? [];
  const lists: Record<View, OwnerOrder[]> = {
    new: all.filter((o) => o.status === "pending" && day(o) >= today),
    today: all.filter((o) => day(o) === today && (OPEN.has(o.status) || o.status === "picked_up")),
    upcoming: all.filter((o) => day(o) > today && OPEN.has(o.status)),
    done: all
      .filter((o) => CLOSED.has(o.status) || (day(o) < today && o.status !== "pending"))
      .reverse(),
  };
  const list = lists[view];
  const todayLeft = lists.today.filter((o) => o.status !== "picked_up").length;

  const headline =
    lists.new.length > 0
      ? `새 주문 ${lists.new.length}건이 기다리고 있어요`
      : todayLeft > 0
        ? `오늘 픽업 ${todayLeft}건이 남았어요`
        : "들어온 주문을 모두 확인했어요";

  // 날짜별로 묶는다 (새 주문, 예약, 지난 주문)
  const groups = new Map<string, OwnerOrder[]>();
  for (const o of list) {
    const k = view === "today" ? today : day(o);
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }

  return (
    <>
      <AutoRefresh seconds={20} />
      <NewOrderAlert pendingIds={lists.new.map((o) => o.id)} />
      <AlertSetup compact />
      <h1 className="text-[24px] leading-snug font-bold">{headline}</h1>

      <nav aria-label="주문 보기" className="bg-soft grid grid-cols-4 gap-1 rounded-2xl p-1">
        {VIEWS.map((v) => {
          const on = v.key === view;
          const n = v.key === "done" ? 0 : lists[v.key].length;
          return (
            <Link
              key={v.key}
              href={v.key === "new" ? "/dashboard" : `/dashboard?view=${v.key}`}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center gap-1 rounded-xl text-[15px] ${
                on ? "bg-surface font-bold shadow-sm" : "text-muted"
              }`}
            >
              {v.label}
              {n > 0 && (
                <span
                  className={`min-w-5 rounded-full px-1.5 text-xs leading-5 font-bold ${
                    v.key === "new" ? "bg-rose text-white" : "bg-line text-ink"
                  }`}
                >
                  {n}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {list.length === 0 ? (
        <p className="text-muted py-16 text-center text-[15px]">{EMPTY[view]}</p>
      ) : (
        [...groups.entries()].map(([ymd, orders]) => (
          <section
            key={ymd}
            aria-label={ymd === today ? "오늘" : dateLabel(ymd)}
            className="flex flex-col gap-3"
          >
            {view !== "today" && (
              <h2 className="text-muted pt-2 text-sm font-semibold">
                {ymd === today
                  ? "오늘"
                  : ymd === addDays(today, 1)
                    ? `내일 · ${dateLabel(ymd)}`
                    : dateLabel(ymd)}
              </h2>
            )}
            {orders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                shop={{ id: shop.id, name: shop.name, readyMessage: shop.ready_message }}
              />
            ))}
          </section>
        ))
      )}
    </>
  );
}

function OrdersSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">주문을 불러오고 있어요</span>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-13 w-full rounded-2xl" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-44 w-full rounded-3xl" />
      ))}
    </div>
  );
}
