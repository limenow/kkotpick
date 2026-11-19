-- 꽃을 잘 몰라도 느낌으로 주문하기.
-- 손님은 누구에게·어떤 날인지, 어떤 느낌인지를 고르고, 꽃집의 예시 사진을 보며 색감과 예산을 정한다.
-- 사장님은 "20대 여자친구 생일 · 러블리 · 핑크 · 5만 원" 같은 한 줄로 주문을 받는다.

alter table public.orders
  add column recipient text check (char_length(recipient) <= 20),
  add column mood text check (char_length(mood) <= 20);

-- 예시 사진에 느낌을 붙여서, 손님이 고른 느낌에 맞는 사진을 보여준다
alter table public.shop_samples
  add column mood text check (char_length(mood) <= 20);

create or replace function public.get_shop_public(p_slug text) returns jsonb
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
    'payment_methods', to_jsonb(array_remove(array[
      case when s.bank_account is not null then 'transfer' end,
      case when s.kakaopay_link is not null then 'kakaopay' end,
      case when s.toss_link is not null then 'toss' end,
      'onsite'
    ], null)),
    'samples', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sm.id, 'image_path', sm.image_path, 'title', sm.title,
        'budget_hint', sm.budget_hint, 'color_key', sm.color_key, 'mood', sm.mood
      ) order by sm.sort_order, sm.created_at)
      from public.shop_samples sm where sm.shop_id = s.id
    ), '[]'::jsonb)
  )
  from public.shops s
  where s.slug = p_slug and s.is_published;
$$;

create or replace function public.get_order_by_token(p_token uuid) returns jsonb
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
    'recipient', o.recipient,
    'mood', o.mood,
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

drop function public.create_order(text, timestamptz, text, public.bouquet_size, integer, text, text, boolean, text, public.payment_method, text, text);

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
  p_request_note text default null,
  p_recipient text default null,
  p_mood text default null
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
  v_name text;
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
  -- 이름은 한글 이름(2~10자, 한 번 띄어쓰기까지)이나 영어 이름(2~30자)만
  v_name := regexp_replace(trim(coalesce(p_customer_name, '')), '\s+', ' ', 'g');
  if not (
    (v_name ~ '^[가-힣]+( [가-힣]+)?$' and char_length(replace(v_name, ' ', '')) between 2 and 10)
    or (v_name ~ '^[A-Za-z]+(\.? [A-Za-z]+|[''.-][A-Za-z]+)*$'
        and char_length(v_name) between 2 and 30
        and char_length(regexp_replace(v_name, '[ ''.-]', '', 'g')) >= 2)
  ) then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if char_length(coalesce(p_purpose, '')) > 30 or char_length(coalesce(p_request_note, '')) > 500
     or char_length(coalesce(p_recipient, '')) > 20 or char_length(coalesce(p_mood, '')) > 20 then
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
    customer_name, customer_phone, payment_method, consented_at, client_hash, recipient, mood
  ) values (
    v_shop.id, 'link', v_type, p_pickup_at, p_color_key, p_size, p_budget, p_purpose, p_request_note,
    v_name, v_phone, p_payment_method, now(), p_client_hash, nullif(trim(p_recipient), ''), nullif(trim(p_mood), '')
  ) returning * into v_order;

  return jsonb_build_object('order_no', v_order.order_no, 'public_token', v_order.public_token);
end $$;

revoke all on function public.create_order(text, timestamptz, text, public.bouquet_size, integer, text, text, boolean, text, public.payment_method, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_order(text, timestamptz, text, public.bouquet_size, integer, text, text, boolean, text, public.payment_method, text, text, text, text) to service_role;
