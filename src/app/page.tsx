import Link from "next/link";

// 임시 첫 화면. 손님은 꽃집 링크(/s/[slug])로 바로 들어오고, 여기는 사장님 소개 페이지 자리다.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-5 py-16">
      <span className="text-rose text-xl font-bold">꽃픽</span>
      <h1 className="text-3xl leading-snug font-bold tracking-tight">
        졸업 시즌, 카톡 상담하느라
        <br />꽃 만들 시간 없으셨죠?
      </h1>
      <p className="text-muted text-lg leading-relaxed">
        손님이 색감, 예산, 픽업 시간을 직접 골라서 주문서로 보내드려요.
      </p>
      <Link
        href="/s/bomnal"
        className="bg-rose flex min-h-14 items-center justify-center rounded-2xl text-lg font-bold text-white"
      >
        데모 꽃집 보기
      </Link>
    </main>
  );
}
