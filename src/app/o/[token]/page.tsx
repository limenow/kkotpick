import { Suspense } from "react";
import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/ui/progress-bar";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/supabase/storage";
import { COLORS, SIZES, STATUS_HEADLINES, STATUS_STEPS, seoulDateTime, won } from "@/lib/labels";
import type { OrderView } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 손님 주문 상태 화면. 알림 문자 링크로 열린다. (디자인: 3. 주문 상태)
export default function OrderStatusPage(props: PageProps<"/o/[token]">) {
  return (
    <Suspense fallback={<OrderSkeleton />}>
      <OrderContent params={props.params} />
    </Suspense>
  );
}

function OrderSkeleton() {
  return (
    <PageSkeleton>
      <div className="flex flex-col gap-6 px-5 py-6">
        <Skeleton className="h-36 rounded-3xl" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </PageSkeleton>
  );
}

async function OrderContent({ params }: { params: PageProps<"/o/[token]">["params"] }) {
  const { token } = await params;
  if (!UUID.test(token)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_order_by_token", { p_token: token });
  if (error) throw error;
  const order = data as OrderView | null;
  if (!order) notFound();

  const closed = order.status === "rejected" || order.status === "canceled";
  const headline = STATUS_HEADLINES[order.status];
  const current = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-6">
      <section className="bg-rose flex flex-col gap-2 rounded-3xl p-6 text-white">
        <span className="text-sm opacity-90">
          {order.shop.name} · 주문번호 {order.order_no}
        </span>
        <h1 className="text-2xl leading-snug font-bold">{headline}</h1>
        <span>{seoulDateTime(order.pickup_at)}에 받아요</span>
        {!closed && (
          <div className="flex items-center gap-3 pt-2">
            <ProgressBar
              value={current + 1}
              max={STATUS_STEPS.length}
              label="주문 진행 정도"
              tone="light"
            />
            <span className="shrink-0 text-xs opacity-90">
              {current + 1}/{STATUS_STEPS.length}
            </span>
          </div>
        )}
      </section>

      {closed ? (
        <p className="bg-soft rounded-2xl p-4 text-sm leading-relaxed">
          {order.reject_reason ?? "꽃집 사정으로 주문을 받지 못했어요."}
        </p>
      ) : (
        <ol aria-label="주문 진행 단계" className="flex flex-col px-1">
          {STATUS_STEPS.map((s, i) => {
            const done = i < current;
            const now = i === current;
            const last = i === STATUS_STEPS.length - 1;
            return (
              <li key={s.key} aria-current={now ? "step" : undefined} className="flex gap-4">
                <div className="flex w-7 flex-col items-center">
                  {done ? (
                    <span className="bg-rose flex size-7 shrink-0 items-center justify-center rounded-full text-white">
                      <svg
                        aria-hidden
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12l5 5L19 7" />
                      </svg>
                    </span>
                  ) : now ? (
                    <span className="bg-rose-soft flex size-7 shrink-0 items-center justify-center rounded-full">
                      <span className="bg-rose size-3 animate-pulse rounded-full" />
                    </span>
                  ) : (
                    <span className="flex size-7 shrink-0 items-center justify-center">
                      <span className="bg-line size-2.5 rounded-full" />
                    </span>
                  )}
                  {!last && (
                    <span
                      aria-hidden
                      className={`my-1 w-0.5 flex-1 ${done ? "bg-rose" : "bg-line"}`}
                    />
                  )}
                </div>
                <div className={`flex flex-col gap-0.5 ${last ? "" : "pb-6"} pt-0.5`}>
                  <span
                    className={now ? "text-rose font-bold" : done ? "font-medium" : "text-muted"}
                  >
                    {s.label}
                    {done && <span className="sr-only"> (완료)</span>}
                    {now && (
                      <span className="bg-rose-soft text-rose ml-2 rounded-md px-1.5 py-0.5 text-xs font-bold">
                        지금
                      </span>
                    )}
                  </span>
                  {(done || now) && <span className="text-muted text-sm">{s.desc}</span>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {order.photos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-bold">완성 사진</h2>
          {order.photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element -- 스토리지 이미지
            <img
              key={p}
              src={publicImageUrl("order-photos", p)}
              alt="완성된 꽃다발"
              className="w-full rounded-2xl"
            />
          ))}
        </section>
      )}

      <section className="border-line bg-surface flex flex-col gap-2.5 rounded-2xl border p-4 text-sm">
        <h2 className="font-bold">주문 내용</h2>
        <Row label="색감" value={COLORS[order.color_key]?.label ?? order.color_key} />
        <Row label="크기감" value={`${order.size} · ${SIZES[order.size]}`} />
        {order.request_note && <Row label="요청사항" value={order.request_note} />}
        <div className="border-line flex justify-between border-t pt-2.5 font-bold">
          <span>결제 금액</span>
          <span>{won(order.budget + order.extra_amount)}</span>
        </div>
      </section>

      {order.payment_status === "unpaid" && order.payment_method !== "onsite" && !closed && (
        <section className="bg-soft flex flex-col gap-2 rounded-2xl p-4 text-sm">
          <h2 className="font-bold">꽃집 계좌로 보내주세요</h2>
          {order.shop.bank_account && (
            <p>
              {order.shop.bank_name} {order.shop.bank_account} ({order.shop.bank_holder})
            </p>
          )}
          <div className="flex gap-2">
            {order.shop.kakaopay_link && (
              <a
                href={order.shop.kakaopay_link}
                className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#FEE500] font-bold text-[#3A1D1D]"
              >
                카카오페이로 보내기
              </a>
            )}
            {order.shop.toss_link && (
              <a
                href={order.shop.toss_link}
                className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#0064FF] font-bold text-white"
              >
                토스로 보내기
              </a>
            )}
          </div>
          <p className="text-muted">꽃집에서 입금을 확인하면 주문이 확정돼요.</p>
        </section>
      )}

      {order.shop.phone && (
        <a
          href={`tel:${order.shop.phone}`}
          className="border-line bg-surface flex min-h-13 items-center justify-center rounded-2xl border"
        >
          꽃집에 전화하기
        </a>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
