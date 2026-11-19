import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// 실행: npm run test:db
// 실제 Supabase 대신 PGlite(브라우저/Node용 Postgres)에 auth, storage를 흉내 내서
// 마이그레이션, RPC 규칙, RLS가 의도대로 동작하는지 확인한다.
const root = process.cwd();
const db = new PGlite();

// Supabase 환경 흉내: roles, auth, storage
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
`);

const migDir = join(root, "supabase/migrations");
for (const f of readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  await db.exec(readFileSync(join(migDir, f), "utf8"));
}
await db.exec(readFileSync(`${root}/supabase/seed.sql`, "utf8"));
console.log("migration + seed OK");

let pass = 0,
  fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`);
};
const expectErr = async (name, sql, params, code) => {
  try {
    await db.query(sql, params);
    ok(name, false, "(no error)");
  } catch (e) {
    ok(name, e.message.includes(code), `→ ${e.message}`);
  }
};

// 내일 서울 기준 날짜 (월요일 휴무 등 없음)
const {
  rows: [{ d }],
} = await db.query(`select ((now() at time zone 'Asia/Seoul')::date + 1)::text as d`);
const at = (hhmm) => `${d} ${hhmm}:00+09`;

const shop = (await db.query(`select public.get_shop_public('bomnal') as j`)).rows[0].j;
ok("get_shop_public returns shop", shop?.name === "봄날 꽃방" && shop.samples.length === 3);
ok("get_shop_public hides bank account", !JSON.stringify(shop).includes("000-0000-0000"));

const slots = (await db.query(`select * from public.get_available_slots('bomnal', $1::date)`, [d]))
  .rows;
ok("slots for tomorrow", slots.length === 10, `count=${slots.length}`);

const order = (
  await db.query(
    `select public.create_order('bomnal', $1::timestamptz, 'pink', 'M', 50000, '홍길동', '010-1234-5678', 'transfer', '생일', '카드 넣어주세요') as j`,
    [at("11:00")],
  )
).rows[0].j;
ok("create_order returns token", !!order?.public_token);

const view = (
  await db.query(`select public.get_order_by_token($1::uuid) as j`, [order.public_token])
).rows[0].j;
ok(
  "get_order_by_token",
  view?.status === "pending" &&
    view.type === "reservation" &&
    view.shop.bank_account === "000-0000-0000",
);

for (let i = 0; i < 2; i++) {
  await db.query(
    `select public.create_order('bomnal', $1::timestamptz, 'white', 'S', 30000, '손님', '01011112222')`,
    [at("11:00")],
  );
}
await expectErr(
  "slot_full after 3 orders",
  `select public.create_order('bomnal', $1::timestamptz, 'white', 'S', 30000, '손님', '01011112222')`,
  [at("11:00")],
  "slot_full",
);
const slots2 = (await db.query(`select * from public.get_available_slots('bomnal', $1::date)`, [d]))
  .rows;
ok("full slot hidden", slots2.length === 9);

await expectErr(
  "budget below minimum",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 10000, '손님', '01011112222')`,
  [at("12:00")],
  "budget_below_minimum",
);
await expectErr(
  "misaligned slot",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '01011112222')`,
  [at("12:30")],
  "invalid_slot",
);
await expectErr(
  "outside hours",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '01011112222')`,
  [at("21:00")],
  "outside_hours",
);
await expectErr(
  "bad phone",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '1234')`,
  [at("12:00")],
  "invalid_phone",
);
await expectErr(
  "unknown shop",
  `select public.create_order('nope', $1::timestamptz, 'pink', 'S', 30000, '손님', '01011112222')`,
  [at("12:00")],
  "shop_not_found",
);
await expectErr(
  "too far ahead",
  `select public.create_order('bomnal', now() + interval '60 days', 'pink', 'S', 30000, '손님', '01011112222')`,
  [],
  "date_out_of_range",
);
await expectErr(
  "same day too soon",
  `select public.create_order('bomnal', date_trunc('hour', now()) + interval '1 hour', 'pink', 'S', 30000, '손님', '01011112222')`,
  [],
  "",
);

ok(
  "payment_methods lists only what the shop offers",
  JSON.stringify(shop.payment_methods) === JSON.stringify(["transfer", "onsite"]),
  JSON.stringify(shop.payment_methods),
);
await expectErr(
  "payment method the shop does not offer",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '01011112222', 'kakaopay')`,
  [at("13:00")],
  "payment_method_unavailable",
);

// RLS
const owner = "11111111-1111-1111-1111-111111111111",
  other = "22222222-2222-2222-2222-222222222222";
await db.exec(
  `insert into auth.users values ('${owner}'), ('${other}'); update public.shops set owner_id = '${owner}' where slug = 'bomnal';`,
);

await db.exec(`set role anon`);
try {
  await db.query(`select * from public.orders`);
  ok("anon cannot read orders", false);
} catch (e) {
  ok("anon cannot read orders", /permission denied/.test(e.message));
}
try {
  await db.query(`select * from public.shops`);
  ok("anon cannot read shops", false);
} catch (e) {
  ok("anon cannot read shops", /permission denied/.test(e.message));
}
const anonView = (
  await db.query(`select public.get_order_by_token($1::uuid) as j`, [order.public_token])
).rows[0].j;
ok("anon can read own order by token", anonView?.order_no === order.order_no);
const anonShop = (await db.query(`select public.get_shop_public('bomnal') as j`)).rows[0].j;
ok("anon can read public shop", anonShop?.slug === "bomnal");
await db.exec(`reset role`);

await db.exec(
  `set role authenticated; select set_config('request.jwt.claim.sub', '${other}', false);`,
);
ok(
  "other owner sees 0 orders",
  (await db.query(`select count(*)::int c from public.orders`)).rows[0].c === 0,
);
ok(
  "other owner sees 0 shops",
  (await db.query(`select count(*)::int c from public.shops`)).rows[0].c === 0,
);
await db.exec(`select set_config('request.jwt.claim.sub', '${owner}', false);`);
ok(
  "owner sees own orders",
  (await db.query(`select count(*)::int c from public.orders`)).rows[0].c === 3,
);
const shopId = (await db.query(`select id from public.shops where slug='bomnal'`)).rows[0].id;
await db.query(
  `insert into public.orders (shop_id, source, type, pickup_at, color_key, size, budget, customer_name, customer_phone)
  values ($1, 'phone', 'reservation', $2::timestamptz, 'red', 'L', 70000, '전화손님', '01099998888')`,
  [shopId, at("15:00")],
);
ok("owner manual phone order", true);
try {
  await db.query(
    `insert into public.orders (shop_id, source, type, pickup_at, color_key, size, budget, customer_name, customer_phone)
    values ($1, 'link', 'reservation', $2::timestamptz, 'red', 'L', 70000, '가짜', '01099998888')`,
    [shopId, at("16:00")],
  );
  ok("owner cannot fake link order", false);
} catch (e) {
  ok("owner cannot fake link order", /row-level security/.test(e.message));
}
await db.query(
  `update public.orders set status = 'accepted', payment_status = 'confirmed' where public_token = $1`,
  [order.public_token],
);
ok("owner updates status", true);
await db.exec(`select set_config('request.jwt.claim.sub', '${other}', false);`);
const upd = await db.query(`update public.orders set status = 'rejected' returning id`);
ok("other owner cannot update", upd.rows.length === 0);
await db.exec(`reset role`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
