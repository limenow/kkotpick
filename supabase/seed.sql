-- 로컬 개발용 데모 가게. `npx supabase db reset` 하면 들어간다.
-- 주인이 없는(owner_id = null) 상태라 대시보드에선 안 보이고, 손님 화면(/s/bomnal)으로 확인한다.

insert into public.shops (
  slug, name, intro, address, phone, tags, is_published,
  min_budget, available_colors, bank_name, bank_account, bank_holder
) values (
  'bomnal', '봄날 꽃방', '러블리하고 파스텔 톤 꽃다발을 주로 만들어요.',
  '경북 포항시 북구 양덕동 (데모)', '010-0000-0000',
  '{러블리,파스텔,작은꽃다발}', true,
  30000, '{pink,white,purple,any}', '데모은행', '000-0000-0000', '봄날'
);

insert into public.shop_samples (shop_id, image_path, title, budget_hint, color_key, sort_order)
select id, 'demo/pink.jpg', '핑크 러블리', 50000, 'pink', 1 from public.shops where slug = 'bomnal'
union all
select id, 'demo/white.jpg', '화이트 내추럴', 70000, 'white', 2 from public.shops where slug = 'bomnal'
union all
select id, 'demo/purple.jpg', '라벤더 무드', 30000, 'purple', 3 from public.shops where slug = 'bomnal';
