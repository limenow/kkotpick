-- 꽃픽 첫 스키마
-- 손님은 로그인 없이 주문하고, 사장님은 자기 가게 데이터만 본다.
-- 손님 쪽 읽기/쓰기는 전부 아래 RPC(security definer)로만 한다. 테이블을 anon에 직접 열지 않는다.

-- ─────────────────────────────────────────────
-- 1. 타입
-- ─────────────────────────────────────────────

create type public.order_type as enum ('same_day', 'reservation');

-- 접수 → 수락 → 제작중 → 완성(사진) → 픽업완료 / 거절 / 취소
create type public.order_status as enum (
  'pending', 'accepted', 'making', 'ready', 'picked_up', 'rejected', 'canceled'
);

-- 주문이 어디서 들어왔는지. 흩어진 채널을 한곳에 모으는 게 핵심이라 처음부터 둔다.
create type public.order_source as enum (
  'link', 'phone', 'kakao', 'naver', 'instagram', 'walk_in'
);

-- 우리는 돈을 받지 않는다. 손님이 꽃집 계좌/간편송금/현장결제로 내고, 사장님이 확인한다.
create type public.payment_method as enum ('transfer', 'kakaopay', 'toss', 'onsite');
create type public.payment_status as enum ('unpaid', 'confirmed', 'paid_onsite', 'refunded');

create type public.bouquet_size as enum ('S', 'M', 'L');

create type public.notification_channel as enum ('sms', 'alimtalk');
create type public.notification_status as enum ('queued', 'sent', 'failed');

-- ─────────────────────────────────────────────
-- 2. 테이블
-- ─────────────────────────────────────────────

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  -- 파일럿 때는 우리가 가게를 먼저 세팅해주고 사장님이 나중에 가입해서 연결한다. 그래서 null 허용.
  owner_id uuid references auth.users (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name text not null,
  intro text,
  address text,
  phone text,
  tags text[] not null default '{}',
  is_published boolean not null default false,

  -- 영업
  open_time time not null default '10:00',
  close_time time not null default '20:00',
  closed_weekdays smallint[] not null default '{}', -- 0=일 … 6=토

  -- 주문 규칙
  min_budget integer not null default 30000 check (min_budget >= 0),
  same_day_enabled boolean not null default true,
  same_day_lead_minutes integer not null default 120 check (same_day_lead_minutes >= 0),
  reservation_max_days integer not null default 28 check (reservation_max_days between 1 and 90),
  slot_minutes integer not null default 60 check (slot_minutes in (30, 60, 90, 120)),
  max_orders_per_slot integer not null default 3 check (max_orders_per_slot >= 1),
  -- 오늘 가능한 색감 (당일 주문에만 적용, 예약은 전체 색감 허용)
  available_colors text[] not null default '{pink,white,red,yellow,purple,any}',

  -- 결제 안내 (손님이 주문한 뒤 주문 조회 RPC로만 보여준다)
  bank_name text,
  bank_account text,
  bank_holder text,
  kakaopay_link text,
  toss_link text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shops_owner_idx on public.shops (owner_id);

-- 특정 날짜 휴무 (명절, 개인 사정)
create table public.shop_closed_dates (
  shop_id uuid not null references public.shops (id) on delete cascade,
  closed_on date not null,
  note text,
  primary key (shop_id, closed_on)
);

-- 꽃집 분위기 샘플 사진 (메뉴판 역할, 가격표 아님)
create table public.shop_samples (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  image_path text not null, -- storage: shop-images/{shop_id}/...
  title text not null,
  budget_hint integer, -- "5만원대 예시"
  color_key text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index shop_samples_shop_idx on public.shop_samples (shop_id, sort_order);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  order_no bigint generated always as identity, -- 화면에 보여줄 번호
  -- 손님 주문 조회용 토큰. 알림 문자의 링크에 들어간다. 추측할 수 없어야 한다.
  public_token uuid not null unique default gen_random_uuid(),

  source public.order_source not null default 'link',
  type public.order_type not null,
  status public.order_status not null default 'pending',
  pickup_at timestamptz not null,

  color_key text not null,
  size public.bouquet_size not null,
  budget integer not null check (budget > 0),
  purpose text, -- 생일, 졸업, 고백 …
  request_note text check (char_length(request_note) <= 500),
  extra_amount integer not null default 0 check (extra_amount >= 0), -- 사장님 추가금 제안

  customer_name text not null check (char_length(customer_name) between 1 and 30),
  customer_phone text not null check (customer_phone ~ '^01[0-9]{8,9}$'),

  payment_method public.payment_method not null default 'onsite',
  payment_status public.payment_status not null default 'unpaid',

  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_shop_pickup_idx on public.orders (shop_id, pickup_at);
create index orders_shop_status_idx on public.orders (shop_id, status);

create table public.order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  image_path text not null, -- storage: order-photos/{shop_id}/{order_id}/...
  created_at timestamptz not null default now()
);

create index order_photos_order_idx on public.order_photos (order_id);

-- 알림 발송 기록. 서버(서비스 키)만 쓴다. SMS → 알림톡으로 바꿔도 이 테이블은 그대로.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  channel public.notification_channel not null default 'sms',
  template text not null, -- order_received, order_accepted, order_ready, pickup_reminder, order_rejected
  to_phone text not null,
  status public.notification_status not null default 'queued',
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index notifications_order_idx on public.notifications (order_id);

-- updated_at 자동 갱신
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger shops_touch before update on public.shops
  for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────
-- 3. RLS
-- ─────────────────────────────────────────────

alter table public.shops enable row level security;
alter table public.shop_closed_dates enable row level security;
alter table public.shop_samples enable row level security;
alter table public.orders enable row level security;
alter table public.order_photos enable row level security;
alter table public.notifications enable row level security;

create function public.is_shop_owner(p_shop_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.shops s
    where s.id = p_shop_id and s.owner_id = (select auth.uid())
  );
$$;

-- shops: 사장님은 자기 가게만. 손님(anon)은 직접 못 읽고 get_shop_public()으로만.
create policy shops_owner_select on public.shops
  for select to authenticated using (owner_id = (select auth.uid()));
create policy shops_owner_insert on public.shops
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy shops_owner_update on public.shops
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy closed_dates_owner_all on public.shop_closed_dates
  for all to authenticated
  using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));

create policy samples_owner_all on public.shop_samples
  for all to authenticated
  using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));

-- orders: 사장님은 자기 가게 주문 조회/수정, 전화·카톡 주문 직접 입력(source <> 'link').
-- 손님 주문은 create_order() RPC로만 들어온다.
create policy orders_owner_select on public.orders
  for select to authenticated using (public.is_shop_owner(shop_id));
create policy orders_owner_insert on public.orders
  for insert to authenticated
  with check (public.is_shop_owner(shop_id) and source <> 'link');
create policy orders_owner_update on public.orders
  for update to authenticated
  using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));

create policy order_photos_owner_all on public.order_photos
  for all to authenticated
  using (public.is_shop_owner((select o.shop_id from public.orders o where o.id = order_id)))
  with check (public.is_shop_owner((select o.shop_id from public.orders o where o.id = order_id)));

-- notifications: 사장님은 보기만. 쓰기는 서비스 키(RLS 우회)로만.
create policy notifications_owner_select on public.notifications
  for select to authenticated
  using (public.is_shop_owner((select o.shop_id from public.orders o where o.id = order_id)));

-- 기본 권한: anon은 테이블에 직접 접근하지 않는다.
revoke all on all tables in schema public from anon;

-- ─────────────────────────────────────────────
-- 4. 손님용 RPC
-- ─────────────────────────────────────────────

-- 가게 공개 정보 + 샘플. 계좌·소유자 같은 민감 정보는 빼고 준다.
create function public.get_shop_public(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'slug', s.slug,
    'name', s.name,
    'intro', s.intro,
    'address', s.address,
    'tags', s.tags,
    'open_time', s.open_time,
    'close_time', s.close_time,
    'closed_weekdays', s.closed_weekdays,
    'min_budget', s.min_budget,
    'same_day_enabled', s.same_day_enabled,
    'same_day_lead_minutes', s.same_day_lead_minutes,
    'reservation_max_days', s.reservation_max_days,
    'slot_minutes', s.slot_minutes,
    'available_colors', s.available_colors,
    'samples', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sm.id, 'image_path', sm.image_path, 'title', sm.title,
        'budget_hint', sm.budget_hint, 'color_key', sm.color_key
      ) order by sm.sort_order, sm.created_at)
      from public.shop_samples sm where sm.shop_id = s.id
    ), '[]'::jsonb)
  )
  from public.shops s
  where s.slug = p_slug and s.is_published;
$$;

-- 날짜별 픽업 가능 시간대와 남은 자리. 주문 화면의 시간 버튼을 그릴 때 쓴다.
create function public.get_available_slots(p_slug text, p_date date)
returns table (slot_start timestamptz, remaining integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_shop public.shops;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_slot timestamp;
  v_end timestamp;
  v_taken integer;
begin
  select * into v_shop from public.shops where slug = p_slug and is_published;
  if not found then return; end if;

  if p_date < v_today or p_date > v_today + v_shop.reservation_max_days then return; end if;
  if extract(dow from p_date)::smallint = any (v_shop.closed_weekdays) then return; end if;
  if exists (select 1 from public.shop_closed_dates d where d.shop_id = v_shop.id and d.closed_on = p_date) then return; end if;
  if p_date = v_today and not v_shop.same_day_enabled then return; end if;

  v_slot := p_date + v_shop.open_time;
  v_end := p_date + v_shop.close_time;

  while v_slot < v_end loop
    if p_date > v_today
       or (v_slot at time zone 'Asia/Seoul') >= now() + make_interval(mins => v_shop.same_day_lead_minutes) then
      select count(*) into v_taken from public.orders o
      where o.shop_id = v_shop.id
        and o.status not in ('rejected', 'canceled')
        and o.pickup_at >= (v_slot at time zone 'Asia/Seoul')
        and o.pickup_at < ((v_slot + make_interval(mins => v_shop.slot_minutes)) at time zone 'Asia/Seoul');

      if v_taken < v_shop.max_orders_per_slot then
        slot_start := v_slot at time zone 'Asia/Seoul';
        remaining := v_shop.max_orders_per_slot - v_taken;
        return next;
      end if;
    end if;
    v_slot := v_slot + make_interval(mins => v_shop.slot_minutes);
  end loop;
end $$;

-- 손님 주문 생성. 모든 규칙을 서버에서 검사한다. 성공하면 조회 토큰을 돌려준다.
create function public.create_order(
  p_slug text,
  p_pickup_at timestamptz,
  p_color_key text,
  p_size public.bouquet_size,
  p_budget integer,
  p_customer_name text,
  p_customer_phone text,
  p_payment_method public.payment_method default 'onsite',
  p_purpose text default null,
  p_request_note text default null
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_shop public.shops;
  v_local timestamp := p_pickup_at at time zone 'Asia/Seoul';
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_date date := (p_pickup_at at time zone 'Asia/Seoul')::date;
  v_type public.order_type;
  v_slot_start timestamp;
  v_taken integer;
  v_phone text := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  v_order public.orders;
begin
  select * into v_shop from public.shops where slug = p_slug and is_published;
  if not found then raise exception 'shop_not_found' using errcode = 'P0002'; end if;

  v_type := case when v_date = v_today then 'same_day'::public.order_type else 'reservation'::public.order_type end;

  -- 날짜
  if v_date < v_today or v_date > v_today + v_shop.reservation_max_days then
    raise exception 'date_out_of_range' using errcode = 'P0001';
  end if;
  if extract(dow from v_date)::smallint = any (v_shop.closed_weekdays)
     or exists (select 1 from public.shop_closed_dates d where d.shop_id = v_shop.id and d.closed_on = v_date) then
    raise exception 'shop_closed' using errcode = 'P0001';
  end if;

  -- 시간 (영업시간 안, 시간대 시작에 맞춰서)
  if v_local::time < v_shop.open_time or v_local::time >= v_shop.close_time then
    raise exception 'outside_hours' using errcode = 'P0001';
  end if;
  if (extract(epoch from (v_local::time - v_shop.open_time)) / 60)::integer % v_shop.slot_minutes <> 0 then
    raise exception 'invalid_slot' using errcode = 'P0001';
  end if;

  -- 당일 규칙
  if v_type = 'same_day' then
    if not v_shop.same_day_enabled then raise exception 'same_day_disabled' using errcode = 'P0001'; end if;
    if p_pickup_at < now() + make_interval(mins => v_shop.same_day_lead_minutes) then
      raise exception 'too_soon' using errcode = 'P0001';
    end if;
    if not (p_color_key = any (v_shop.available_colors)) then
      raise exception 'color_unavailable' using errcode = 'P0001';
    end if;
  end if;

  -- 예산, 손님 정보
  if p_budget is null or p_budget < greatest(v_shop.min_budget, 1) then
    raise exception 'budget_below_minimum' using errcode = 'P0001';
  end if;
  if v_phone !~ '^01[0-9]{8,9}$' then raise exception 'invalid_phone' using errcode = 'P0001'; end if;
  if char_length(coalesce(trim(p_customer_name), '')) not between 1 and 30 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;

  -- 시간대 마감 검사. 같은 시간대에 동시에 들어온 주문이 둘 다 통과하지 않게 잠근다.
  v_slot_start := v_local;
  perform pg_advisory_xact_lock(hashtextextended(v_shop.id::text || v_slot_start::text, 0));
  select count(*) into v_taken from public.orders o
  where o.shop_id = v_shop.id
    and o.status not in ('rejected', 'canceled')
    and o.pickup_at >= p_pickup_at
    and o.pickup_at < p_pickup_at + make_interval(mins => v_shop.slot_minutes);
  if v_taken >= v_shop.max_orders_per_slot then
    raise exception 'slot_full' using errcode = 'P0001';
  end if;

  insert into public.orders (
    shop_id, source, type, pickup_at, color_key, size, budget, purpose, request_note,
    customer_name, customer_phone, payment_method
  ) values (
    v_shop.id, 'link', v_type, p_pickup_at, p_color_key, p_size, p_budget, p_purpose, p_request_note,
    trim(p_customer_name), v_phone, p_payment_method
  ) returning * into v_order;

  return jsonb_build_object('order_no', v_order.order_no, 'public_token', v_order.public_token);
end $$;

-- 손님 주문 조회 (알림 문자 링크로 열림). 토큰을 아는 사람만 볼 수 있다.
create function public.get_order_by_token(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'order_no', o.order_no,
    'status', o.status,
    'type', o.type,
    'pickup_at', o.pickup_at,
    'color_key', o.color_key,
    'size', o.size,
    'budget', o.budget,
    'extra_amount', o.extra_amount,
    'purpose', o.purpose,
    'request_note', o.request_note,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'reject_reason', o.reject_reason,
    'created_at', o.created_at,
    'shop', jsonb_build_object(
      'name', s.name, 'slug', s.slug, 'address', s.address, 'phone', s.phone,
      'bank_name', s.bank_name, 'bank_account', s.bank_account, 'bank_holder', s.bank_holder,
      'kakaopay_link', s.kakaopay_link, 'toss_link', s.toss_link
    ),
    'photos', coalesce((
      select jsonb_agg(p.image_path order by p.created_at)
      from public.order_photos p where p.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  join public.shops s on s.id = o.shop_id
  where o.public_token = p_token;
$$;

revoke all on function public.get_shop_public(text) from public;
revoke all on function public.get_available_slots(text, date) from public;
revoke all on function public.create_order(text, timestamptz, text, public.bouquet_size, integer, text, text, public.payment_method, text, text) from public;
revoke all on function public.get_order_by_token(uuid) from public;
revoke all on function public.is_shop_owner(uuid) from public;

grant execute on function public.get_shop_public(text) to anon, authenticated;
grant execute on function public.get_available_slots(text, date) to anon, authenticated;
grant execute on function public.create_order(text, timestamptz, text, public.bouquet_size, integer, text, text, public.payment_method, text, text) to anon, authenticated;
grant execute on function public.get_order_by_token(uuid) to anon, authenticated;
grant execute on function public.is_shop_owner(uuid) to authenticated;

-- ─────────────────────────────────────────────
-- 5. 스토리지
-- ─────────────────────────────────────────────
-- 경로 규칙: {shop_id}/파일명. 첫 폴더가 가게 id라서 정책에서 주인 확인에 쓴다.
-- 파일명은 앱에서 uuid로 만든다 (추측 불가).

insert into storage.buckets (id, name, public)
values ('shop-images', 'shop-images', true), ('order-photos', 'order-photos', true)
on conflict (id) do nothing;

create policy shop_images_owner_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'shop-images' and public.is_shop_owner(((storage.foldername(name))[1])::uuid));
create policy shop_images_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'shop-images' and public.is_shop_owner(((storage.foldername(name))[1])::uuid));

create policy order_photos_owner_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'order-photos' and public.is_shop_owner(((storage.foldername(name))[1])::uuid));
create policy order_photos_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'order-photos' and public.is_shop_owner(((storage.foldername(name))[1])::uuid));
