"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { dateLabel, timeLabel } from "@/lib/dates";
import { BUDGET_OPTIONS, COLORS, PAYMENT_METHODS, PURPOSES, SIZES, won } from "@/lib/labels";
import type { BouquetSize, ColorKey, PaymentMethod, PublicShop, Slot } from "@/lib/types";
import { fetchSlots, submitOrder, type OrderFormState } from "./actions";

interface Props {
  shop: PublicShop;
  today: string;
  reservationDates: string[];
  todayOpen: boolean;
  initialDate: string;
  initialSlots: Slot[];
}

const ALL_COLORS = Object.keys(COLORS) as ColorKey[];
const SIZE_KEYS = Object.keys(SIZES) as BouquetSize[];

export function OrderForm({
  shop,
  today,
  reservationDates,
  todayOpen,
  initialDate,
  initialSlots,
}: Props) {
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState(initialSlots);
  const [pickupAt, setPickupAt] = useState<string | null>(null);
  const [loadingSlots, startSlots] = useTransition();

  const isToday = date === today;
  const colors = isToday ? shop.available_colors : ALL_COLORS;
  const budgets = BUDGET_OPTIONS.filter((b) => b >= shop.min_budget);

  const [color, setColor] = useState<ColorKey>(colors[0] ?? "any");
  const [size, setSize] = useState<BouquetSize>("M");
  const [budget, setBudget] = useState<number>(
    budgets.find((b) => b >= 50000) ?? budgets[0] ?? shop.min_budget,
  );
  const [purpose, setPurpose] = useState<string>("");
  const [payment, setPayment] = useState<PaymentMethod>(shop.payment_methods[0] ?? "onsite");

  const [state, formAction, submitting] = useActionState<OrderFormState, FormData>(submitOrder, {});

  function pickDate(next: string) {
    if (next === date) return;
    setDate(next);
    setPickupAt(null);
    // 당일에는 오늘 가능한 색감만 고를 수 있다
    if (next === today && !shop.available_colors.includes(color)) {
      setColor(shop.available_colors[0] ?? "any");
    }
    startSlots(async () => {
      setSlots(await fetchSlots(shop.slug, next));
    });
  }

  const tabClass = (on: boolean) =>
    `min-h-11 rounded-xl text-[15px] ${on ? "bg-surface font-bold shadow-sm" : "text-muted"}`;

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-md flex-col pb-40">
      <header className="flex items-center gap-1 px-3 pt-3">
        <Link
          href={`/s/${shop.slug}`}
          aria-label="꽃집으로 돌아가기"
          className="flex size-11 items-center justify-center"
        >
          <svg
            aria-hidden
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <div className="flex flex-col">
          <h1 className="text-[17px] font-bold">주문하기</h1>
          <span className="text-muted text-xs">{shop.name}</span>
        </div>
      </header>

      <input type="hidden" name="slug" value={shop.slug} />
      <input type="hidden" name="pickup_at" value={pickupAt ?? ""} />
      <input type="hidden" name="color_key" value={color} />
      <input type="hidden" name="size" value={size} />
      <input type="hidden" name="budget" value={budget} />
      <input type="hidden" name="purpose" value={purpose} />
      <input type="hidden" name="payment_method" value={payment} />

      <Section title="언제 받으세요?">
        <div className="bg-soft grid grid-cols-2 rounded-2xl p-1">
          <button
            type="button"
            className={tabClass(isToday)}
            disabled={!todayOpen}
            onClick={() => pickDate(today)}
          >
            오늘 픽업
          </button>
          <button
            type="button"
            className={tabClass(!isToday)}
            disabled={reservationDates.length === 0}
            onClick={() => reservationDates[0] && pickDate(isToday ? reservationDates[0] : date)}
          >
            예약 주문
          </button>
        </div>
        {!todayOpen && (
          <p className="text-muted text-sm">오늘은 주문이 마감됐어요. 예약 주문으로 골라주세요.</p>
        )}

        {!isToday && (
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {reservationDates.map((d) => (
              <Chip key={d} on={d === date} onClick={() => pickDate(d)} className="shrink-0">
                {dateLabel(d)}
              </Chip>
            ))}
          </div>
        )}

        <p className="text-muted text-sm">
          {isToday
            ? `지금 주문하면 ${shop.same_day_lead_minutes / 60}시간 뒤부터 받을 수 있어요`
            : `${dateLabel(date)} 픽업 시간을 골라주세요`}
        </p>
        {loadingSlots ? (
          <p className="text-muted text-sm">시간 불러오는 중…</p>
        ) : slots.length === 0 ? (
          <p className="bg-soft rounded-xl p-3 text-sm">
            이 날은 남은 시간이 없어요. 다른 날짜를 골라주세요.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => (
              <Chip
                key={s.slot_start}
                on={pickupAt === s.slot_start}
                onClick={() => setPickupAt(s.slot_start)}
              >
                {timeLabel(s.slot_start)}
                {s.remaining === 1 && (
                  <span className="ml-1 text-xs font-normal">마지막 1자리</span>
                )}
              </Chip>
            ))}
          </div>
        )}
      </Section>

      <Section title="어떤 색감이 좋아요?">
        <div className="grid grid-cols-3 gap-2.5">
          {colors.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={color === key}
              onClick={() => setColor(key)}
              className={`flex min-h-22 flex-col items-center justify-center gap-2 rounded-2xl text-sm ${
                color === key
                  ? "border-rose bg-rose-soft border-2 font-bold"
                  : "border-line bg-surface border"
              }`}
            >
              <span
                aria-hidden
                className="size-8 rounded-full border border-black/10"
                style={{ background: COLORS[key].hex }}
              />
              {COLORS[key].label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="크기감">
        <div className="grid grid-cols-3 gap-2.5">
          {SIZE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={size === key}
              onClick={() => setSize(key)}
              className={`flex min-h-19 flex-col items-center justify-center gap-1 rounded-2xl ${
                size === key ? "border-rose bg-rose-soft border-2" : "border-line bg-surface border"
              }`}
            >
              <span className="text-lg font-bold">{key}</span>
              <span className="text-muted text-xs">{SIZES[key]}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="예산"
        hint={`고른 예산이 그대로 결제 금액이에요. 이 꽃집은 ${won(shop.min_budget)}부터.`}
      >
        <div className="grid grid-cols-3 gap-2.5">
          {budgets.map((b) => (
            <Chip
              key={b}
              on={budget === b}
              onClick={() => setBudget(b)}
              className="min-h-13 rounded-2xl"
            >
              {b / 10000}만원
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="어떤 날이에요?" hint="선택">
        <div className="flex flex-wrap gap-2">
          {PURPOSES.map((p) => (
            <Chip key={p} on={purpose === p} onClick={() => setPurpose(purpose === p ? "" : p)}>
              {p}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="요청사항" hint="선택">
        <textarea
          name="request_note"
          rows={3}
          maxLength={500}
          placeholder="예) 장미는 빼주세요, 메시지 카드 넣어주세요"
          className="border-line bg-surface w-full resize-none rounded-2xl border px-4 py-3 text-[15px]"
        />
      </Section>

      <Section title="주문하시는 분">
        <label className="flex flex-col gap-1.5 text-sm">
          이름
          <input
            name="customer_name"
            required
            maxLength={30}
            autoComplete="name"
            className="border-line bg-surface min-h-13 rounded-2xl border px-4 text-base"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          연락처
          <input
            name="customer_phone"
            required
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="010-0000-0000"
            className="border-line bg-surface min-h-13 rounded-2xl border px-4 text-base"
          />
        </label>
        <label className="text-muted flex items-start gap-2 text-sm">
          <input type="checkbox" name="consent" required className="accent-rose mt-1 size-4" />
          주문 접수, 완성, 픽업 안내 문자를 보내는 데만 연락처를 써요. 픽업 후 일정 기간이 지나면
          지워요.
        </label>
      </Section>

      <Section title="결제는 어떻게 할까요?" hint="꽃픽은 돈을 받지 않아요. 꽃집으로 바로 보내요.">
        <div className="flex flex-wrap gap-2">
          {shop.payment_methods.map((m) => (
            <Chip key={m} on={payment === m} onClick={() => setPayment(m)}>
              {PAYMENT_METHODS[m]}
            </Chip>
          ))}
        </div>
      </Section>

      <p className="bg-soft mx-5 mt-6 rounded-2xl p-4 text-[13px] leading-relaxed text-[#5C5049]">
        꽃 종류는 그날 들어온 꽃으로 꽃집이 골라요. 완성되면 사진으로 먼저 보여드려요.
      </p>

      <div className="border-line bg-surface fixed inset-x-0 bottom-0 border-t px-5 pt-3 pb-6">
        <div className="mx-auto flex max-w-md flex-col gap-2">
          {state.error && (
            <p role="alert" className="bg-rose-soft text-rose-dark rounded-xl px-3 py-2 text-sm">
              {state.error}
            </p>
          )}
          <p className="text-muted text-sm">
            {pickupAt
              ? `${isToday ? "오늘" : dateLabel(date)} ${timeLabel(pickupAt)} 픽업`
              : "픽업 시간을 골라주세요"}{" "}
            · {COLORS[color].label} · {size}
          </p>
          <button
            type="submit"
            disabled={!pickupAt || submitting}
            className="bg-rose min-h-14 rounded-2xl text-lg font-bold text-white disabled:opacity-50"
          >
            {submitting ? "주문 넣는 중…" : `${won(budget)} 주문하기`}
          </button>
        </div>
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-3 px-5 pt-7">
      <legend className="contents">
        <span className="text-[17px] font-bold">
          {title}
          {hint === "선택" && <span className="text-muted ml-1 text-sm font-normal">(선택)</span>}
        </span>
      </legend>
      {hint && hint !== "선택" && <p className="text-muted -mt-2 text-[13px]">{hint}</p>}
      {children}
    </fieldset>
  );
}

function Chip({
  on,
  onClick,
  className = "",
  children,
}: {
  on: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-11 rounded-full px-4 text-[15px] ${
        on ? "border-rose bg-rose-soft text-rose border font-bold" : "border-line bg-surface border"
      } ${className}`}
    >
      {children}
    </button>
  );
}
