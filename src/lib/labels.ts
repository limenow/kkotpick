import type {
  BouquetSize,
  ColorKey,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "./types";

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  transfer: "계좌이체",
  kakaopay: "카카오페이 송금",
  toss: "토스 송금",
  onsite: "매장에서 결제",
};

// 누구에게 주는 꽃인지 (꽃을 잘 몰라도 여기서부터 시작할 수 있게)
export const RECIPIENTS = ["연인", "가족", "친구", "선생님·교수님", "직장 동료", "나에게"] as const;

// 어떤 날인지
export const PURPOSES = ["생일", "기념일", "졸업", "고백", "감사", "축하", "사과", "그냥"] as const;

// 꽃다발 느낌. 꽃 이름 대신 이 단어로 꽃집에 전달된다.
export const MOODS = [
  { key: "러블리", desc: "핑크·파스텔로 동글동글 귀엽게" },
  { key: "화사한", desc: "밝은 색 여러 가지로 눈에 띄게" },
  { key: "차분한", desc: "톤을 낮춰서 은은하게" },
  { key: "고급스러운", desc: "꽃 종류는 적게, 크고 깔끔하게" },
  { key: "내추럴", desc: "들꽃처럼 자연스럽게" },
] as const;
export const MOOD_KEYS: string[] = MOODS.map((m) => m.key);

/** 예산으로 크기를 정한다. 손님에게 크기를 따로 묻지 않는다. */
export function sizeForBudget(budget: number): BouquetSize {
  if (budget < 30000) return "S";
  if (budget < 70000) return "M";
  return "L";
}

export const BUDGET_OPTIONS = [10000, 20000, 30000, 50000, 70000, 100000];

export const COLORS: Record<ColorKey, { label: string; hex: string }> = {
  pink: { label: "핑크", hex: "#F4A7B9" },
  white: { label: "화이트", hex: "#F5F1E8" },
  red: { label: "레드", hex: "#C8323F" },
  yellow: { label: "옐로우", hex: "#F2C94C" },
  purple: { label: "퍼플", hex: "#A98BD0" },
  any: { label: "꽃집 추천", hex: "#9FB8A3" },
};

export const SIZES: Record<BouquetSize, string> = {
  S: "한 손에 쏙",
  M: "선물용 기본",
  L: "품에 가득",
};

// 손님 화면의 진행 단계 (거절·취소는 따로 표시)
export const STATUS_STEPS: { key: OrderStatus; label: string; desc: string }[] = [
  { key: "pending", label: "주문 접수", desc: "꽃집에서 주문을 확인하고 있어요" },
  { key: "accepted", label: "꽃집 수락", desc: "꽃집이 주문을 받았어요" },
  { key: "making", label: "만드는 중", desc: "그날 들어온 꽃으로 만들고 있어요" },
  { key: "ready", label: "완성", desc: "사진을 확인하고 받으러 오세요" },
  { key: "picked_up", label: "픽업 완료", desc: "꽃다발을 받아 가셨어요" },
];

// 손님 주문 상태 화면 맨 위 큰 문장 (타임라인 설명과 겹치지 않게 따로 둔다)
export const STATUS_HEADLINES: Record<OrderStatus, string> = {
  pending: "주문을 보냈어요",
  accepted: "꽃집이 주문을 받았어요",
  making: "꽃다발을 만들고 있어요",
  ready: "꽃다발이 다 됐어요",
  picked_up: "꽃다발을 받아 가셨어요",
  rejected: "꽃집이 주문을 받지 못했어요",
  canceled: "주문을 취소했어요",
};

/**
 * 휴대폰 번호를 하이픈 넣은 모양으로 맞춘다. 입력하는 중에도 쓴다.
 * 01027402919, 010-27402919, +82 10 2740 2919 → 010-2740-2919
 */
export function formatPhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("82")) d = "0" + d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 3) return d;
  // 010은 3-4-4. 011, 016 같은 옛 번호는 10자리면 3-3-4, 11자리면 3-4-4.
  const mid = d.startsWith("010") || d.length === 11 ? 4 : 3;
  if (d.length <= 3 + mid) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 3 + mid)}-${d.slice(3 + mid)}`;
}

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 30000 → "3만 원", 35000 → "3만 5천 원" (만 단위 띄어쓰기) */
export function manwon(n: number) {
  const man = Math.floor(n / 10000);
  const cheon = Math.round((n % 10000) / 1000);
  if (man === 0) return won(n);
  return `${man}만${cheon ? ` ${cheon}천` : ""} 원`;
}

export const seoulDateTime = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));

// 사장님 화면에서 쓰는 이름
export const OWNER_STATUS: Record<OrderStatus, string> = {
  pending: "새 주문",
  accepted: "수락함",
  making: "만드는 중",
  ready: "완성",
  picked_up: "픽업 완료",
  rejected: "거절함",
  canceled: "취소함",
};

export const SOURCES: Record<OrderSource, string> = {
  link: "링크",
  phone: "전화",
  kakao: "카톡",
  naver: "네이버",
  instagram: "인스타",
  walk_in: "방문",
};

export const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  unpaid: "입금 전",
  confirmed: "입금 확인",
  paid_onsite: "현장 결제",
  refunded: "환불함",
};

export const REJECT_REASONS = [
  "그 시간은 주문이 다 찼어요",
  "원하는 색감의 꽃이 없어요",
  "그날은 주문을 받기 어려워요",
];
