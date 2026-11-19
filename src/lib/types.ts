// RPC가 돌려주는 JSON 모양. 테이블 타입은 `npm run db:types`로 생성한 database.types.ts를 쓴다.

export type ColorKey = "pink" | "white" | "red" | "yellow" | "purple" | "any";
export type BouquetSize = "S" | "M" | "L";

export type OrderStatus =
  "pending" | "accepted" | "making" | "ready" | "picked_up" | "rejected" | "canceled";

export type PaymentMethod = "transfer" | "kakaopay" | "toss" | "onsite";
export type PaymentStatus = "unpaid" | "confirmed" | "paid_onsite" | "refunded";

export interface ShopSample {
  id: string;
  image_path: string;
  title: string;
  budget_hint: number | null;
  color_key: ColorKey | null;
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
  samples: ShopSample[];
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
