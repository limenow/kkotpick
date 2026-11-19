import Link from "next/link";
import { AccordionItem } from "@/components/ui/accordion";
import { SiteHeader } from "@/components/site-header";

// 사장님 입점 소개 페이지. 손님은 꽃집 링크(/s/[slug])로 바로 들어온다.
const CONTACT_URL = process.env.NEXT_PUBLIC_CONTACT_URL;

const PROBLEMS = [
  {
    title: "주문이 여기저기 흩어져요",
    body: "전화, 카톡, 네이버 예약, 인스타 DM. 어디서 받은 주문인지 메모를 뒤져야 해요.",
  },
  {
    title: "같은 질문에 계속 답해요",
    body: "얼마인지, 무슨 색이 되는지, 몇 시까지 되는지. 꽃을 잘 모르는 손님일수록 상담이 길어져요.",
  },
  {
    title: "몰리는 시간을 막기 어려워요",
    body: "졸업식 날 같은 시간에 주문이 몰려도, 이미 받은 주문은 거절하기 어려워요.",
  },
];

const SOLUTIONS = [
  {
    step: "01",
    title: "손님이 주문서를 채워서 보내요",
    body: "사장님 샘플 사진을 보고 색감, 크기, 예산, 받을 시간만 골라요. 꽃 종류는 그날 있는 꽃으로 사장님이 정하세요.",
  },
  {
    step: "02",
    title: "전화, 카톡 주문도 한 화면에",
    body: "링크로 들어온 주문은 바로, 전화나 카톡 주문은 직접 적어 넣어요. 날짜별, 시간대별로 모아서 보여요.",
  },
  {
    step: "03",
    title: "몰리는 시간은 닫고, 완성은 사진으로",
    body: "시간대마다 받을 주문 수를 정하면 꽉 찬 시간은 손님 화면에서 사라져요. 완성 사진을 올리면 손님에게 문자가 가요.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* 히어로 */}
        <section
          aria-labelledby="hero-title"
          className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-[1.2fr_1fr] md:py-24"
        >
          <div className="flex flex-col gap-5">
            <span className="bg-rose-soft text-rose self-start rounded-full px-3 py-1.5 text-sm font-bold">
              포항 꽃집 사장님을 위한 주문 도구
            </span>
            <h1
              id="hero-title"
              className="text-[32px] leading-tight font-bold tracking-tight md:text-5xl"
            >
              졸업 시즌, 카톡 상담하느라
              <br />꽃 만들 시간이 모자랐다면
            </h1>
            <p className="text-muted text-lg leading-relaxed">
              손님이 색감, 예산, 받을 시간을 골라서 주문서로 보내요. 전화나 카톡으로 받은 주문도 한
              화면에 모아요.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="#apply"
                className="bg-rose flex min-h-14 items-center rounded-2xl px-6 text-lg font-bold text-white"
              >
                무료로 써보기
              </a>
              <Link
                href="/s/bomnal"
                className="border-line bg-surface flex min-h-14 items-center rounded-2xl border px-6"
              >
                손님 화면 보기
              </Link>
            </div>
            <p className="text-muted text-sm">
              설치할 것 없음 · 결제는 사장님 계좌로 바로 · 네이버 예약과 같이 써도 돼요
            </p>
          </div>

          <div
            aria-hidden
            className="border-line bg-surface mx-auto flex w-full max-w-sm flex-col gap-3 rounded-3xl border p-5 shadow-[0_12px_32px_rgba(168,50,90,0.1)]"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">새 주문이 들어왔어요</span>
              <span className="bg-rose-soft text-rose rounded-lg px-2 py-0.5 text-xs font-bold">
                오늘 18:00
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["색감", "핑크"],
                ["크기", "M"],
                ["예산", "5만 원"],
                ["어떤 날", "졸업"],
              ].map(([k, v]) => (
                <div key={k} className="bg-ground flex flex-col gap-0.5 rounded-xl p-3">
                  <span className="text-muted text-xs">{k}</span>
                  <span className="font-bold">{v}</span>
                </div>
              ))}
            </div>
            <div className="bg-ground rounded-xl p-3 text-sm">리본은 흰색으로 해주세요</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="border-line flex min-h-11 items-center justify-center rounded-xl border">
                거절
              </span>
              <span className="bg-rose flex min-h-11 items-center justify-center rounded-xl font-bold text-white">
                수락
              </span>
            </div>
          </div>
        </section>

        <section
          id="problem"
          aria-labelledby="problem-title"
          className="border-line bg-surface scroll-mt-20 border-y"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16">
            <h2 id="problem-title" className="text-2xl font-bold md:text-3xl">
              바쁜 날일수록 이런 일이 생겨요
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {PROBLEMS.map((p) => (
                <div key={p.title} className="bg-ground flex flex-col gap-2 rounded-2xl p-6">
                  <h3 className="text-lg font-bold">{p.title}</h3>
                  <p className="text-muted leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="solution"
          aria-labelledby="solution-title"
          className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-8 py-16"
        >
          <div className="flex flex-col gap-2 px-5">
            <h2 id="solution-title" className="text-2xl font-bold md:text-3xl">
              꽃픽이 하는 일
            </h2>
            <p className="text-muted">
              손님을 대신 데려오는 앱이 아니에요. 사장님이 주문을 편하게 받게 돕는 도구예요.
            </p>
          </div>
          {/* 좁은 화면에선 옆으로 넘기는 카드(스크롤 스냅), 넓은 화면에선 3칸 */}
          <ol className="flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto scroll-smooth px-5 pb-2 md:grid md:grid-cols-3 md:overflow-visible">
            {SOLUTIONS.map((s) => (
              <li
                key={s.step}
                className="border-line bg-surface flex w-[82%] shrink-0 snap-center flex-col gap-3 rounded-2xl border p-6 md:w-auto"
              >
                <span className="text-rose text-sm font-bold">{s.step}</span>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="text-muted leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="start"
          aria-labelledby="start-title"
          className="border-line bg-surface scroll-mt-20 border-y"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16">
            <h2 id="start-title" className="text-2xl font-bold md:text-3xl">
              시작은 링크 하나면 돼요
            </h2>
            <ol className="grid gap-6 md:grid-cols-3">
              {[
                ["세팅은 저희가 해요", "샘플 사진, 영업시간, 최소 예산을 대신 넣어 드려요."],
                [
                  "링크와 QR을 걸어요",
                  "인스타 프로필, 네이버 플레이스, 카톡 채널, 매장 카운터에요.",
                ],
                ["주문서를 받아요", "폰이나 태블릿으로 수락하고, 다 만들면 사진만 올리세요."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-4">
                  <span className="bg-rose flex size-9 shrink-0 items-center justify-center rounded-full font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <p className="text-muted leading-relaxed">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="faq"
          aria-labelledby="faq-title"
          className="mx-auto flex max-w-3xl scroll-mt-20 flex-col gap-3 px-5 py-16"
        >
          <h2 id="faq-title" className="mb-2 text-2xl font-bold md:text-3xl">
            자주 묻는 질문
          </h2>
          <AccordionItem title="수수료가 있나요?">
            <p className="text-muted leading-relaxed">
              2월 졸업 시즌 파일럿 동안은 받지 않아요. 그다음은 써 보신 사장님들 의견을 듣고
              정할게요.
            </p>
          </AccordionItem>
          <AccordionItem title="결제는 어떻게 받나요?">
            <p className="text-muted leading-relaxed">
              손님이 사장님 계좌나 간편송금으로 바로 보내요. 저희를 거치지 않고, 매장 결제도 그대로
              돼요.
            </p>
          </AccordionItem>
          <AccordionItem title="네이버 예약을 이미 쓰고 있어요">
            <p className="text-muted leading-relaxed">
              같이 쓰셔도 돼요. 네이버로 들어온 주문도 꽃픽에 적어 두면 한 화면에서 시간대별로 볼 수
              있어요.
            </p>
          </AccordionItem>
          <AccordionItem title="사진이랑 다르다고 하면 어떡하죠?">
            <p className="text-muted leading-relaxed">
              주문할 때 &quot;분위기 기준이고 그날 꽃으로 바뀔 수 있다&quot;고 손님에게 먼저 알려요.
              다 만들면 사진을 보내서, 받기 전에 확인할 수 있어요.
            </p>
          </AccordionItem>
          <AccordionItem title="앱을 깔아야 하나요?">
            <p className="text-muted leading-relaxed">
              사장님도 손님도 설치할 게 없어요. 링크로 여는 웹이에요.
            </p>
          </AccordionItem>
        </section>

        <section
          id="apply"
          aria-labelledby="apply-title"
          className="bg-rose scroll-mt-20 text-white"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-16">
            <h2 id="apply-title" className="text-2xl font-bold md:text-3xl">
              2월 졸업 시즌에 먼저 써 보실래요?
            </h2>
            <p className="leading-relaxed opacity-90">
              포항 꽃집 몇 곳과 무료로 먼저 시작해요. 연락 주시면 매장으로 찾아가서 세팅해 드려요.
            </p>
            {CONTACT_URL ? (
              <a
                href={CONTACT_URL}
                className="text-rose flex min-h-14 items-center justify-center rounded-2xl bg-white text-lg font-bold"
              >
                신청하기
              </a>
            ) : (
              <p className="rounded-2xl bg-white/15 p-4 text-sm">
                신청 창구를 준비하고 있어요. 매장에 찾아가서 직접 안내해 드릴게요.
              </p>
            )}
          </div>
        </section>
      </main>
      <footer className="text-muted mx-auto flex max-w-6xl justify-between px-5 py-8 text-sm">
        <span>포항에서 한동대 학생이 만들고 있어요</span>
      </footer>
    </>
  );
}
