"use client";

import { useActionState, useState } from "react";
import { BottomCTA, ctaClass } from "@/components/ui/bottom-cta";
import { connectShop, type ConnectState } from "../actions";

export function ConnectForm() {
  const [state, action, pending] = useActionState<ConnectState, FormData>(connectShop, {});
  const [code, setCode] = useState("");

  return (
    <form action={action} className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-[26px] leading-snug font-bold">
          꽃픽에서 받은
          <br />
          연결 코드를 넣어주세요
        </h1>
        <p className="text-muted text-[15px]">
          코드를 넣으면 이 계정으로 꽃집 주문을 받을 수 있어요.
        </p>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-muted text-sm">연결 코드 8자리</span>
        <input
          name="code"
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={8}
          value={code}
          onChange={(e) =>
            setCode(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 8),
            )
          }
          placeholder="ABCD1234"
          aria-invalid={Boolean(state.error) || undefined}
          className="border-line focus:border-rose border-b-2 bg-transparent py-2 text-[26px] font-bold tracking-[0.2em] outline-none placeholder:font-normal placeholder:tracking-[0.2em] placeholder:text-[#D9CFC8]"
        />
        {state.error && (
          <span role="alert" className="text-rose text-sm">
            {state.error}
          </span>
        )}
      </label>
      <BottomCTA hint="코드가 없으면 꽃픽에 문의해주세요.">
        <button type="submit" disabled={code.length !== 8 || pending} className={ctaClass}>
          {pending ? "연결하는 중…" : "꽃집 연결하기"}
        </button>
      </BottomCTA>
    </form>
  );
}
