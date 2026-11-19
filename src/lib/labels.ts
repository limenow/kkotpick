import type { BouquetSize, ColorKey, OrderStatus } from "./types";

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
export const STATUS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "주문접수" },
  { key: "accepted", label: "꽃집 수락" },
  { key: "making", label: "제작중" },
  { key: "ready", label: "완성" },
  { key: "picked_up", label: "픽업완료" },
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
