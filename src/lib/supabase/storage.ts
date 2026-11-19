import { supabaseEnv } from "./env";

// public 버킷 파일의 주소. 파일명은 uuid라서 주소를 모르면 찾을 수 없다.
export function publicImageUrl(bucket: "shop-images" | "order-photos", path: string) {
  const { url } = supabaseEnv();
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}
