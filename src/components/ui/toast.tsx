"use client";

import { createContext, use, useCallback, useEffect, useRef, useState } from "react";

// 화면 아래에 잠깐 떴다 사라지는 알림. 되돌리기 버튼을 붙일 수 있다.
interface ToastInput {
  message: string;
  action?: { label: string; onClick: () => void };
  /** 보여줄 시간(ms). 되돌리기가 있으면 기본 5초, 없으면 2.5초 */
  duration?: number;
}
interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

export function useToast() {
  const show = use(ToastContext);
  if (!show) throw new Error("ToastProvider 안에서만 쓸 수 있어요");
  return show;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((t: ToastInput) => {
    clearTimeout(timer.current);
    const id = Date.now();
    setItem({ ...t, id });
    timer.current = setTimeout(
      () => setItem((cur) => (cur?.id === id ? null : cur)),
      t.duration ?? (t.action ? 5000 : 2500),
    );
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)]"
      >
        {item && (
          <div
            key={item.id}
            role="status"
            className="bg-ink/95 pointer-events-auto flex w-full max-w-md animate-[toast-in_180ms_ease-out] items-center gap-3 rounded-2xl px-5 py-4 text-[15px] text-white shadow-lg"
          >
            <span className="flex-1">{item.message}</span>
            {item.action && (
              <button
                type="button"
                onClick={() => {
                  item.action?.onClick();
                  setItem(null);
                }}
                className="-my-2 min-h-11 shrink-0 px-2 font-bold text-[#FFB3C8]"
              >
                {item.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext>
  );
}
