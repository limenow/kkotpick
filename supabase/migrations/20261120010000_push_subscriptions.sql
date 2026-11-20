-- 새 주문 알림(웹 푸시). 사장님 기기마다 구독 정보를 하나씩 저장한다.
-- 보내는 건 서버(서비스 키)만 한다.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  device_label text check (char_length(device_label) <= 60),
  created_at timestamptz not null default now()
);

create index push_subscriptions_shop_idx on public.push_subscriptions (shop_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon;

-- 사장님은 자기 기기 구독만 넣고, 보고, 지운다
create policy push_owner_select on public.push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_owner_insert on public.push_subscriptions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_shop_owner(shop_id));
create policy push_owner_delete on public.push_subscriptions
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.push_subscriptions to authenticated;
