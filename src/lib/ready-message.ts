// 완성 사진과 함께 손님에게 보내는 멘트. 꽃집마다 영업 설정에서 바꿀 수 있다.

export const READY_MESSAGE_FIELDS = ["{이름}", "{시간}", "{가게}", "{주문링크}"] as const;

export const DEFAULT_READY_MESSAGE =
  "{이름} 님, 주문하신 꽃다발이 완성됐어요.\n{시간}에 {가게}로 찾으러 오세요.\n주문 내용 보기: {주문링크}";

export function fillReadyMessage(
  template: string | null | undefined,
  v: { name: string; time: string; shop: string; link: string },
) {
  return (template?.trim() || DEFAULT_READY_MESSAGE)
    .replaceAll("{이름}", v.name)
    .replaceAll("{시간}", v.time)
    .replaceAll("{가게}", v.shop)
    .replaceAll("{주문링크}", v.link);
}
