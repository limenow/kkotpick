import { Suspense } from "react";
import { PageLoading } from "@/components/page-loading";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/supabase/storage";
import { COLORS, SIZES, STATUS_STEPS, seoulDateTime, won } from "@/lib/labels";
import type { OrderView } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 손님 주문 상태 화면. 알림 문자 링크로 열린다. (디자인: 3. 주문 상태)
export default function OrderStatusPage(props: PageProps<"/o/[token]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <OrderContent params={props.params} />
    </Suspense>
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
  const current = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-6">
      <section className="bg-rose flex flex-col gap-1 rounded-3xl p-6 text-white">
        <span className="text-sm opacity-90">
          {order.shop.name} · 주문번호 {order.order_no}
        </span>
        <span className="text-2xl font-bold">
          {closed ? "주문이 취소됐어요" : STATUS_STEPS[current]?.label}
        </span>
        <span>{seoulDateTime(order.pickup_at)} 픽업</span>
      </section>

      {closed ? (
        <p className="bg-soft rounded-2xl p-4 text-sm leading-relaxed">
          {order.reject_reason ?? "꽃집 사정으로 주문을 받지 못했어요."}
        </p>
      ) : (
        <ol className="flex flex-col gap-3 px-2">
          {STATUS_STEPS.map((s, i) => (
            <li key={s.key} className="flex items-center gap-3">
              <span
                aria-hidden
                className={`size-5 rounded-full ${
                  i < current
                    ? "bg-rose"
                    : i === current
                      ? "border-rose border-[6px]"
                      : "border-line border-2"
                }`}
              />
              <span
                className={i === current ? "text-rose font-bold" : i < current ? "" : "text-muted"}
              >
                {s.label}
              </span>
            </li>
          ))}
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
