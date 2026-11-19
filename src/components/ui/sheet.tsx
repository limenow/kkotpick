"use client";

import { useEffect, useRef } from "react";

// 아래에서 올라오는 확인 창. 넓은 화면에선 가운데 창으로 보인다.
// 바깥(어두운 곳)을 누르거나 Esc를 누르면 닫힌다.
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="sheet-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="bg-surface text-ink fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[90dvh] w-full max-w-md rounded-t-3xl p-0 backdrop:bg-black/40 open:animate-[sheet-up_200ms_ease-out] md:top-0 md:m-auto md:rounded-3xl"
    >
      <div className="flex flex-col gap-5 px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] md:pt-6">
        <span aria-hidden className="bg-line mx-auto h-1 w-10 rounded-full md:hidden" />
        <div className="flex flex-col gap-2">
          <h2 id="sheet-title" className="text-[22px] leading-snug font-bold">
            {title}
          </h2>
          {description && (
            <div className="text-muted text-[15px] leading-relaxed">{description}</div>
          )}
        </div>
        {children}
      </div>
    </dialog>
  );
}
