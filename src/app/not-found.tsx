import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-5 py-20">
      <h1 className="text-2xl font-bold">찾는 화면이 없어요</h1>
      <p className="text-muted leading-relaxed">
        주소가 바뀌었거나 꽃집이 주문을 쉬고 있을 수 있어요. 문자로 받은 링크라면 처음부터 다시 눌러
        주세요.
      </p>
      <Link
        href="/"
        className="border-line bg-surface flex min-h-13 items-center justify-center rounded-2xl border"
      >
        꽃픽 첫 화면으로 가기
      </Link>
    </main>
  );
}
