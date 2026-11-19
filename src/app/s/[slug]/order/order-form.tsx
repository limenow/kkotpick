"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { SampleImage } from "@/components/sample-image";
import { BottomCTA, ctaClass } from "@/components/ui/bottom-cta";
import { DatePicker } from "@/components/ui/date-picker";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { nameProblem, normalizeName } from "@/lib/customer-name";
import { dateLabel, timeLabel } from "@/lib/dates";
import {
  BUDGET_OPTIONS,
  COLORS,
  MOODS,
  PAYMENT_METHODS,
  PURPOSES,
  RECIPIENTS,
  SIZES,
  formatPhone,
  manwon,
  sizeForBudget,
  won,
} from "@/lib/labels";
import { publicImageUrl } from "@/lib/supabase/storage";
import type { ColorKey, PaymentMethod, PublicShop, ShopSample, Slot } from "@/lib/types";
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
const PHONE = /^01[0-9]{8,9}$/;
const LEAVE_IT = "꽃집 추천";

// 꽃을 잘 몰라도 느낌으로 주문할 수 있게, 한 화면에 한 가지만 묻는다.
// 누구에게 → 어떤 날 → 느낌 → 색감 → 예산 → 받는 시간 → 전할 말 → 연락처 → 결제 → 확인
// 하나만 고르는 질문은 누르면 바로 다음으로 넘어간다.
const STEPS = [
  "who",
  "occasion",
  "mood",
  "color",
  "budget",
  "when",
  "note",
  "contact",
  "pay",
  "review",
] as const;
type Step = (typeof STEPS)[number];

/**
 * 꽃집 예시 사진 고르기.
 * must에 있는 조건은 반드시 맞는 사진만, prefer에 있는 조건은 맞으면 더 앞에 둔다.
 */
function pickSample(
  samples: ShopSample[],
  must: { mood?: string; color?: ColorKey; budget?: number },
  prefer: { mood?: string | null; color?: ColorKey | null } = {},
) {
  const near = (s: ShopSample, b: number) =>
    s.budget_hint !== null && Math.abs(s.budget_hint - b) <= 10000;
  const candidates = samples.filter(
    (s) =>
      (!must.mood || s.mood === must.mood) &&
      (!must.color || s.color_key === must.color) &&
      (!must.budget || near(s, must.budget)),
  );
  const score = (s: ShopSample) =>
    (prefer.mood && s.mood === prefer.mood ? 2 : 0) +
    (prefer.color && s.color_key === prefer.color ? 1 : 0) -
    // 예산이 정해져 있으면 금액이 가까운 사진을 더 앞에 둔다
    (must.budget && s.budget_hint !== null
      ? (Math.abs(s.budget_hint - must.budget) / 10000) * 1.5
      : 0);
  return candidates.sort((a, b) => score(b) - score(a))[0] ?? null;
}

export function OrderForm({
  shop,
  today,
  reservationDates,
  todayOpen,
  initialDate,
  initialSlots,
}: Props) {
  const [step, setStep] = useState(0);
  const [recipient, setRecipient] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [color, setColor] = useState<ColorKey | null>(null);
  const [budget, setBudget] = useState<number | null>(null);

  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState(initialSlots);
  const [pickupAt, setPickupAt] = useState<string | null>(null);
  const [loadingSlots, startSlots] = useTransition();

  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod | null>(
    shop.payment_methods.length === 1 ? shop.payment_methods[0] : null,
  );

  const [state, formAction, submitting] = useActionState<OrderFormState, FormData>(submitOrder, {});

  const isToday = date === today;
  const budgets = BUDGET_OPTIONS.filter((b) => b >= shop.min_budget);
  const colorMissingToday = isToday && color !== null && !shop.available_colors.includes(color);
  const current: Step = STEPS[step];

  // 휴대폰 뒤로 가기를 누르면 이전 질문으로 돌아간다
  useEffect(() => {
    history.replaceState({ ...history.state, orderStep: 0 }, "");
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as { orderStep?: number } | null)?.orderStep;
      if (typeof s === "number") setStep(s);
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  // 확인 화면에서 "바꾸기"로 온 경우, 고르고 나면 다시 확인 화면으로 돌아간다
  const [fromReview, setFromReview] = useState(false);

  function goTo(target: number) {
    if (target !== step) history.pushState({ ...history.state, orderStep: target }, "");
    setStep(target);
    scrollTo({ top: 0 });
  }
  type Picked = Partial<{
    recipient: string;
    purpose: string;
    mood: string;
    color: ColorKey;
    budget: number;
    payment: PaymentMethod;
  }>;
  // 방금 고른 값은 아직 state에 반영되기 전이라 함께 넘겨받는다
  function firstMissing(p: Picked): number {
    const c = p.color ?? color;
    if (!(p.recipient ?? recipient)) return STEPS.indexOf("who");
    if (!(p.purpose ?? purpose)) return STEPS.indexOf("occasion");
    if (!(p.mood ?? mood)) return STEPS.indexOf("mood");
    if (!c) return STEPS.indexOf("color");
    if (!(p.budget ?? budget)) return STEPS.indexOf("budget");
    if (!pickupAt || (isToday && !shop.available_colors.includes(c))) return STEPS.indexOf("when");
    if (nameProblem(name) || !PHONE.test(phone.replace(/\D/g, "")) || !consent)
      return STEPS.indexOf("contact");
    if (!(p.payment ?? payment)) return STEPS.indexOf("pay");
    return STEPS.indexOf("review");
  }
  const next = (picked: Picked = {}) => {
    if (fromReview) {
      setFromReview(false);
      const target = firstMissing(picked);
      // 확인 화면으로 돌아갈 땐 기록을 되감아서, 뒤로 가기가 확인 화면 앞 질문으로 가게 한다
      if (target === STEPS.indexOf("review")) history.back();
      else goTo(target);
    } else {
      goTo(step + 1);
    }
  };
  const jump = (s: Step) => {
    setFromReview(true);
    goTo(STEPS.indexOf(s));
  };

  function pickDate(nextDate: string) {
    if (nextDate === date) return;
    setDate(nextDate);
    setPickupAt(null);
    startSlots(async () => {
      setSlots(await fetchSlots(shop.slug, nextDate));
    });
  }

  const whenText = pickupAt ? `${isToday ? "오늘" : dateLabel(date)} ${timeLabel(pickupAt)}` : "";
  const phoneOk = PHONE.test(phone.replace(/\D/g, ""));
  // 한글은 입력하는 도중에 자음·모음이 잠깐 보이므로, 칸을 벗어났을 때만 안내를 보여준다
  const nameError = name.trim() && !nameFocused ? nameProblem(name) : null;

  // 꽃집에 전달되는 한 줄 (예: 연인 생일 꽃다발 · 러블리 · 핑크 계열 · 5만 원)
  const brief = [
    [recipient, purpose === "그냥" ? null : purpose].filter(Boolean).join(" ") + " 꽃다발",
    mood,
    color ? (color === "any" ? "색감은 꽃집 추천" : `${COLORS[color].label} 계열`) : null,
    budget ? manwon(budget) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-md flex-1 flex-col pb-40">
      <header className="bg-ground/95 sticky top-0 z-10 flex flex-col gap-2 px-3 pt-2 pb-3 backdrop-blur">
        <div className="flex items-center gap-1">
          {step === 0 ? (
            <Link
              href={`/s/${shop.slug}`}
              aria-label={`${shop.name}으로 돌아가기`}
              className="flex size-11 items-center justify-center"
            >
              <BackIcon />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => history.back()}
              aria-label="이전 질문으로"
              className="flex size-11 items-center justify-center"
            >
              <BackIcon />
            </button>
          )}
          <span className="text-muted flex-1 text-sm">{shop.name}</span>
          <span className="text-muted pr-2 text-sm tabular-nums">
            {step + 1}/{STEPS.length}
          </span>
        </div>
        <div className="px-2">
          <ProgressBar value={step + 1} max={STEPS.length} label="주문서 진행" />
        </div>
      </header>

      <input type="hidden" name="slug" value={shop.slug} />
      <input type="hidden" name="recipient" value={recipient ?? ""} />
      <input type="hidden" name="purpose" value={purpose ?? ""} />
      <input type="hidden" name="mood" value={mood ?? ""} />
      <input type="hidden" name="color_key" value={color ?? ""} />
      <input type="hidden" name="budget" value={budget ?? ""} />
      <input type="hidden" name="size" value={budget ? sizeForBudget(budget) : ""} />
      <input type="hidden" name="pickup_at" value={pickupAt ?? ""} />
      <input type="hidden" name="request_note" value={note} />
      <input type="hidden" name="customer_name" value={normalizeName(name)} />
      <input type="hidden" name="customer_phone" value={phone} />
      <input type="hidden" name="consent" value={consent ? "on" : ""} />
      <input type="hidden" name="payment_method" value={payment ?? ""} />

      <div key={current} className="flex animate-[step-in_220ms_ease-out] flex-col gap-6 px-5 pt-4">
        {current === "who" && (
          <>
            <Title sub="꽃 이름은 몰라도 괜찮아요. 몇 가지만 고르면 꽃집이 알아서 만들어요.">
              누구에게 주는 꽃이에요?
            </Title>
            <div className="grid grid-cols-2 gap-3" role="group" aria-label="누구에게">
              {RECIPIENTS.map((r) => (
                <Choice
                  key={r}
                  on={recipient === r}
                  onClick={() => {
                    setRecipient(r);
                    next({ recipient: r });
                  }}
                  className="min-h-16"
                >
                  {r}
                </Choice>
              ))}
            </div>
          </>
        )}

        {current === "occasion" && (
          <>
            <Title>어떤 날이에요?</Title>
            <div className="grid grid-cols-2 gap-3" role="group" aria-label="어떤 날">
              {PURPOSES.map((p) => (
                <Choice
                  key={p}
                  on={purpose === p}
                  onClick={() => {
                    setPurpose(p);
                    next({ purpose: p });
                  }}
                  className="min-h-16"
                >
                  {p === "그냥" ? "특별한 날은 아니에요" : p}
                </Choice>
              ))}
            </div>
          </>
        )}

        {current === "mood" && (
          <>
            <Title sub="이 꽃집에서 만든 예시예요. 똑같이 나오진 않고, 이런 느낌으로 만들어요.">
              어떤 느낌이 좋아요?
            </Title>
            <div className="flex flex-col gap-3" role="group" aria-label="느낌">
              {MOODS.map((m) => {
                const sample = pickSample(shop.samples, { mood: m.key });
                return (
                  <Choice
                    key={m.key}
                    on={mood === m.key}
                    onClick={() => {
                      setMood(m.key);
                      next({ mood: m.key });
                    }}
                    className="items-stretch justify-start gap-4 p-3 text-left"
                  >
                    <Thumb sample={sample} />
                    <span className="flex flex-col justify-center gap-1">
                      <span className="text-[18px] font-bold">{m.key}</span>
                      <span className="text-muted text-[14px] font-normal">{m.desc}</span>
                    </span>
                  </Choice>
                );
              })}
              <Choice
                on={mood === LEAVE_IT}
                onClick={() => {
                  setMood(LEAVE_IT);
                  next({ mood: LEAVE_IT });
                }}
                className="min-h-14"
              >
                잘 모르겠어요, 꽃집에 맡길게요
              </Choice>
            </div>
          </>
        )}

        {current === "color" && (
          <>
            <Title sub="그날 들어온 꽃으로 이 색 계열에 맞춰 만들어요.">어떤 색감이 좋아요?</Title>
            <div className="grid grid-cols-2 gap-3" role="group" aria-label="색감">
              {ALL_COLORS.map((key) => {
                const match = pickSample(shop.samples, { color: key }, { mood });
                return (
                  <Choice
                    key={key}
                    on={color === key}
                    onClick={() => {
                      setColor(key);
                      next({ color: key });
                    }}
                    className="flex-col gap-2 p-2 pb-3"
                  >
                    {match ? (
                      <SampleImage
                        src={publicImageUrl("shop-images", match.image_path)}
                        alt={`${COLORS[key].label} 예시`}
                        tint={`${COLORS[key].hex}55`}
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl"
                        style={{ background: `${COLORS[key].hex}40` }}
                      >
                        <span
                          className="size-12 rounded-full border border-black/10"
                          style={{ background: COLORS[key].hex }}
                        />
                      </span>
                    )}
                    {key === "any" ? "꽃집에 맡길게요" : COLORS[key].label}
                  </Choice>
                );
              })}
            </div>
          </>
        )}

        {current === "budget" && (
          <>
            <Title
              sub={`고른 금액이 결제 금액이에요. 이 꽃집은 ${manwon(shop.min_budget)}부터 받아요.`}
            >
              예산은 얼마로 할까요?
            </Title>
            <div className="flex flex-col gap-3" role="group" aria-label="예산">
              {budgets.map((b) => {
                const sample = pickSample(shop.samples, { budget: b }, { mood, color });
                return (
                  <Choice
                    key={b}
                    on={budget === b}
                    onClick={() => {
                      setBudget(b);
                      next({ budget: b });
                    }}
                    className="items-stretch justify-start gap-4 p-3 text-left"
                  >
                    <Thumb sample={sample} />
                    <span className="flex flex-col justify-center gap-1">
                      <span className="text-[20px] font-bold">{manwon(b)}</span>
                      <span className="text-muted text-[14px] font-normal">
                        {SIZES[sizeForBudget(b)]}
                      </span>
                    </span>
                  </Choice>
                );
              })}
            </div>
          </>
        )}

        {current === "when" && (
          <>
            <Title
              sub={
                isToday
                  ? `지금 주문하면 ${shop.same_day_lead_minutes / 60}시간 뒤부터 받을 수 있어요.`
                  : undefined
              }
            >
              언제 받으세요?
            </Title>
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
              <p className="text-muted -mt-2 text-sm">
                오늘 주문은 마감됐어요. 받을 날짜를 골라주세요.
              </p>
            )}
            {colorMissingToday && color && (
              <div className="bg-rose-soft text-rose-dark flex flex-col gap-2 rounded-2xl p-4 text-[15px]">
                오늘은 {COLORS[color].label} 꽃이 들어오지 않았어요. 다른 날을 고르거나 색감을
                바꿔주세요.
                <button
                  type="button"
                  onClick={() => jump("color")}
                  className="self-start font-bold underline underline-offset-4"
                >
                  색감 바꾸기
                </button>
              </div>
            )}
            {!isToday && <DatePicker enabled={reservationDates} value={date} onChange={pickDate} />}

            <div className="flex flex-col gap-3">
              <span className="text-muted text-sm">
                {isToday ? "오늘" : dateLabel(date)} 받을 시간
              </span>
              {loadingSlots ? (
                <div className="grid grid-cols-3 gap-2" aria-busy="true">
                  <span className="sr-only">시간을 불러오고 있어요</span>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 rounded-2xl" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="bg-soft rounded-2xl p-4 text-[15px]">
                  이날은 남은 시간이 없어요. 다른 날짜를 골라주세요.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="받을 시간">
                  {slots.map((s) => (
                    <Choice
                      key={s.slot_start}
                      on={pickupAt === s.slot_start}
                      onClick={() => setPickupAt(s.slot_start)}
                      className="min-h-14 flex-col"
                    >
                      <span className="tabular-nums">{timeLabel(s.slot_start)}</span>
                      {s.remaining === 1 && <span className="text-xs font-normal">1자리 남음</span>}
                    </Choice>
                  ))}
                </div>
              )}
            </div>
            <BottomCTA hint={pickupAt ? `${whenText}에 받아요` : undefined}>
              <button
                type="button"
                disabled={!pickupAt || colorMissingToday}
                onClick={() => next()}
                className={ctaClass}
              >
                다음
              </button>
            </BottomCTA>
          </>
        )}

        {current === "note" && (
          <>
            <Title sub="메시지 카드 문구나 빼고 싶은 꽃이 있으면 적어주세요. 없으면 넘어가도 돼요.">
              꽃집에 더 전할 말이 있나요?
            </Title>
            <textarea
              rows={5}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={"메시지 카드에 '생일 축하해' 써주세요\n장미는 빼주세요"}
              className="border-line bg-surface w-full resize-none rounded-2xl border px-4 py-3 text-[16px]"
            />
            <BottomCTA>
              <button type="button" onClick={() => next()} className={ctaClass}>
                {note.trim() ? "다음" : "없어요, 넘어갈게요"}
              </button>
            </BottomCTA>
          </>
        )}

        {current === "contact" && (
          <>
            <Title sub="꽃집이 주문을 받으면 이 번호로 문자를 보내드려요.">
              주문하시는 분을 알려주세요
            </Title>
            <label className="flex flex-col gap-2">
              <span className="text-muted text-sm">이름</span>
              <input
                autoFocus
                maxLength={30}
                autoComplete="name"
                enterKeyHint="next"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "name-error" : undefined}
                placeholder="한글이나 영어 이름"
                className="border-line focus:border-rose aria-invalid:border-rose border-b-2 bg-transparent py-2 text-[22px] font-semibold outline-none placeholder:font-normal placeholder:text-[#C9BDB5]"
              />
              {nameError && (
                <span id="name-error" role="alert" className="text-rose text-sm">
                  {nameError}
                </span>
              )}
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-muted text-sm">휴대폰 번호</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                enterKeyHint="done"
                maxLength={13}
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="010-0000-0000"
                aria-invalid={phone.length >= 12 && !phoneOk ? true : undefined}
                className="border-line focus:border-rose aria-invalid:border-rose border-b-2 bg-transparent py-2 text-[22px] font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-[#C9BDB5]"
              />
            </label>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-[15px] leading-relaxed ${
                consent ? "border-rose bg-rose-soft" : "border-line bg-surface"
              }`}
            >
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="accent-rose mt-1 size-5 shrink-0"
              />
              <span>
                <b className="font-semibold">연락처를 주문 안내에 쓰는 데 동의해요</b>
                <span className="text-muted mt-1 block text-sm">
                  주문 접수, 완성, 픽업 안내 문자에만 쓰고, 픽업하고 나서 일정 기간이 지나면 지워요.
                </span>
              </span>
            </label>
            <BottomCTA>
              <button
                type="button"
                disabled={Boolean(nameProblem(name)) || !phoneOk || !consent}
                onClick={() => next()}
                className={ctaClass}
              >
                다음
              </button>
            </BottomCTA>
          </>
        )}

        {current === "pay" && (
          <>
            <Title sub="결제는 꽃집과 바로 해요. 꽃픽을 거치지 않아요.">어떻게 결제할까요?</Title>
            <div className="flex flex-col gap-3" role="group" aria-label="결제 방법">
              {shop.payment_methods.map((m) => (
                <Choice
                  key={m}
                  on={payment === m}
                  onClick={() => {
                    setPayment(m);
                    next({ payment: m });
                  }}
                  className="min-h-16 justify-start px-5"
                >
                  {PAYMENT_METHODS[m]}
                </Choice>
              ))}
            </div>
          </>
        )}

        {current === "review" && color && budget && payment && pickupAt && (
          <>
            <Title>꽃집에는 이렇게 전달돼요</Title>
            <div className="bg-rose-soft flex items-center gap-4 rounded-3xl p-4">
              <Thumb
                sample={
                  pickSample(shop.samples, { budget }, { mood, color }) ??
                  pickSample(shop.samples, {}, { mood, color })
                }
              />
              <p className="text-rose-dark text-[17px] leading-relaxed font-semibold">{brief}</p>
            </div>
            <p className="text-muted -mt-2 text-sm leading-relaxed">
              꽃 종류는 그날 들어온 꽃으로 꽃집이 골라요. 다 만들면 사진을 먼저 보내드려요.
            </p>
            {state.error && (
              <div
                role="alert"
                className="bg-rose-soft text-rose-dark flex flex-col gap-2 rounded-2xl p-4 text-[15px]"
              >
                {state.error}
                <button
                  type="button"
                  onClick={() => {
                    setPickupAt(null);
                    startSlots(async () => setSlots(await fetchSlots(shop.slug, date)));
                    jump("when");
                  }}
                  className="self-start font-bold underline underline-offset-4"
                >
                  시간 다시 고르기
                </button>
              </div>
            )}
            <dl className="bg-surface border-line divide-line flex flex-col divide-y rounded-3xl border">
              <Row
                label="누구에게"
                value={`${recipient} · ${purpose === "그냥" ? "특별한 날 아님" : purpose}`}
                onEdit={() => jump("who")}
              />
              <Row label="느낌" value={mood} onEdit={() => jump("mood")} />
              <Row
                label="색감"
                value={
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-4 rounded-full border border-black/10"
                      style={{ background: COLORS[color].hex }}
                    />
                    {color === "any" ? "꽃집에 맡김" : COLORS[color].label}
                  </span>
                }
                onEdit={() => jump("color")}
              />
              <Row label="받는 시간" value={whenText} onEdit={() => jump("when")} />
              {note.trim() && (
                <Row label="전할 말" value={note.trim()} onEdit={() => jump("note")} />
              )}
              <Row
                label="주문하는 분"
                value={
                  <span className="flex flex-col">
                    {normalizeName(name)}
                    <span className="tabular-nums">{phone}</span>
                  </span>
                }
                onEdit={() => jump("contact")}
              />
              <Row label="결제" value={PAYMENT_METHODS[payment]} onEdit={() => jump("pay")} />
              <Row
                label="결제 금액"
                value={<b className="text-[19px]">{won(budget)}</b>}
                onEdit={() => jump("budget")}
              />
            </dl>
            <BottomCTA>
              <button type="submit" disabled={submitting} className={ctaClass}>
                {submitting ? "주문하는 중…" : `${won(budget)} 주문하기`}
              </button>
            </BottomCTA>
          </>
        )}
      </div>
    </form>
  );
}

function Title({ sub, children }: { sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <h1 className="text-[26px] leading-snug font-bold">{children}</h1>
      {sub && <p className="text-muted text-[15px] leading-relaxed">{sub}</p>}
    </div>
  );
}

/** 선택지 왼쪽의 작은 예시 사진. 맞는 사진이 없으면 빈 칸으로 둔다. */
function Thumb({ sample }: { sample: ShopSample | null }) {
  return (
    <span className="w-20 shrink-0 overflow-hidden rounded-xl">
      {sample ? (
        <SampleImage
          src={publicImageUrl("shop-images", sample.image_path)}
          alt=""
          tint={sample.color_key ? `${COLORS[sample.color_key].hex}55` : "#FBE9EE"}
        />
      ) : (
        <span aria-hidden className="bg-soft block aspect-[4/5] w-full rounded-xl" />
      )}
    </span>
  );
}

function Row({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: React.ReactNode;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <dt className="text-muted w-20 shrink-0 text-sm">{label}</dt>
      <dd className="flex-1 text-[16px]">{value}</dd>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`${label} 바꾸기`}
        className="text-muted min-h-11 shrink-0 px-2 text-sm underline underline-offset-4"
      >
        바꾸기
      </button>
    </div>
  );
}

function Choice({
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
      className={`flex items-center justify-center rounded-2xl text-[17px] transition-colors active:scale-[0.98] ${
        on
          ? "border-rose bg-rose-soft text-rose border-2 font-bold"
          : "border-line bg-surface active:bg-soft border"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function BackIcon() {
  return (
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
  );
}
