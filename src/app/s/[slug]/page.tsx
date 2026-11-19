import { Suspense } from "react";
import { PageLoading } from "@/components/page-loading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/supabase/storage";
import { COLORS, won } from "@/lib/labels";
import type { PublicShop } from "@/lib/types";

// 손님이 꽃집 링크·QR로 처음 들어오는 화면 (디자인: 1. 꽃집 페이지)
export default function ShopPage(props: PageProps<"/s/[slug]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ShopContent params={props.params} />
    </Suspense>
  );
}

async function ShopContent({ params }: { params: PageProps<"/s/[slug]">["params"] }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shop_public", { p_slug: slug });

  if (error) throw error;
  const shop = data as PublicShop | null;
  if (!shop) notFound();

  return (
    <main className="mx-auto w-full max-w-md pb-32">
      <div className="bg-rose-soft text-rose-dark flex h-48 items-center justify-center text-sm">
        매장 대표 사진
      </div>

      <section className="flex flex-col gap-3 px-5 pt-6">
        <div className="flex items-center gap-2">
          <span className="text-rose font-bold">{shop.name}</span>
          <span className="bg-sage-soft text-sage-dark rounded-lg px-2 py-0.5 text-xs font-medium">
            실제 매장
          </span>
        </div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight">
          꽃 이름 몰라도
          <br />
          괜찮아요
        </h1>
        <p className="text-muted leading-relaxed">
          색감이랑 예산만 고르면, 그날 가장 예쁜 꽃으로 만들어드려요.
        </p>
        <ul className="text-muted flex flex-wrap gap-1.5 text-xs">
          {shop.address && <li className="bg-soft rounded-lg px-2.5 py-1">{shop.address}</li>}
          <li className="bg-soft rounded-lg px-2.5 py-1">완성되면 사진 먼저 보내드려요</li>
          {shop.tags.length > 0 && (
            <li className="bg-soft rounded-lg px-2.5 py-1">
              {shop.tags.map((t) => `#${t}`).join(" ")}
            </li>
          )}
        </ul>
      </section>

      <section className="border-line bg-surface mx-5 mt-5 grid grid-cols-2 gap-3 rounded-2xl border p-4">
        <Info
          label="영업시간"
          value={`${shop.open_time.slice(0, 5)} - ${shop.close_time.slice(0, 5)}`}
        />
        <Info label="최소 예산" value={`${won(shop.min_budget)}부터`} />
        <Info
          label="당일 주문"
          value={
            shop.same_day_enabled
              ? `픽업 ${shop.same_day_lead_minutes / 60}시간 전까지`
              : "예약 주문만"
          }
        />
        <Info label="예약" value={`${shop.reservation_max_days}일 뒤까지`} />
      </section>

      <section className="flex flex-col gap-3 px-5 pt-6">
        <h2 className="font-bold">오늘 가능한 색감</h2>
        <ul className="flex flex-wrap gap-4">
          {shop.available_colors.map((key) => (
            <li key={key} className="flex flex-col items-center gap-1.5 text-xs">
              <span
                aria-hidden
                className="size-9 rounded-full border border-black/10"
                style={{ background: COLORS[key].hex }}
              />
              {COLORS[key].label}
            </li>
          ))}
        </ul>
      </section>

      {shop.samples.length > 0 && (
        <section className="flex flex-col gap-3 px-5 pt-6">
          <div>
            <h2 className="font-bold">이 꽃집 분위기</h2>
            <p className="text-muted text-sm">
              참고용 예시예요. 그날 있는 꽃으로 이 느낌에 맞춰 만들어요.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {shop.samples.map((s) => (
              <li key={s.id} className="flex flex-col gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- 스토리지 이미지, 나중에 next/image로 교체 */}
                <img
                  src={publicImageUrl("shop-images", s.image_path)}
                  alt={s.title}
                  loading="lazy"
                  className="bg-rose-soft aspect-square w-full rounded-xl object-cover"
                />
                <span className="text-sm font-medium">{s.title}</span>
                {s.budget_hint && (
                  <span className="text-muted text-xs">{won(s.budget_hint)}대 예시</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="border-line bg-surface fixed inset-x-0 bottom-0 border-t px-5 pt-3 pb-6">
        <div className="mx-auto flex max-w-md flex-col gap-1.5">
          <Link
            href={`/s/${shop.slug}/order`}
            className="bg-rose flex min-h-14 items-center justify-center rounded-2xl text-lg font-bold text-white"
          >
            꽃다발 주문하기
          </Link>
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted text-xs">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
