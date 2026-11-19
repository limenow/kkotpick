"use client";

// 화면을 그리다 서버나 네트워크에서 문제가 생겼을 때. 내부 오류 내용은 보여주지 않는다.
export default function Error({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-5 py-20">
      <h1 className="text-2xl font-bold">화면을 불러오지 못했어요</h1>
      <p className="text-muted leading-relaxed">인터넷 연결을 확인하고 다시 불러와 주세요.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="bg-rose min-h-13 rounded-2xl font-bold text-white"
      >
        다시 불러오기
      </button>
    </main>
  );
}
