import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

// Pretendard (SIL OFL 1.1). 자주 쓰는 한글 2,350자 + 영문만 남긴 서브셋.
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  weight: "45 920",
  display: "swap",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  title: "꽃픽",
  description: "꽃 이름 몰라도 괜찮아요. 색감이랑 예산만 고르면 동네 꽃집이 만들어드려요.",
};

export const viewport: Viewport = {
  themeColor: "#A8325A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
