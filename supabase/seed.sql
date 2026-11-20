-- 로컬 개발용 데모 가게. `npx supabase db reset` 하면 들어간다.
-- 주인이 없는(owner_id = null) 상태로 시작한다. 손님 화면은 /s/bomnal,
-- 사장님 화면은 /login 에서 아무 이메일로 로그인한 뒤 연결 코드 BOMNAL24 를 넣으면 연결된다.

insert into public.shops (
  slug, name, intro, address, phone, tags, is_published,
  min_budget, available_colors, bank_name, bank_account, bank_holder, claim_code
) values (
  'bomnal', '봄날 꽃방', '러블리하고 파스텔 톤 꽃다발을 주로 만들어요.',
  '경북 포항시 북구 양덕동 (데모)', '010-0000-0000',
  '{러블리,파스텔,작은꽃다발}', true,
  20000, '{pink,white,purple,yellow,any}', '데모은행', '000-0000-0000', '봄날', 'BOMNAL24'
);

-- 예시 그림은 public/demo 폴더의 일러스트 (실제 꽃집 사진이 들어오기 전까지 쓰는 데모용)
insert into public.shop_samples (shop_id, image_path, title, budget_hint, color_key, mood, sort_order)
select s.id, v.path, v.title, v.budget, v.color, v.mood, v.ord
from public.shops s,
  (values
    ('/demo/lovely-pink.svg', '핑크 러블리', 50000, 'pink', '러블리', 1),
    ('/demo/lovely-pink-mini.svg', '작은 핑크 꽃다발', 20000, 'pink', '러블리', 2),
    ('/demo/lovely-purple.svg', '라벤더 러블리', 30000, 'purple', '러블리', 3),
    ('/demo/bright-yellow.svg', '햇살 옐로우', 50000, 'yellow', '화사한', 4),
    ('/demo/bright-mix.svg', '알록달록 축하', 70000, 'any', '화사한', 5),
    ('/demo/calm-white.svg', '화이트 그린', 70000, 'white', '차분한', 6),
    ('/demo/calm-purple.svg', '은은한 보라', 50000, 'purple', '차분한', 7),
    ('/demo/luxe-red.svg', '레드 장미', 100000, 'red', '고급스러운', 8),
    ('/demo/natural-white.svg', '들꽃 내추럴', 30000, 'white', '내추럴', 9)
  ) as v(path, title, budget, color, mood, ord)
where s.slug = 'bomnal';
