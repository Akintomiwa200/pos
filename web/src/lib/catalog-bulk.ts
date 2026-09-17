import { deleteCatalogItem } from "./hq-api";
import { importCatalogRows } from "./hq-setup";

export type ProductRef = { id: string; name: string };

export type BulkResult = { ok: number; failed: number };

async function setActiveOne(product: ProductRef, active: boolean) {
  await importCatalogRows([{ id: product.id, name: product.name, active }]);
}

export async function archiveProducts(products: ProductRef[]): Promise<BulkResult> {
  return setProductsActive(products, false);
}

export async function restoreProducts(products: ProductRef[]): Promise<BulkResult> {
  return setProductsActive(products, true);
}

export async function setProductsActive(
  products: ProductRef[],
  active: boolean,
): Promise<BulkResult> {
  if (!products.length) return { ok: 0, failed: 0 };
  try {
    await importCatalogRows(products.map((product) => ({ id: product.id, name: product.name, active })));
    return { ok: products.length, failed: 0 };
  } catch {
    let ok = 0;
    for (const product of products) {
      try {
        await setActiveOne(product, active);
        ok += 1;
      } catch {
        // keep going — report the remainder as failed
      }
    }
    return { ok, failed: products.length - ok };
  }
}

export async function deleteProducts(ids: string[]): Promise<BulkResult> {
  if (!ids.length) return { ok: 0, failed: 0 };
  const results = await Promise.allSettled(ids.map((id) => deleteCatalogItem(id)));
  const ok = results.filter((result) => result.status === "fulfilled").length;
  return { ok, failed: ids.length - ok };
}
