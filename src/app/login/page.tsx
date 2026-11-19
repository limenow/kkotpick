import type { Metadata } from "next";
import Link from "next/link";
import { LoginFlow } from "./login-flow";

export const metadata: Metadata = { title: "사장님 로그인 · 꽃픽" };

// 로컬 Supabase가 받은 메일을 보여주는 주소 (supabase start가 띄운다)
const LOCAL_MAILBOX = process.env.NODE_ENV === "development" ? "http://127.0.0.1:54324" : undefined;

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 pt-4 pb-40">
      <Link href="/" className="text-rose flex min-h-11 items-center text-lg font-bold">
        꽃픽 <span className="text-muted ml-1 text-sm font-medium">파트너</span>
      </Link>
      <LoginFlow mailboxUrl={LOCAL_MAILBOX} />
    </main>
  );
}
