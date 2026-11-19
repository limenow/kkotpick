// RPC가 돌려주는 JSON 모양. 테이블 타입은 `npm run db:types`로 생성한 database.types.ts를 쓴다.

export type ColorKey = "pink" | "white" | "red" | "yellow" | "purple" | "any";
export type BouquetSize = "S" | "M" | "L";

export type OrderStatus =
  "pending" | "accepted" | "making" | "ready" | "picked_up" | "rejected" | "canceled";

export type OrderSource = "link" | "phone" | "kakao" | "naver" | "instagram" | "walk_in";

export type PaymentMethod = "transfer" | "kakaopay" | "toss" | "onsite";
export type PaymentStatus = "unpaid" | "confirmed" | "paid_onsite" | "refunded";

export interface ShopSample {
  id: string;
  image_path: string;
  title: string;
  budget_hint: number | null;
  color_key: ColorKey | null;
  mood: string | null;
}

export interface PublicShop {
  slug: string;
  name: string;
  intro: string | null;
  address: string | null;
  tags: string[];
  open_time: string;
  close_time: string;
  closed_weekdays: number[];
  min_budget: number;
  same_day_enabled: boolean;
  same_day_lead_minutes: number;
  reservation_max_days: number;
  slot_minutes: number;
  available_colors: ColorKey[];
  payment_methods: PaymentMethod[];
  samples: ShopSample[];
}

export interface Slot {
  slot_start: string;
  remaining: number;
}

export interface OrderView {
  order_no: number;
  status: OrderStatus;
  type: "same_day" | "reservation";
  pickup_at: string;
  color_key: ColorKey;
  size: BouquetSize;
  budget: number;
  extra_amount: number;
  purpose: string | null;
  recipient: string | null;
  mood: string | null;
  request_note: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  reject_reason: string | null;
  created_at: string;
  shop: {
    name: string;
    slug: string;
    address: string | null;
    phone: string | null;
    bank_name: string | null;
    bank_account: string | null;
    bank_holder: string | null;
    kakaopay_link: string | null;
    toss_link: string | null;
  };
  photos: string[];
}

// 사장님 주문 목록 한 줄
export interface OwnerOrder {
  id: string;
  order_no: number;
  source: OrderSource;
  type: "same_day" | "reservation";
  status: OrderStatus;
  pickup_at: string;
  color_key: ColorKey;
  size: BouquetSize;
  budget: number;
  purpose: string | null;
  recipient: string | null;
  mood: string | null;
  request_note: string | null;
  customer_name: string;
  customer_phone: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  reject_reason: string | null;
  created_at: string;
}
