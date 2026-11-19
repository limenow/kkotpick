// 화면 아래에 붙는 큰 버튼 자리. 위에 짧은 안내를 얹을 수 있다.
export function BottomCTA({
  hint,
  children,
}: {
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="from-ground via-ground fixed inset-x-0 bottom-0 z-20 bg-linear-to-t from-60% to-transparent pt-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {hint && <div className="text-muted text-center text-sm">{hint}</div>}
        {children}
      </div>
    </div>
  );
}

// 토스처럼 화면 폭을 꽉 채우는 큰 버튼
export const ctaClass =
  "bg-rose disabled:bg-rose/35 active:bg-rose-dark flex min-h-14 w-full items-center justify-center rounded-2xl text-[17px] font-bold text-white transition-colors";
export const ctaSecondaryClass =
  "bg-soft active:bg-line text-ink flex min-h-14 w-full items-center justify-center rounded-2xl text-[17px] font-bold transition-colors";
