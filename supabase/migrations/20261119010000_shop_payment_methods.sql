-- 주문서에서 손님이 고를 수 있는 결제 방법을 보여주기 위해,
-- get_shop_public에 payment_methods를 더한다. 계좌번호나 링크 자체는 여전히 주문 조회 때만 준다.

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
        'budget_hint', sm.budget_hint, 'color_key', sm.color_key
      ) order by sm.sort_order, sm.created_at)
      from public.shop_samples sm where sm.shop_id = s.id
    ), '[]'::jsonb)
  )
  from public.shops s
  where s.slug = p_slug and s.is_published;
$$;

-- 가게가 제공하지 않는 결제 방법으로는 주문을 넣을 수 없게 한다.
create function public.check_order_payment_method() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_shop public.shops;
begin
  if new.source <> 'link' then return new; end if;
  select * into v_shop from public.shops where id = new.shop_id;
  if (new.payment_method = 'transfer' and v_shop.bank_account is null)
     or (new.payment_method = 'kakaopay' and v_shop.kakaopay_link is null)
     or (new.payment_method = 'toss' and v_shop.toss_link is null) then
    raise exception 'payment_method_unavailable' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger orders_check_payment_method before insert on public.orders
  for each row execute function public.check_order_payment_method();
