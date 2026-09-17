export const MAX_PRODUCT_IMAGE_BYTES = 1024 * 1024;

export const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function productImageSrc(id: string, image?: string | null) {
  return image?.trim() || "";
}

/**
 * Resolve a product's photo. A pack/carton (composite, not counted on its own)
 * shows its own photo, falling back to the base product's photo so every higher
 * unit mirrors the piece it is made of.
 */
export function productImageFor(
  item: { image?: string | null; baseId?: string | null },
  base?: { image?: string | null } | null,
) {
  if (item.image?.trim()) return item.image.trim();
  if (base?.image?.trim()) return base.image.trim();
  return "";
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
