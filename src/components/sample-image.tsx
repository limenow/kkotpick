"use client";

import { useEffect, useRef, useState } from "react";

// 샘플 사진. 아직 안 올렸거나 불러오지 못하면 깨진 그림 대신 색 블록을 보여준다.
export function SampleImage({ src, alt, tint }: { src: string; alt: string; tint: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // 하이드레이션 전에 이미 실패한 이미지는 onError가 다시 오지 않아서 직접 확인한다.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} (사진 준비 중)`}
        className="flex aspect-[4/5] w-full items-end rounded-2xl p-4 text-sm text-[#5C5049]"
        style={{ background: tint }}
      >
        사진 준비 중
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 스토리지 이미지, 나중에 next/image로 교체
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="bg-rose-soft aspect-[4/5] w-full rounded-2xl object-cover"
    />
  );
}
