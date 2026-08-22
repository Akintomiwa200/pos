import { api } from "./hq-api";
import {
  deleteDirectory,
  listDirectory,
  saveDirectory,
  type DirectoryRecord,
} from "./hq-directory";

export type TaxonomyRecord = DirectoryRecord & {
  extra?: Record<string, string | number | boolean | null>;
};

export type TaxonomyUsage = {
  categories: Array<{ name: string; products: number }>;
  subcategories: Array<{ name: string; products: number }>;
  units: Array<{ name: string; products: number }>;
};

export async function listCategories() {
  return listDirectory("item-groups") as Promise<TaxonomyRecord[]>;
}

export async function saveCategory(record: Partial<TaxonomyRecord>) {
  return saveDirectory("item-groups", record) as Promise<TaxonomyRecord>;
}

export async function deleteCategory(id: string) {
  await deleteDirectory("item-groups", id);
}

export async function listSubcategories() {
  return listDirectory("item-subgroups") as Promise<TaxonomyRecord[]>;
}

export async function saveSubcategory(record: Partial<TaxonomyRecord>) {
  return saveDirectory("item-subgroups", record) as Promise<TaxonomyRecord>;
}

export async function deleteSubcategory(id: string) {
  await deleteDirectory("item-subgroups", id);
}

export async function listUnits() {
  return listDirectory("units") as Promise<TaxonomyRecord[]>;
}

export async function saveUnit(record: Partial<TaxonomyRecord>) {
  return saveDirectory("units", record) as Promise<TaxonomyRecord>;
}

export async function deleteUnit(id: string) {
  await deleteDirectory("units", id);
}

export async function getTaxonomyUsage() {
  return api<TaxonomyUsage>("/api/catalog/taxonomy/usage");
}

export async function renameTaxonomy(
  field: "category" | "subcategory" | "unit",
  from: string,
  to: string,
) {
  return api<{ updated: number }>("/api/catalog/taxonomy/rename", {
    method: "POST",
    body: JSON.stringify({ field, from, to }),
  });
}

export function unitCode(record: TaxonomyRecord) {
  return (record.note?.trim() || record.name.toLowerCase()).slice(0, 24);
}

export function unitKindFromRecord(record: TaxonomyRecord) {
  const kind = record.extra?.kind;
  return typeof kind === "string" ? kind : null;
}

export function subcategoryParentId(record: TaxonomyRecord) {
  const id = record.extra?.categoryId;
  return typeof id === "string" ? id : "";
}

export function subcategoryParentName(record: TaxonomyRecord) {
  const name = record.extra?.categoryName;
  return typeof name === "string" ? name : "";
}

export function productCount(
  usage: TaxonomyUsage | null,
  field: "categories" | "subcategories" | "units",
  name: string,
) {
  if (!usage) return 0;
  return usage[field].find((row) => row.name.toLowerCase() === name.toLowerCase())?.products ?? 0;
}
