export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase 환경변수가 없어요. .env.example을 .env.local로 복사하고 값을 채워주세요.",
    );
  }
  return { url, key };
}
