// create_order RPC가 던지는 에러 코드를 손님이 이해할 수 있는 말로 바꾼다.
const MESSAGES: Record<string, string> = {
  shop_not_found: "지금은 이 꽃집에서 주문을 받지 않아요.",
  date_out_of_range: "주문할 수 없는 날짜예요. 날짜를 다시 골라주세요.",
  shop_closed: "그날은 꽃집이 쉬는 날이에요. 다른 날짜를 골라주세요.",
  outside_hours: "영업시간이 아니에요. 다른 시간을 골라주세요.",
  invalid_slot: "고른 시간을 다시 확인해주세요.",
  same_day_disabled: "오늘은 당일 주문을 받지 않아요. 예약 주문으로 골라주세요.",
  too_soon: "그 시간은 준비가 어려워요. 조금 더 뒤 시간을 골라주세요.",
  color_unavailable: "오늘은 그 색감의 꽃이 없어요. 다른 색감을 골라주세요.",
  budget_below_minimum: "이 꽃집의 최소 예산보다 낮아요.",
  invalid_phone: "연락처를 다시 확인해주세요. 예) 010-1234-5678",
  invalid_name: "주문하시는 분 이름을 적어주세요.",
  slot_full: "방금 그 시간이 마감됐어요. 다른 시간을 골라주세요.",
  payment_method_unavailable: "이 꽃집에서 받지 않는 결제 방법이에요.",
};

export function orderErrorMessage(raw: string | undefined): string {
  if (raw) {
    for (const code of Object.keys(MESSAGES)) {
      if (raw.includes(code)) return MESSAGES[code];
    }
  }
  return "주문을 넣지 못했어요. 잠시 뒤에 다시 시도해주세요.";
}
