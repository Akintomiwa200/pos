export const MAX_PRODUCT_IMAGE_BYTES = 1024 * 1024;

export function productImageSrc(id: string, image?: string | null) {
  const url = image?.trim();
  if (url) return url;
  return `https://picsum.photos/seed/${encodeURIComponent(id)}/600/450`;
}
