import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SampleImage } from "@/components/sample-image";
import { FloatingOrder } from "./floating-order";
import { AccordionItem } from "@/components/ui/accordion";
import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/supabase/storage";
import { COLORS, manwon } from "@/lib/labels";
import type { PublicShop } from "@/lib/types";

// 손님이 꽃집 링크·QR로 처음 들어오는 화면 (디자인: 1. 꽃집 페이지)
export default function ShopPage(props: PageProps<"/s/[slug]">) {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <ShopContent params={props.params} />
    </Suspense>
  );
}

function ShopSkeleton() {
  return (
    <PageSkeleton>
      <Skeleton className="h-56 rounded-none" />
      <div className="flex flex-col gap-3 px-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="mt-2 h-24" />
      </div>
    </PageSkeleton>
  );
}

const SECTIONS = [
  { id: "mood", label: "분위기" },
  { id: "info", label: "주문 안내" },
  { id: "faq", label: "자주 묻는 질문" },
];

async function ShopContent({ params }: { params: PageProps<"/s/[slug]">["params"] }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shop_public", { p_slug: slug });

  if (error) throw error;
  const shop = data as PublicShop | null;
  if (!shop) notFound();

  const orderHref = `/s/${shop.slug}/order`;
  const leadHours = shop.same_day_lead_minutes / 60;

  return (
    <main className="mx-auto w-full max-w-md pb-32">
      <FloatingOrder href={orderHref} watchId="hero-cta" />
      {/* 스티키 헤더: 가게 이름만. 주문 버튼은 위 버튼이 지나가면 아래에 뜬다 (FloatingOrder) */}
      <header className="border-line bg-ground/95 sticky top-0 z-20 flex h-14 items-center border-b px-5 backdrop-blur">
        <span className="text-rose font-bold">{shop.name}</span>
      </header>

      {/* 히어로 */}
      <section aria-labelledby="hero-title">
        <div className="bg-rose-soft text-rose-dark flex h-48 items-center justify-center text-sm">
          매장 대표 사진
        </div>
        <div className="flex flex-col gap-3 px-5 pt-6">
          <span className="bg-sage-soft text-sage-dark self-start rounded-lg px-2 py-0.5 text-xs font-medium">
            실제 매장 · {shop.address ?? "포항"}
          </span>
          <h1 id="hero-title" className="text-[28px] leading-tight font-bold tracking-tight">
            꽃 이름 몰라도
            <br />
            괜찮아요
          </h1>
          <p className="text-muted leading-relaxed">
            색감이랑 예산만 고르면 그날 들어온 꽃으로 만들어 드려요. 다 만들면 사진을 먼저
            보내드려요.
          </p>
          <Link
            id="hero-cta"
            href={orderHref}
            className="bg-rose mt-1 flex min-h-14 items-center justify-center rounded-2xl text-lg font-bold text-white"
          >
            꽃다발 주문하기
          </Link>
          {shop.same_day_enabled && (
            <span className="text-muted text-center text-sm">
              오늘 받으려면 {leadHours}시간 전까지 주문해 주세요
            </span>
          )}
        </div>
      </section>

      {/* 앵커 링크 탭: 스티키 헤더 바로 아래에 붙는다 */}
      <nav
        aria-label="이 페이지 안 바로가기"
        className="border-line bg-ground/95 sticky top-14 z-10 mt-8 flex gap-1 overflow-x-auto border-b px-3 backdrop-blur"
      >
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="text-muted hover:text-ink flex min-h-11 shrink-0 items-center px-3 text-sm font-medium"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <section
        id="mood"
        aria-labelledby="mood-title"
        className="flex scroll-mt-28 flex-col gap-3 pt-6"
      >
        <div className="px-5">
          <h2 id="mood-title" className="font-bold">
            이 꽃집 분위기
          </h2>
          <p className="text-muted text-sm">
            예시 사진이에요. 그날 있는 꽃으로 이 느낌에 맞춰 만들어요.
          </p>
        </div>

        {/* 스크롤 스냅 갤러리: 옆으로 넘기면 사진이 한 장씩 맞춰 멈춘다 */}
        {shop.samples.length > 0 ? (
          <ul className="flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto scroll-smooth px-5 pb-2">
            {shop.samples.map((s) => (
              <li key={s.id} className="flex w-[70%] shrink-0 snap-start flex-col gap-1">
                <SampleImage
                  src={publicImageUrl("shop-images", s.image_path)}
                  alt={s.title}
                  tint={s.color_key ? `${COLORS[s.color_key].hex}55` : "#FBE9EE"}
                />
                <span className="text-sm font-medium">{s.title}</span>
                {s.budget_hint && (
                  <span className="text-muted text-xs">{manwon(s.budget_hint)}대 예시</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted px-5 text-sm">아직 올라온 사진이 없어요.</p>
        )}

        <div className="flex flex-col gap-2 px-5 pt-3">
          <h3 className="text-sm font-bold">오늘 들어온 색감</h3>
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
        </div>
      </section>

      <section
        id="info"
        aria-labelledby="info-title"
        className="flex scroll-mt-28 flex-col gap-3 px-5 pt-10"
      >
        <h2 id="info-title" className="font-bold">
          주문 안내
        </h2>
        <dl className="border-line bg-surface grid grid-cols-2 gap-3 rounded-2xl border p-4">
          <Info
            label="영업시간"
            value={`${shop.open_time.slice(0, 5)} - ${shop.close_time.slice(0, 5)}`}
          />
          <Info label="예산" value={`${manwon(shop.min_budget)}부터`} />
          <Info
            label="오늘 받기"
            value={shop.same_day_enabled ? `${leadHours}시간 전까지 주문` : "날짜를 정해서 주문"}
          />
          <Info label="날짜 정하기" value={`${shop.reservation_max_days}일 뒤까지`} />
        </dl>
      </section>

      <section
        id="faq"
        aria-labelledby="faq-title"
        className="flex scroll-mt-28 flex-col gap-2.5 px-5 pt-10"
      >
        <h2 id="faq-title" className="mb-1 font-bold">
          자주 묻는 질문
        </h2>
        <AccordionItem title="사진이랑 똑같이 나오나요?">
          <p className="text-muted text-sm leading-relaxed">
            꽃은 그날 들어온 것으로 만들어서 종류는 조금 달라질 수 있어요. 고른 색감과 크기,
            분위기는 맞춰 드리고, 다 만들면 사진을 먼저 보내드려요.
          </p>
        </AccordionItem>
        <AccordionItem title="결제는 어떻게 하나요?">
          <p className="text-muted text-sm leading-relaxed">
            꽃집 계좌로 보내거나 매장에서 결제하면 돼요. 꽃픽은 돈을 받지 않아요.
          </p>
        </AccordionItem>
        <AccordionItem title="주문을 바꾸거나 취소하고 싶어요">
          <p className="text-muted text-sm leading-relaxed">
            주문하고 받은 문자에 꽃집 번호가 있어요. 꽃집에 바로 전화해 주세요.
          </p>
        </AccordionItem>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
