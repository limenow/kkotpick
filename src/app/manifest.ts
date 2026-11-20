import type { MetadataRoute } from "next";

// 사장님이 폰·태블릿 홈 화면에 "꽃픽 파트너"를 추가해 앱처럼 쓰게 한다.
// 아이폰은 홈 화면에 추가해야 푸시 알림을 받을 수 있다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "꽃픽 파트너",
    short_name: "꽃픽",
    description: "꽃집 주문을 한 화면에서 받고 처리해요",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#FFFBF7",
    theme_color: "#A8325A",
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
