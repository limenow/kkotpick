"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { ctaClass, ctaSecondaryClass } from "@/components/ui/bottom-cta";
import { timeLabel } from "@/lib/dates";
import {
  COLORS,
  OWNER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  REJECT_REASONS,
  SIZES,
  SOURCES,
  formatPhone,
  manwon,
} from "@/lib/labels";
import type { OrderStatus, OwnerOrder, PaymentStatus } from "@/lib/types";
import { changePayment, changeStatus, undoStatus, type ActionResult } from "../actions";

// 상태마다 사장님이 다음에 할 일 하나를 큰 버튼으로 보여준다.
const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string; done: string }>> = {
  pending: { to: "accepted", label: "주문 받기", done: "주문을 받았어요" },
  accepted: { to: "making", label: "만들기 시작", done: "만들기 시작했어요" },
  making: { to: "ready", label: "다 만들었어요", done: "완성으로 바꿨어요" },
  ready: { to: "picked_up", label: "손님이 받아 갔어요", done: "픽업 완료로 바꿨어요" },
};

const PILL: Record<OrderStatus, string> = {
  pending: "bg-rose text-white",
  accepted: "bg-sage-soft text-sage-dark",
  making: "bg-sage-soft text-sage-dark",
  ready: "bg-sage text-white",
  picked_up: "bg-soft text-muted",
  rejected: "bg-soft text-muted",
  canceled: "bg-soft text-muted",
};

export function OrderCard({ order }: { order: OwnerOrder }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [sheet, setSheet] = useState<"reject" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");

  const next = NEXT[order.status];
  const closed = ["picked_up", "rejected", "canceled"].includes(order.status);
  const color = COLORS[order.color_key] ?? COLORS.any;

  function run(job: () => Promise<ActionResult>, done: string, undo?: () => Promise<ActionResult>) {
    start(async () => {
      const res = await job();
      if (!res.ok) {
        toast({ message: res.error });
        return;
      }
      toast({
        message: done,
        action: undo
          ? {
              label: "되돌리기",
              onClick: () =>
                start(async () => {
                  const r = await undo();
                  toast({ message: r.ok ? "되돌렸어요" : r.error });
                }),
            }
          : undefined,
      });
    });
  }

  function move(to: OrderStatus, done: string, why?: string) {
    run(
      () => changeStatus(order.id, to, why),
      `#${order.order_no} ${done}`,
      () => undoStatus(order.id),
    );
  }

  function pay(to: PaymentStatus, done: string) {
    const before = order.payment_status;
    run(
      () => changePayment(order.id, to),
      done,
      () => changePayment(order.id, before),
    );
  }

  function closeSheet() {
    setSheet(null);
    setReason("");
    setCustom("");
  }

  const why = reason === "직접 적기" ? custom.trim() : reason;
  const needsPayment =
    !closed &&
    order.status !== "pending" &&
    order.payment_status === "unpaid" &&
    order.payment_method !== "onsite";
  const onsiteDue =
    order.payment_method === "onsite" &&
    order.payment_status === "unpaid" &&
    order.status === "ready";

  return (
    <article
      aria-busy={pending || undefined}
      className={`bg-surface border-line flex flex-col gap-4 rounded-3xl border p-5 transition-opacity ${
        pending ? "opacity-60" : ""
      } ${closed ? "opacity-80" : ""}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[28px] leading-tight font-bold tabular-nums">
            {timeLabel(order.pickup_at)}
          </span>
          <span className="text-muted text-sm">
            #{order.order_no} · {SOURCES[order.source]} 주문
            {order.type === "same_day" ? " · 당일" : ""}
          </span>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${PILL[order.status]}`}>
          {OWNER_STATUS[order.status]}
        </span>
      </header>

      <div className="flex items-center gap-2 text-[17px] font-semibold">
        <span
          aria-hidden
          className="border-line size-5 shrink-0 rounded-full border"
          style={{ background: color.hex }}
        />
        {color.label} · {order.size} {SIZES[order.size]} · {manwon(order.budget)}
      </div>

      {(order.recipient || order.purpose || order.mood || order.request_note) && (
        <div className="bg-ground flex flex-col gap-1 rounded-2xl px-4 py-3 text-[15px]">
          {(order.recipient || order.purpose || order.mood) && (
            <span className="font-semibold">
              {[
                [order.recipient, order.purpose === "그냥" ? null : order.purpose]
                  .filter(Boolean)
                  .join(" "),
                order.mood,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
          {order.request_note && <p className="leading-relaxed">{order.request_note}</p>}
        </div>
      )}

      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-[15px]">
        <dt className="text-muted">손님</dt>
        <dd className="flex items-center justify-between gap-2">
          <span>
            {order.customer_name} · {formatPhone(order.customer_phone)}
          </span>
          <a
            href={`tel:${order.customer_phone}`}
            className="bg-soft flex min-h-9 items-center rounded-full px-3 text-sm font-semibold"
          >
            전화
          </a>
        </dd>
        <dt className="text-muted">결제</dt>
        <dd>
          {PAYMENT_METHODS[order.payment_method]} ·{" "}
          <span className={order.payment_status === "unpaid" ? "text-rose font-semibold" : ""}>
            {PAYMENT_STATUS[order.payment_status]}
          </span>
        </dd>
        {order.reject_reason && (
          <>
            <dt className="text-muted">이유</dt>
            <dd>{order.reject_reason}</dd>
          </>
        )}
      </dl>

      {(next || needsPayment || onsiteDue) && (
        <div className="flex flex-col gap-2">
          {needsPayment && (
            <button
              type="button"
              disabled={pending}
              onClick={() => pay("confirmed", "입금을 확인했어요")}
              className={ctaSecondaryClass}
            >
              입금 확인했어요
            </button>
          )}
          {onsiteDue && (
            <button
              type="button"
              disabled={pending}
              onClick={() => pay("paid_onsite", "현장 결제로 기록했어요")}
              className={ctaSecondaryClass}
            >
              매장에서 결제 받았어요
            </button>
          )}
          {next && (
            <div className="flex gap-2">
              {order.status === "pending" && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setSheet("reject")}
                  className={`${ctaSecondaryClass} basis-1/3`}
                >
                  거절
                </button>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() => move(next.to, next.done)}
                className={`${ctaClass} flex-1`}
              >
                {next.label}
              </button>
            </div>
          )}
          {order.status !== "pending" && next && (
            <button
              type="button"
              onClick={() => setSheet("cancel")}
              className="text-muted min-h-11 self-center px-3 text-sm underline underline-offset-4"
            >
              주문 취소
            </button>
          )}
        </div>
      )}

      <Sheet
        open={sheet !== null}
        onClose={closeSheet}
        title={
          sheet === "reject"
            ? `#${order.order_no} 주문을 거절할까요?`
            : `#${order.order_no} 주문을 취소할까요?`
        }
        description="손님에게 이유가 같이 보여요."
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">이유</legend>
          {[...REJECT_REASONS, "직접 적기"].map((r) => (
            <label
              key={r}
              className={`flex min-h-13 cursor-pointer items-center rounded-2xl border px-4 text-[16px] ${
                reason === r ? "border-rose bg-rose-soft text-rose font-semibold" : "border-line"
              }`}
            >
              <input
                type="radio"
                name={`reason-${order.id}`}
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="sr-only"
              />
              {r}
            </label>
          ))}
          {reason === "직접 적기" && (
            <textarea
              autoFocus
              maxLength={200}
              rows={3}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="손님에게 보낼 이유를 적어주세요"
              className="border-line rounded-2xl border p-4 text-[16px]"
            />
          )}
        </fieldset>
        <div className="flex gap-2">
          <button type="button" onClick={closeSheet} className={`${ctaSecondaryClass} basis-1/3`}>
            닫기
          </button>
          <button
            type="button"
            disabled={!why || pending}
            onClick={() => {
              const to = sheet === "reject" ? "rejected" : "canceled";
              move(to, sheet === "reject" ? "주문을 거절했어요" : "주문을 취소했어요", why);
              closeSheet();
            }}
            className={`${ctaClass} flex-1`}
          >
            {sheet === "reject" ? "거절하기" : "취소하기"}
          </button>
        </div>
      </Sheet>
    </article>
  );
}
