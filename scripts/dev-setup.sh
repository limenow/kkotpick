#!/usr/bin/env bash
# 로컬 개발 환경을 한 번에 세팅한다: 패키지 설치 → 로컬 Supabase 실행 → .env.local 작성 → DB 초기화
# 실행: bash scripts/dev-setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf '\n\033[1;35m▶ %s\033[0m\n' "$1"; }
fail() { printf '\n\033[1;31m✗ %s\033[0m\n' "$1"; exit 1; }

say "준비물 확인"
command -v node >/dev/null || fail "Node가 없어요. https://nodejs.org 에서 LTS를 설치하고 다시 실행해주세요."
major=$(node -p 'process.versions.node.split(".")[0]')
[ "$major" -ge 20 ] || fail "Node $major 버전이에요. 20 이상이 필요해요. https://nodejs.org 에서 LTS를 설치해주세요."
command -v docker >/dev/null || fail "Docker가 없어요. Docker Desktop을 설치하고 실행한 뒤 다시 실행해주세요. https://www.docker.com/products/docker-desktop/"
docker info >/dev/null 2>&1 || fail "Docker Desktop이 꺼져 있어요. 앱을 켜고 메뉴바 고래 아이콘이 멈추면 다시 실행해주세요."
echo "Node $(node -v), Docker OK"

say "패키지 설치 (npm install)"
npm install

say "로컬 Supabase 실행 (처음엔 몇 분 걸려요)"
npx supabase start

say ".env.local 작성"
status_env=$(npx supabase status -o env)
[ -f .env.local ] || cp .env.example .env.local
STATUS_ENV="$status_env" node -e '
  const fs = require("fs");
  const vars = Object.fromEntries(
    process.env.STATUS_ENV.split("\n")
      .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]]),
  );
  const url = vars.API_URL;
  const key = vars.PUBLISHABLE_KEY || vars.ANON_KEY;
  const secret = vars.SECRET_KEY || vars.SERVICE_ROLE_KEY || "";
  if (!url || !key) { console.error("supabase status에서 URL이나 키를 못 찾았어요:\n" + process.env.STATUS_ENV); process.exit(1); }
  let env = fs.readFileSync(".env.local", "utf8");
  const set = (k, v) => {
    const re = new RegExp("^" + k + "=.*$", "m");
    env = re.test(env) ? env.replace(re, k + "=" + v) : env + "\n" + k + "=" + v + "\n";
  };
  set("NEXT_PUBLIC_SUPABASE_URL", url);
  set("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key);
  if (secret) set("SUPABASE_SECRET_KEY", secret);
  fs.writeFileSync(".env.local", env);
  console.log("NEXT_PUBLIC_SUPABASE_URL=" + url);
'

say "DB 초기화 (마이그레이션 + 데모 꽃집)"
npx supabase db reset

say "끝! 이제 npm run dev 를 실행하고 http://localhost:3000/s/bomnal 을 열어보세요."
