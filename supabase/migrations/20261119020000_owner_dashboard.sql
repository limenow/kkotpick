-- 사장님 로그인과 주문 관리. 보안 점검에서 나온 High 두 건도 여기서 막는다.
--
-- High 1. 가입만 하면 누구나 공개 꽃집 페이지와 계좌를 만들 수 있었다.
--   → 가게는 꽃픽이 만든다(서비스 키). 사장님은 받은 연결 코드로 자기 가게를 연결만 한다.
--   → 사장님은 공개 여부, 주소(slug), 주인을 직접 바꿀 수 없다.
-- High 2. create_order를 아무나 무제한으로 부를 수 있었고, 동의 확인은 화면에서만 했다.
--   → create_order는 서버(서비스 키)만 부른다. 동의 여부와 요청한 기기 해시를 받아서
--     DB에서 동의를 확인하고, 같은 기기·같은 번호의 주문 횟수를 제한한다.

-- ─────────────────────────────────────────────
-- 1. 가게: 직접 만들기 금지, 고칠 수 있는 칸 제한, 연결 코드
-- ─────────────────────────────────────────────

drop policy shops_owner_insert on public.shops;
revoke insert, update, delete on public.shops from authenticated;
grant update (
  name, intro, address, phone, tags,
  open_time, close_time, closed_weekdays,
  min_budget, same_day_enabled, same_day_lead_minutes, reservation_max_days,
  slot_minutes, max_orders_per_slot, available_colors,
  bank_name, bank_account, bank_holder, kakaopay_link, toss_link
) on public.shops to authenticated;

-- 송금 링크는 https만. javascript: 같은 링크가 손님 화면에 걸리지 않게 한다.
alter table public.shops
  add constraint shops_kakaopay_link_https check (kakaopay_link is null or kakaopay_link ~ '^https://'),
  add constraint shops_toss_link_https check (toss_link is null or toss_link ~ '^https://'),
  add constraint shops_text_lengths check (
    char_length(name) <= 40 and char_length(coalesce(intro, '')) <= 300
    and char_length(coalesce(address, '')) <= 120 and char_length(coalesce(phone, '')) <= 20
    and char_length(coalesce(bank_name, '')) <= 20 and char_length(coalesce(bank_account, '')) <= 40
    and char_length(coalesce(bank_holder, '')) <= 20
  );

-- 꽃픽이 가게를 만들면서 연결 코드를 발급하고, 사장님에게 따로 전한다.
alter table public.shops
  add column claim_code text unique check (claim_code ~ '^[A-Z0-9]{8}$'),
  add column claim_expires_at timestamptz;

-- 연결 코드는 주인도 다시 볼 필요가 없다.
revoke select on public.shops from authenticated;
grant select (
  id, owner_id, slug, name, intro, address, phone, tags, is_published,
  open_time, close_time, closed_weekdays,
  min_budget, same_day_enabled, same_day_lead_minutes, reservation_max_days,
  slot_minutes, max_orders_per_slot, available_colors,
  bank_name, bank_account, bank_holder, kakaopay_link, toss_link,
  created_at, updated_at
) on public.shops to authenticated;

-- 연결 코드 대입 시도를 막기 위한 기록
create table public.shop_claim_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index shop_claim_attempts_user_idx on public.shop_claim_attempts (user_id, attempted_at);
alter table public.shop_claim_attempts enable row level security;
revoke all on public.shop_claim_attempts from anon, authenticated;

create function public.claim_shop(p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_shop public.shops;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  if exists (select 1 from public.shops where owner_id = v_uid) then
    raise exception 'already_connected' using errcode = 'P0001';
  end if;

  -- 한 시간에 5번까지
  if (select count(*) from public.shop_claim_attempts
      where user_id = v_uid and attempted_at > now() - interval '1 hour') >= 5 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;
  insert into public.shop_claim_attempts (user_id) values (v_uid);

  update public.shops
     set owner_id = v_uid, claim_code = null, claim_expires_at = null
   where claim_code = v_code and owner_id is null
     and (claim_expires_at is null or claim_expires_at > now())
  returning * into v_shop;

  -- 예외를 던지면 위의 시도 기록까지 되돌려지므로, 틀린 코드는 결과로 알려준다.
  if not found then return jsonb_build_object('error', 'invalid_code'); end if;
  return jsonb_build_object('slug', v_shop.slug, 'name', v_shop.name);
end $$;

revoke all on function public.claim_shop(text) from public;
grant execute on function public.claim_shop(text) to authenticated;

-- ─────────────────────────────────────────────
-- 2. 주문: 동의 기록, 요청 기기 해시, 입력 길이
-- ─────────────────────────────────────────────

alter table public.orders
  add column consented_at timestamptz,
  add column client_hash text check (client_hash ~ '^[0-9a-f]{64}$'),
  add constraint orders_purpose_length check (char_length(coalesce(purpose, '')) <= 30),
  add constraint orders_reject_reason_length check (char_length(coalesce(reject_reason, '')) <= 200),
  add constraint orders_color_key_length check (char_length(color_key) <= 20);

-- 링크로 들어온 주문은 반드시 동의 기록이 있어야 한다.
alter table public.orders
  add constraint orders_link_consent check (source <> 'link' or consented_at is not null) not valid;

create index orders_client_hash_idx on public.orders (client_hash, created_at) where client_hash is not null;
create index orders_shop_phone_idx on public.orders (shop_id, customer_phone);

drop function public.create_order(
  text, timestamptz, text, public.bouquet_size, integer, text, text, public.payment_method, text, text
);

create function public.create_order(
  p_slug text,
  p_pickup_at timestamptz,
  p_color_key text,
  p_size public.bouquet_size,
  p_budget integer,
  p_customer_name text,
  p_customer_phone text,
  p_consent boolean,
  p_client_hash text,
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
  v_taken integer;
  v_phone text := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  v_order public.orders;
begin
  if p_consent is not true then raise exception 'consent_required' using errcode = 'P0001'; end if;
  if p_client_hash is null or p_client_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'client_unknown' using errcode = 'P0001';
  end if;

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

  -- 예산, 손님 정보, 입력 길이
  if p_budget is null or p_budget < greatest(v_shop.min_budget, 1) or p_budget > 1000000 then
    raise exception 'budget_below_minimum' using errcode = 'P0001';
  end if;
  if v_phone !~ '^01[0-9]{8,9}$' then raise exception 'invalid_phone' using errcode = 'P0001'; end if;
  if char_length(coalesce(trim(p_customer_name), '')) not between 1 and 30 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if char_length(coalesce(p_purpose, '')) > 30 or char_length(coalesce(p_request_note, '')) > 500 then
    raise exception 'input_too_long' using errcode = 'P0001';
  end if;

  -- 주문 횟수 제한. 같은 기기에서 한 시간에 10건, 같은 번호로 한 꽃집에 진행 중인 주문 3건까지.
  perform pg_advisory_xact_lock(hashtextextended('order-client:' || p_client_hash, 0));
  if (select count(*) from public.orders o
      where o.client_hash = p_client_hash and o.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too_many_orders' using errcode = 'P0001';
  end if;
  if (select count(*) from public.orders o
      where o.shop_id = v_shop.id and o.customer_phone = v_phone
        and o.status in ('pending', 'accepted', 'making', 'ready')) >= 3 then
    raise exception 'too_many_open_orders' using errcode = 'P0001';
  end if;

  -- 시간대 마감 검사. 같은 시간대에 동시에 들어온 주문이 둘 다 통과하지 않게 잠근다.
  perform pg_advisory_xact_lock(hashtextextended(v_shop.id::text || v_local::text, 0));
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
    customer_name, customer_phone, payment_method, consented_at, client_hash
  ) values (
    v_shop.id, 'link', v_type, p_pickup_at, p_color_key, p_size, p_budget, p_purpose, p_request_note,
    trim(p_customer_name), v_phone, p_payment_method, now(), p_client_hash
  ) returning * into v_order;

  return jsonb_build_object('order_no', v_order.order_no, 'public_token', v_order.public_token);
end $$;

-- 브라우저(anon, 로그인 사장님)에서는 부를 수 없다. 서버 액션이 서비스 키로만 부른다.
revoke all on function public.create_order(
  text, timestamptz, text, public.bouquet_size, integer, text, text, boolean, text, public.payment_method, text, text
) from public, anon, authenticated;
grant execute on function public.create_order(
  text, timestamptz, text, public.bouquet_size, integer, text, text, boolean, text, public.payment_method, text, text
) to service_role;

-- ─────────────────────────────────────────────
-- 3. 사장님 주문 처리: 상태는 정해진 순서로만, 결제 확인
-- ─────────────────────────────────────────────

-- 주문을 직접 고치지 못하게 하고, 아래 함수로만 바꾼다. (전화 주문 입력은 그대로 insert)
revoke update on public.orders from authenticated;

-- 실수로 누른 상태 변경을 1분 안에 되돌릴 수 있게 바로 전 상태를 남겨둔다.
-- (나중에 손님 문자를 보낼 때도 이 1분이 지난 뒤에 보낸다.)
alter table public.orders
  add column prev_status public.order_status,
  add column status_changed_at timestamptz;

create function public.set_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_reason text default null
) returns public.order_status
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or not public.is_shop_owner(v_order.shop_id) then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if not (
    (v_order.status = 'pending' and p_status in ('accepted', 'rejected'))
    or (v_order.status = 'accepted' and p_status in ('making', 'ready', 'canceled'))
    or (v_order.status = 'making' and p_status in ('ready', 'canceled'))
    or (v_order.status = 'ready' and p_status in ('picked_up', 'canceled'))
  ) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;

  if p_status = 'rejected' and v_reason is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if char_length(coalesce(v_reason, '')) > 200 then
    raise exception 'input_too_long' using errcode = 'P0001';
  end if;

  update public.orders
     set status = p_status,
         prev_status = v_order.status,
         status_changed_at = now(),
         reject_reason = case when p_status in ('rejected', 'canceled') then v_reason else reject_reason end
   where id = p_order_id;
  return p_status;
end $$;

create function public.undo_order_status(p_order_id uuid) returns public.order_status
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or not public.is_shop_owner(v_order.shop_id) then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_order.prev_status is null or v_order.status_changed_at < now() - interval '1 minute' then
    raise exception 'undo_expired' using errcode = 'P0001';
  end if;
  update public.orders
     set status = v_order.prev_status,
         prev_status = null,
         status_changed_at = null,
         reject_reason = case when v_order.status in ('rejected', 'canceled') then null else reject_reason end
   where id = p_order_id;
  return v_order.prev_status;
end $$;

create function public.set_payment_status(
  p_order_id uuid,
  p_status public.payment_status
) returns public.payment_status
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or not public.is_shop_owner(v_order.shop_id) then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  update public.orders set payment_status = p_status where id = p_order_id;
  return p_status;
end $$;

revoke all on function public.set_order_status(uuid, public.order_status, text) from public;
revoke all on function public.set_payment_status(uuid, public.payment_status) from public;
revoke all on function public.undo_order_status(uuid) from public;
grant execute on function public.undo_order_status(uuid) to authenticated;
grant execute on function public.set_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.set_payment_status(uuid, public.payment_status) to authenticated;
