export const MAX_PRODUCT_IMAGE_BYTES = 1024 * 1024;

export const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function productImageSrc(id: string, image?: string | null) {
  const url = image?.trim();
  if (url) return url;
  return `https://picsum.photos/seed/${encodeURIComponent(id)}/600/450`;
}

export function validateProductImageFile(file: File): string | null {
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return "Product images must be 1 MB or smaller.";
  }
  if (!PRODUCT_IMAGE_ACCEPT.split(",").includes(file.type)) {
    return "Use JPG, PNG, WebP, or GIF for product images.";
  }
  return null;
}
