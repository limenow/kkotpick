import { supabaseEnv } from "./env";

// public 버킷 파일의 주소. 파일명은 uuid라서 주소를 모르면 찾을 수 없다.
// "/demo/..."처럼 /로 시작하면 우리 사이트의 public 폴더 파일(데모용 예시 그림)이다.
export function publicImageUrl(bucket: "shop-images" | "order-photos", path: string) {
  if (path.startsWith("/")) return path;
  const { url } = supabaseEnv();
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}
