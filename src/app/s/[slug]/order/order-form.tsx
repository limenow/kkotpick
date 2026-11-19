"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { AccordionItem } from "@/components/ui/accordion";
import { DatePicker } from "@/components/ui/date-picker";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { dateLabel, timeLabel } from "@/lib/dates";
import {
  BUDGET_OPTIONS,
  COLORS,
  PAYMENT_METHODS,
  PURPOSES,
  SIZES,
  formatPhone,
  manwon,
  won,
} from "@/lib/labels";
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
const PHONE = /^01[0-9]{8,9}$/;

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
  const [purpose, setPurpose] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>(shop.payment_methods[0] ?? "onsite");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, submitting] = useActionState<OrderFormState, FormData>(submitOrder, {});

  // 서버에서 막히면 확인 창을 닫고 아래쪽 안내를 보여준다
  useEffect(() => {
    if (state.error) dialogRef.current?.close();
  }, [state]);

  const required = [
    pickupAt !== null,
    name.trim().length > 0,
    PHONE.test(phone.replace(/\D/g, "")),
    consent,
  ];
  const filled = required.filter(Boolean).length;

  function pickDate(next: string) {
    if (next === date) return;
    setDate(next);
    setPickupAt(null);
    // 당일에는 오늘 들어온 색감만 고를 수 있다
    if (next === today && !shop.available_colors.includes(color)) {
      setColor(shop.available_colors[0] ?? "any");
    }
    startSlots(async () => {
      setSlots(await fetchSlots(shop.slug, next));
    });
  }

  function openConfirm() {
    if (!formRef.current?.reportValidity()) return;
    dialogRef.current?.showModal();
  }

  const whenText = pickupAt
    ? `${isToday ? "오늘" : dateLabel(date)} ${timeLabel(pickupAt)}`
    : "시간을 아직 고르지 않았어요";

  return (
    <form ref={formRef} action={formAction} className="mx-auto flex w-full max-w-md flex-col pb-36">
      <header className="bg-ground/95 sticky top-0 z-10 flex flex-col gap-2 px-3 pt-2 pb-3 backdrop-blur">
        <div className="flex items-center gap-1">
          <Link
            href={`/s/${shop.slug}`}
            aria-label={`${shop.name}으로 돌아가기`}
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
          <div className="flex flex-1 flex-col">
            <h1 className="text-[17px] font-bold">주문서</h1>
            <span className="text-muted text-xs">{shop.name}</span>
          </div>
          <span className="text-muted pr-2 text-xs">필수 {filled}/4</span>
        </div>
        <div className="px-2">
          <ProgressBar value={filled} max={4} label="필수 항목 입력 상태" />
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
        <SegmentedControl
          label="받는 날"
          value={isToday ? "today" : "reserve"}
          onChange={(v) => {
            if (v === "today") pickDate(today);
            else if (isToday && reservationDates[0]) pickDate(reservationDates[0]);
          }}
          options={[
            { value: "today", label: "오늘 받기", disabled: !todayOpen },
            { value: "reserve", label: "날짜 정하기", disabled: reservationDates.length === 0 },
          ]}
        />
        {!todayOpen && (
          <p className="text-muted text-sm">오늘 주문은 마감됐어요. 받을 날짜를 골라주세요.</p>
        )}

        {!isToday && <DatePicker enabled={reservationDates} value={date} onChange={pickDate} />}

        <p className="text-muted text-sm">
          {isToday
            ? `지금 주문하면 ${shop.same_day_lead_minutes / 60}시간 뒤부터 받을 수 있어요.`
            : `${dateLabel(date)}에 받을 시간을 골라주세요.`}
        </p>
        {loadingSlots ? (
          <div className="flex flex-wrap gap-2" aria-busy="true">
            <span className="sr-only">시간을 불러오고 있어요</span>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-11 w-18 rounded-full" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <p className="bg-soft rounded-xl p-3 text-sm">
            이날은 남은 시간이 없어요. 다른 날짜를 골라주세요.
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
                {s.remaining === 1 && <span className="ml-1 text-xs font-normal">1자리 남음</span>}
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

      <Section title="크기">
        <SegmentedControl
          label="꽃다발 크기"
          value={size}
          onChange={setSize}
          options={SIZE_KEYS.map((k) => ({ value: k, label: `${k} · ${SIZES[k]}` }))}
        />
      </Section>

      <Section
        title="예산"
        hint={`고른 금액이 결제 금액이에요. 이 꽃집은 ${manwon(shop.min_budget)}부터 받아요.`}
      >
        <div className="grid grid-cols-3 gap-2.5">
          {budgets.map((b) => (
            <Chip
              key={b}
              on={budget === b}
              onClick={() => setBudget(b)}
              className="min-h-13 rounded-2xl"
            >
              {manwon(b)}
            </Chip>
          ))}
        </div>
      </Section>

      <div className="flex flex-col gap-2.5 px-5 pt-7">
        <AccordionItem title="어떤 날인지, 요청사항" hint="(선택)">
          <div className="flex flex-col gap-4 pt-1">
            <div className="flex flex-wrap gap-2" role="group" aria-label="어떤 날인지">
              {PURPOSES.map((p) => (
                <Chip key={p} on={purpose === p} onClick={() => setPurpose(purpose === p ? "" : p)}>
                  {p}
                </Chip>
              ))}
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              요청사항
              <textarea
                name="request_note"
                rows={3}
                maxLength={500}
                placeholder="장미는 빼주세요, 메시지 카드 넣어주세요"
                className="border-line bg-ground w-full resize-none rounded-2xl border px-4 py-3 text-[15px]"
              />
            </label>
          </div>
        </AccordionItem>
      </div>

      <Section title="주문하는 분">
        <label className="flex flex-col gap-1.5 text-sm">
          이름
          <input
            name="customer_name"
            required
            maxLength={30}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border-line bg-surface min-h-13 rounded-2xl border px-4 text-base"
          />
        </label>
        <label className="text-muted flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="consent"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="accent-rose mt-1 size-4"
          />
          연락처는 주문 접수, 완성, 픽업 안내 문자를 보내는 데만 써요. 픽업하고 나서 일정 기간이
          지나면 지워요.
        </label>
      </Section>

      <Section title="결제" hint="결제는 꽃집과 바로 해요. 꽃픽을 거치지 않아요.">
        <SegmentedControl
          label="결제 방법"
          value={payment}
          onChange={setPayment}
          options={shop.payment_methods.map((m) => ({ value: m, label: PAYMENT_METHODS[m] }))}
        />
      </Section>

      <p className="bg-soft mx-5 mt-6 rounded-2xl p-4 text-[13px] leading-relaxed text-[#5C5049]">
        꽃 종류는 그날 들어온 꽃으로 꽃집이 골라요. 다 만들면 사진을 먼저 보내드려요.
      </p>

      <div className="border-line bg-surface fixed inset-x-0 bottom-0 border-t px-5 pt-3 pb-6">
        <div className="mx-auto flex max-w-md flex-col gap-2">
          {state.error && (
            <p role="alert" className="bg-rose-soft text-rose-dark rounded-xl px-3 py-2 text-sm">
              {state.error}
            </p>
          )}
          <p className="text-muted text-sm">
            {whenText} · {COLORS[color].label} · {size}
          </p>
          <button
            type="button"
            onClick={openConfirm}
            disabled={!pickupAt}
            className="bg-rose min-h-14 rounded-2xl text-lg font-bold text-white disabled:opacity-50"
          >
            {pickupAt ? `${won(budget)} 주문하기` : "받을 시간을 골라주세요"}
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-title"
        className="bg-surface text-ink m-auto w-[calc(100%-2.5rem)] max-w-sm rounded-3xl p-0 backdrop:bg-black/40"
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 id="confirm-title" className="text-xl leading-snug font-bold">
            {shop.name}에 꽃다발을 주문할까요?
          </h2>
          <dl className="bg-ground grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl p-4 text-sm">
            <dt className="text-muted">받는 시간</dt>
            <dd>{whenText}</dd>
            <dt className="text-muted">색감·크기</dt>
            <dd>
              {COLORS[color].label} · {size} {SIZES[size]}
            </dd>
            <dt className="text-muted">결제</dt>
            <dd>
              {won(budget)} · {PAYMENT_METHODS[payment]}
            </dd>
          </dl>
          <p className="text-muted text-sm leading-relaxed">
            꽃집이 주문을 받으면 {phone ? formatPhone(phone) : "적어주신 번호"}로 문자를 보내드려요.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="border-line min-h-13 rounded-2xl border"
            >
              닫기
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-rose min-h-13 rounded-2xl font-bold text-white disabled:opacity-60"
            >
              {submitting ? "주문하는 중…" : "주문하기"}
            </button>
          </div>
        </div>
      </dialog>
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
        <span className="text-[17px] font-bold">{title}</span>
      </legend>
      {hint && <p className="text-muted -mt-2 text-[13px]">{hint}</p>}
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
