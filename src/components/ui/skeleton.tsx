// 내용이 들어올 자리를 회색 블록으로 먼저 보여준다. 스크린리더에는 숨긴다.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`bg-soft animate-pulse rounded-xl ${className}`} />;
}

/** 페이지 전체를 불러오는 동안 보여줄 뼈대. 스크린리더용 문장 하나만 읽힌다. */
export function PageSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4" aria-busy="true">
      <span className="sr-only">화면을 불러오고 있어요</span>
      {children}
    </main>
  );
}
