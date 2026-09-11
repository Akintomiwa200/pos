export const MAX_PRODUCT_IMAGE_BYTES = 1024 * 1024;

export function productImageSrc(id: string, image?: string | null) {
  return image?.trim() || "";
}
