-- 완성 사진 보내기.
-- 사장님이 "다 만들었어요"를 누르면 사진을 찍어 주문에 저장하고,
-- 꽃집마다 정한 멘트와 함께 카톡이나 문자로 손님에게 보낸다.

-- 꽃집별 완성 멘트. {이름} {시간} {가게} {주문링크} 자리에 주문 내용이 들어간다.
-- 비워두면 화면의 기본 멘트를 쓴다.
alter table public.shops
  add column ready_message text check (char_length(ready_message) <= 300);

grant select (ready_message) on public.shops to authenticated;
grant update (ready_message) on public.shops to authenticated;

-- 완성 사진 경로는 그 주문의 폴더 안이어야 한다: {shop_id}/{order_id}/파일
alter table public.order_photos
  add constraint order_photos_path_format
  check (image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]+$');

create function public.check_order_photo_path() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_shop uuid;
begin
  select shop_id into v_shop from public.orders where id = new.order_id;
  if new.image_path not like v_shop::text || '/' || new.order_id::text || '/%' then
    raise exception 'photo_path_mismatch' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger order_photos_path_check
  before insert or update on public.order_photos
  for each row execute function public.check_order_photo_path();

-- 스토리지: 사진만, 5MB까지 (보안 점검 Medium: 스토리지 제한)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit'
  ) then
    update storage.buckets
       set file_size_limit = 5242880,
           allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
     where id in ('shop-images', 'order-photos');
  end if;
end $$;
