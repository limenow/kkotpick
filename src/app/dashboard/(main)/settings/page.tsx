import { Suspense } from "react";
import Link from "next/link";
import { requireShop } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "../../actions";
import { ReadyMessageForm } from "./ready-message-form";
import { AlertSetup } from "../alert-setup";

// TODO(영업 설정): 영업시간, 당일 주문, 시간대별 최대 주문 수, 주문 링크·QR (디자인: D. 영업 설정)
export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 pt-6 pb-24 md:px-8">
      <h1 className="text-[24px] font-bold">영업 설정</h1>
      <Suspense fallback={<Skeleton className="h-40 w-full rounded-3xl" />}>
        <Settings />
      </Suspense>
    </main>
  );
}

async function Settings() {
  const { shop, user } = await requireShop();
  return (
    <>
      <section className="bg-surface border-line flex flex-col gap-1 rounded-3xl border p-5">
        <span className="text-lg font-bold">{shop.name}</span>
        <span className="text-muted text-sm">{user.email}로 로그인했어요</span>
        <Link
          href={`/s/${shop.slug}`}
          target="_blank"
          className="text-rose mt-2 text-[15px] font-semibold"
        >
          손님 화면 보기 ↗
        </Link>
      </section>
      <AlertSetup />
      <ReadyMessageForm initial={shop.ready_message} shopName={shop.name} />
      <p className="text-muted text-[15px]">
        영업시간, 시간대별 주문 수, 계좌 정보는 다음 업데이트에서 여기서 바꿀 수 있어요. 지금은
        꽃픽에 말씀해 주세요.
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="bg-soft text-ink min-h-13 w-full rounded-2xl text-[16px] font-semibold"
        >
          로그아웃
        </button>
      </form>
    </>
  );
}
