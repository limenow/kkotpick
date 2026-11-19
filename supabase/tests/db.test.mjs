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
const H = "a".repeat(64); // 서버가 넘기는 기기 해시 흉내

const shop = (await db.query(`select public.get_shop_public('bomnal') as j`)).rows[0].j;
ok("get_shop_public returns shop", shop?.name === "봄날 꽃방" && shop.samples.length === 3);
ok("get_shop_public hides bank account", !JSON.stringify(shop).includes("000-0000-0000"));

const slots = (await db.query(`select * from public.get_available_slots('bomnal', $1::date)`, [d]))
  .rows;
ok("slots for tomorrow", slots.length === 10, `count=${slots.length}`);

const order = (
  await db.query(
    `select public.create_order('bomnal', $1::timestamptz, 'pink', 'M', 50000, '홍길동', '010-1234-5678', true, '${H}', 'transfer', '생일', '카드 넣어주세요') as j`,
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
    `select public.create_order('bomnal', $1::timestamptz, 'white', 'S', 30000, '손님', '01011112222', true, '${H}')`,
    [at("11:00")],
  );
}
await expectErr(
  "slot_full after 3 orders",
  `select public.create_order('bomnal', $1::timestamptz, 'white', 'S', 30000, '손님', '01011112222', true, '${H}')`,
  [at("11:00")],
  "slot_full",
);
const slots2 = (await db.query(`select * from public.get_available_slots('bomnal', $1::date)`, [d]))
  .rows;
ok("full slot hidden", slots2.length === 9);

await expectErr(
  "budget below minimum",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 10000, '손님', '01011112222', true, '${H}')`,
  [at("12:00")],
  "budget_below_minimum",
);
await expectErr(
  "misaligned slot",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '01011112222', true, '${H}')`,
  [at("12:30")],
  "invalid_slot",
);
await expectErr(
  "outside hours",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '01011112222', true, '${H}')`,
  [at("21:00")],
  "outside_hours",
);
await expectErr(
  "bad phone",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '1234', true, '${H}')`,
  [at("12:00")],
  "invalid_phone",
);
await expectErr(
  "unknown shop",
  `select public.create_order('nope', $1::timestamptz, 'pink', 'S', 30000, '손님', '01011112222', true, '${H}')`,
  [at("12:00")],
  "shop_not_found",
);
await expectErr(
  "too far ahead",
  `select public.create_order('bomnal', now() + interval '60 days', 'pink', 'S', 30000, '손님', '01011112222', true, '${H}')`,
  [],
  "date_out_of_range",
);
await expectErr(
  "same day too soon",
  `select public.create_order('bomnal', date_trunc('hour', now()) + interval '1 hour', 'pink', 'S', 30000, '손님', '01011112222', true, '${H}')`,
  [],
  "too_soon",
);

ok(
  "payment_methods lists only what the shop offers",
  JSON.stringify(shop.payment_methods) === JSON.stringify(["transfer", "onsite"]),
  JSON.stringify(shop.payment_methods),
);
await expectErr(
  "payment method the shop does not offer",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '01011112222', true, '${H}', 'kakaopay')`,
  [at("13:00")],
  "payment_method_unavailable",
);

// 동의, 기기 해시, 주문 횟수 제한
await expectErr(
  "consent required",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '01011112222', false, '${H}')`,
  [at("12:00")],
  "consent_required",
);
await expectErr(
  "client hash required",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '01011112222', true, 'nope')`,
  [at("12:00")],
  "client_unknown",
);
const HB = "b".repeat(64);
await db.query(
  `insert into public.orders (shop_id, source, type, pickup_at, color_key, size, budget, customer_name, customer_phone, consented_at, client_hash, status)
   select s.id, 'link', 'reservation', now() + interval '3 days', 'pink', 'S', 30000, '손님', '0105555000' || g, now(), $1, 'rejected'
   from public.shops s, generate_series(0, 9) g where s.slug = 'bomnal'`,
  [HB],
);
await expectErr(
  "same device: 11th order in an hour blocked",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '01055550009', true, '${HB}')`,
  [at("17:00")],
  "too_many_orders",
);
const HC = "c".repeat(64);
for (const hh of ["17", "18", "19"]) {
  await db.query(
    `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '01033334444', true, '${HC}')`,
    [at(`${hh}:00`)],
  );
}
await expectErr(
  "same phone: 4th open order blocked",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '010-3333-4444', true, '${HC}')`,
  [at("10:00")],
  "too_many_open_orders",
);
await expectErr(
  "purpose too long",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '01077770000', true, '${"d".repeat(64)}', 'onsite', repeat('가', 31))`,
  [at("10:00")],
  "input_too_long",
);

// RLS와 권한
const owner = "11111111-1111-1111-1111-111111111111",
  other = "22222222-2222-2222-2222-222222222222";
await db.exec(`insert into auth.users values ('${owner}'), ('${other}');`);
const totalOrders = (await db.query(`select count(*)::int c from public.orders`)).rows[0].c;
const shopId = (await db.query(`select id from public.shops where slug='bomnal'`)).rows[0].id;
const as = (uid) =>
  db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
const denied = async (name, sql, params = [], re = /permission denied|row-level security/) => {
  try {
    await db.query(sql, params);
    ok(name, false, "(no error)");
  } catch (e) {
    ok(name, re.test(e.message), `→ ${e.message}`);
  }
};

await db.exec(`set role anon`);
await denied("anon cannot read orders", `select * from public.orders`);
await denied("anon cannot read shops", `select * from public.shops`);
await denied(
  "anon cannot call create_order directly",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '01011112222', true, '${H}')`,
  [at("10:00")],
);
const anonView = (
  await db.query(`select public.get_order_by_token($1::uuid) as j`, [order.public_token])
).rows[0].j;
ok("anon can read own order by token", anonView?.order_no === order.order_no);
const anonShop = (await db.query(`select public.get_shop_public('bomnal') as j`)).rows[0].j;
ok("anon can read public shop", anonShop?.slug === "bomnal");
await db.exec(`reset role`);

// 가게 만들기, 연결
await as(other);
await denied(
  "signed-in user cannot create a shop",
  `insert into public.shops (slug, name, is_published, bank_account) values ('fake', '가짜', true, '1')`,
);
await denied(
  "signed-in user cannot call create_order directly",
  `select public.create_order('bomnal', $1::timestamptz, 'pink', 'S', 30000, '손님', '01011112222', true, '${H}')`,
  [at("10:00")],
);
const claimRes = async (code) =>
  (await db.query(`select public.claim_shop($1) as j`, [code])).rows[0].j;
ok("wrong claim code", (await claimRes("WRONG123"))?.error === "invalid_code");
await as(owner);
const claimed = (await db.query(`select public.claim_shop(' bomnal24 ') as j`)).rows[0].j;
ok("owner claims shop with code", claimed?.slug === "bomnal");
await expectErr(
  "cannot claim twice",
  `select public.claim_shop('BOMNAL24')`,
  [],
  "already_connected",
);
await as(other);
ok("code is single-use", (await claimRes("BOMNAL24"))?.error === "invalid_code");
for (let i = 0; i < 3; i++) await claimRes(`ZZZZZZZ${i}`);
await expectErr(
  "claim attempts limited",
  `select public.claim_shop('ZZZZZZZ9')`,
  [],
  "too_many_attempts",
);

ok(
  "other owner sees 0 orders",
  (await db.query(`select count(*)::int c from public.orders`)).rows[0].c === 0,
);
ok(
  "other owner sees 0 shops",
  (await db.query(`select count(*)::int c from public.shops`)).rows[0].c === 0,
);

await as(owner);
ok(
  "owner sees own orders",
  (await db.query(`select count(*)::int c from public.orders`)).rows[0].c === totalOrders,
);
await denied("owner cannot read claim code", `select claim_code from public.shops`);
await denied("owner cannot publish", `update public.shops set is_published = false`);
await denied("owner cannot change slug", `update public.shops set slug = 'other'`);
await db.query(`update public.shops set bank_name = '꽃은행'`);
ok("owner edits bank info", true);
await denied(
  "javascript: link blocked",
  `update public.shops set kakaopay_link = 'javascript:alert(1)'`,
  [],
  /check constraint/,
);

await db.query(
  `insert into public.orders (shop_id, source, type, pickup_at, color_key, size, budget, customer_name, customer_phone)
  values ($1, 'phone', 'reservation', $2::timestamptz, 'red', 'L', 70000, '전화손님', '01099998888')`,
  [shopId, at("15:00")],
);
ok("owner manual phone order", true);
await denied(
  "owner cannot fake link order",
  `insert into public.orders (shop_id, source, type, pickup_at, color_key, size, budget, customer_name, customer_phone)
  values ($1, 'link', 'reservation', $2::timestamptz, 'red', 'L', 70000, '가짜', '01099998888')`,
  [shopId, at("16:00")],
);
await denied(
  "owner cannot update orders directly",
  `update public.orders set status = 'picked_up'`,
);

const oid = (
  await db.query(`select id from public.orders where public_token = $1`, [order.public_token])
).rows[0].id;
await db.query(`select public.set_order_status($1, 'accepted')`, [oid]);
await db.query(`select public.set_payment_status($1, 'confirmed')`, [oid]);
ok("owner accepts order and confirms payment", true);
await expectErr(
  "status cannot go backwards",
  `select public.set_order_status($1, 'pending')`,
  [oid],
  "invalid_transition",
);
await db.query(`select public.set_order_status($1, 'making')`, [oid]);
await db.query(`select public.undo_order_status($1)`, [oid]);
ok(
  "undo goes back one step",
  (await db.query(`select status from public.orders where id = $1`, [oid])).rows[0].status ===
    "accepted",
);
await expectErr("undo only once", `select public.undo_order_status($1)`, [oid], "undo_expired");
await db.query(`select public.set_order_status($1, 'ready')`, [oid]);
await db.query(`select public.set_order_status($1, 'picked_up')`, [oid]);
ok("accepted → ready → picked_up", true);
const pendingId = (
  await db.query(
    `select id from public.orders where status = 'pending' and source = 'link' limit 1`,
  )
).rows[0].id;
await expectErr(
  "reject needs a reason",
  `select public.set_order_status($1, 'rejected', '  ')`,
  [pendingId],
  "reason_required",
);
await db.query(`select public.set_order_status($1, 'rejected', '그 시간은 마감됐어요')`, [
  pendingId,
]);
ok("reject with reason", true);
await as(other);
await expectErr(
  "other owner cannot change status",
  `select public.set_order_status($1, 'canceled')`,
  [oid],
  "order_not_found",
);
await db.exec(`reset role`);
const after = (
  await db.query(`select status, payment_status from public.orders where id = $1`, [oid])
).rows[0];
ok("final state", after.status === "picked_up" && after.payment_status === "confirmed");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
