# 꽃픽

꽃 이름 몰라도 괜찮아요. 손님은 색감, 크기, 예산, 픽업 시간만 고르고, 동네 꽃집은 주문서로 받아서 만들고, 손님은 매장에서 픽업해요.

- 손님: 설치 없는 웹. 꽃집이 건 링크·QR로 들어와요.
- 꽃집: 링크 주문과 전화·카톡·네이버 주문을 한 화면에서 관리해요.
- 결제: 꽃픽은 돈을 받지 않아요. 손님이 꽃집 계좌나 간편송금으로 보내고 사장님이 확인해요.

## 스택

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage, RLS) · Vercel

## 처음 세팅

필요한 것: Node 22, Docker (로컬 Supabase용)

```bash
npm run setup           # 패키지 설치 → 로컬 Supabase 실행 → .env.local 작성 → DB 초기화(데모 꽃집 포함)
npm run dev             # http://localhost:3000/s/bomnal 에서 데모 꽃집 확인
```

`npm run setup`이 안 되면 직접:

```bash
npm install
cp .env.example .env.local
npm run db:start        # 끝나면 나오는 URL과 publishable key를 .env.local에 넣기
npm run db:reset
npm run dev
```

## 주요 화면

| 경로              | 화면                             |
| ----------------- | -------------------------------- |
| `/s/[slug]`       | 손님이 처음 보는 꽃집 페이지     |
| `/s/[slug]/order` | 주문서 (한 화면에 질문 하나씩)   |
| `/o/[token]`      | 손님 주문 상태 (알림 문자 링크)  |
| `/login`          | 사장님 로그인 (메일로 받은 코드) |
| `/dashboard`      | 사장님 주문 목록과 처리          |

### 사장님 화면 써보기 (로컬)

1. `/login`에서 아무 이메일이나 넣고 "코드 받기"
2. http://127.0.0.1:54324 (로컬 메일함)에서 6자리 코드 확인
3. 연결 코드 `BOMNAL24`를 넣으면 데모 꽃집 "봄날 꽃방"이 연결돼요
4. 손님 화면(`/s/bomnal/order`)에서 주문을 넣고 `/dashboard`에서 확인

## DB 규칙

- 스키마는 대시보드에서 클릭으로 바꾸지 않고 `supabase/migrations`에 SQL 파일로만 바꿔요.
  - 새 파일: `npm run db:new 이름` → SQL 작성 → `npm run db:reset`
- 바꾼 뒤에는 `npm run test:db`로 규칙(RLS, 주문 검사)이 깨지지 않았는지 확인해요. Docker 없이 돌아가요.
- 타입은 `npm run db:types`로 `src/lib/database.types.ts`를 만들어서 같이 써요.

보안 원칙:

- 손님(anon)은 테이블을 직접 읽거나 쓰지 않아요. `get_shop_public`, `get_available_slots`, `get_order_by_token` RPC로만 읽어요.
- 주문 넣기(`create_order`)는 브라우저에서 부를 수 없어요. 서버 액션이 서비스 키로 동의 여부와 IP 해시를 실어 불러요. 같은 기기는 한 시간에 10건, 같은 번호는 한 꽃집에 진행 중인 주문 3건까지예요.
- 가게는 꽃픽만 만들어요(서비스 키). 사장님은 연결 코드(`claim_shop`)로 자기 가게를 연결하고, 공개 여부·주소(slug)는 바꿀 수 없어요.
- 주문 상태는 `set_order_status`로 정해진 순서로만 바꿔요. 1분 안에는 `undo_order_status`로 되돌릴 수 있어요.
- 주문 조회는 추측할 수 없는 `public_token`(uuid)을 아는 사람만 할 수 있어요.
- 사장님은 RLS로 자기 가게 데이터만 봐요. 사장님이 직접 넣는 주문은 `source`가 `link`일 수 없어요.
- `SUPABASE_SECRET_KEY`는 서버에서만 쓰고 절대 `NEXT_PUBLIC_`을 붙이지 않아요.
- 배포한 Supabase 프로젝트에서는 Authentication > Emails의 Magic Link, Confirm signup 템플릿을 `supabase/templates/login-code.html` 내용으로 바꿔야 코드가 메일에 나와요.

## 작업 규칙

- `main`은 항상 배포 가능한 상태. 직접 푸시하지 않아요.
- 브랜치: `feat/order-form`, `fix/slot-count`처럼 영어로
- PR을 올리면 CI(lint, typecheck, DB 테스트, build)가 돌고, 상대방이 리뷰한 뒤 머지해요.

## 폰트

Pretendard (© Kil Hyung-jin, SIL Open Font License 1.1). 자주 쓰는 한글 2,350자와 영문만 남긴 서브셋을 `src/app/fonts`에 넣었어요.
