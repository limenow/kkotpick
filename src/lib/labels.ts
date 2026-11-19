import type { BouquetSize, ColorKey, OrderStatus, PaymentMethod } from "./types";

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  transfer: "계좌이체",
  kakaopay: "카카오페이 송금",
  toss: "토스 송금",
  onsite: "매장에서 결제",
};

export const PURPOSES = ["생일", "고백", "졸업", "감사", "기념일", "그냥"] as const;

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
  { key: "pending", label: "주문접수", desc: "꽃집에서 주문을 확인하고 있어요" },
  { key: "accepted", label: "꽃집 수락", desc: "꽃집이 주문을 받았어요" },
  { key: "making", label: "제작중", desc: "그날 들어온 꽃으로 만들고 있어요" },
  { key: "ready", label: "완성", desc: "사진 확인하고 받으러 오세요" },
  { key: "picked_up", label: "픽업완료", desc: "받아가셨어요. 좋은 하루 보내세요" },
];

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

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
