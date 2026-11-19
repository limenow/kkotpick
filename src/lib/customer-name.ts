// 주문하는 분 이름 검사. 한글 이름이나 영어 이름만 받는다.
// DB(create_order)에서도 같은 규칙으로 한 번 더 막는다.

const HANGUL = /^[가-힣]+( [가-힣]+)?$/; // 남궁 민수처럼 띄어 쓴 것까지
const LATIN = /^[A-Za-z]+(?:\.? [A-Za-z]+|['.-][A-Za-z]+)*$/; // Mary-Jane O'Neil, J. Kim
const JAMO = /[ㄱ-ㅎㅏ-ㅣ]/;

/** 앞뒤 공백을 지우고 여러 칸 띄운 것을 한 칸으로 */
export function normalizeName(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

/** 문제가 없으면 null, 있으면 손님에게 보여줄 안내 */
export function nameProblem(raw: string): string | null {
  const name = normalizeName(raw);
  if (!name) return "이름을 적어주세요";
  if (/\d/.test(name)) return "이름에는 숫자를 쓸 수 없어요";
  if (JAMO.test(name)) return "글자를 끝까지 완성해주세요";

  const letters = name.replace(/[ '.-]/g, "");
  const repeated = /^(.)\1+$/u.test(letters); // 가가가, aaa

  if (HANGUL.test(name)) {
    if (letters.length < 2) return "이름을 두 글자 이상 적어주세요";
    if (letters.length > 10) return "이름이 너무 길어요";
    return repeated ? "실제 이름을 적어주세요" : null;
  }
  if (LATIN.test(name)) {
    if (letters.length < 2) return "이름을 두 글자 이상 적어주세요";
    if (name.length > 30) return "이름이 너무 길어요";
    return repeated ? "실제 이름을 적어주세요" : null;
  }
  if (/[가-힣]/.test(name) && /[A-Za-z]/.test(name)) {
    return "한글이나 영어 중 하나로 적어주세요";
  }
  return "이름에는 한글이나 영어만 쓸 수 있어요";
}
