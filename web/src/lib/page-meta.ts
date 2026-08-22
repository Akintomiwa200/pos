import { ACCESS_NAV, NAV, isNavGroup, type NavNode, type NavSection } from "./nav";

/** Section headings — not shown in the navbar breadcrumb. */
const SKIP_HEADINGS = new Set([
  "Report",
  "Transaction",
  "Setup",
  "Main Menu",
  "Analytics",
  "Apps",
  "Settings",
]);

const STATIC_CRUMBS: Record<string, string[]> = {
  "/dashboard": ["Dashboard"],
  "/password": ["Password"],
  "/catalog": ["Products", "Scan Barcode"],
  "/admin": ["Admin"],
  "/procurement": ["Procurement"],
  "/audit": ["Audit"],
  "/it": ["IT"],
  "/finance": ["Finance"],
  "/hr": ["HR"],
};

function dedupeConsecutive(crumbs: string[]) {
  return crumbs.filter((crumb, index) => index === 0 || crumb !== crumbs[index - 1]);
}

function cleanCrumbs(crumbs: string[]) {
  return dedupeConsecutive(crumbs.filter((crumb) => !SKIP_HEADINGS.has(crumb)));
}

type RegistryEntry = { crumbs: string[]; priority: number };

function register(
  registry: Map<string, RegistryEntry>,
  href: string,
  crumbs: string[],
  priority: number,
) {
  const next = cleanCrumbs(crumbs);
  if (!next.length) return;
  const prev = registry.get(href);
  if (!prev || priority >= prev.priority) {
    registry.set(href, { crumbs: next, priority });
  }
}

function ingestNav(registry: Map<string, RegistryEntry>, sections: NavSection[], priority: number) {
  function walk(nodes: NavNode[], ancestors: string[]) {
    for (const node of nodes) {
      if (isNavGroup(node)) {
        walk(node.children, [...ancestors, node.label]);
        continue;
      }
      register(registry, node.href, [...ancestors, node.label], priority);
    }
  }

  for (const section of sections) {
    for (const item of section.items) {
      if (item.href) {
        register(registry, item.href, [item.label], priority);
      }
      if (item.children?.length) {
        walk(item.children, [item.label]);
      }
    }
  }
}

let registryCache: Map<string, string[]> | null = null;

function pageRegistry() {
  if (registryCache) return registryCache;

  const registry = new Map<string, RegistryEntry>();
  ingestNav(registry, ACCESS_NAV, 1);
  ingestNav(registry, NAV, 2);

  registryCache = new Map(
    Array.from(registry.entries(), ([href, entry]) => [href, entry.crumbs]),
  );
  return registryCache;
}

export function resolvePageCrumbs(pathname: string): string[] {
  if (STATIC_CRUMBS[pathname]) return STATIC_CRUMBS[pathname];

  const registry = pageRegistry();
  let bestHref: string | null = null;

  for (const href of registry.keys()) {
    const matches =
      pathname === href || (href.length > 1 && pathname.startsWith(`${href}/`));
    if (matches && (!bestHref || href.length > bestHref.length)) {
      bestHref = href;
    }
  }

  if (bestHref) return registry.get(bestHref)!;

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()));

  return segments.length ? segments : ["HQ"];
}

export function flattenNavForSearch(nav: NavSection[]) {
  const hits: { href: string; label: string; trail: string }[] = [];
  const registry = pageRegistry();

  function walk(nodes: NavNode[], ancestors: string[]) {
    for (const node of nodes) {
      if (isNavGroup(node)) {
        walk(node.children, [...ancestors, node.label]);
        continue;
      }
      const crumbs = registry.get(node.href) ?? cleanCrumbs([...ancestors, node.label]);
      hits.push({
        href: node.href,
        label: crumbs[crumbs.length - 1] ?? node.label,
        trail: crumbs.join(" · "),
      });
    }
  }

  for (const section of nav) {
    for (const item of section.items) {
      if (item.href) {
        const crumbs = registry.get(item.href) ?? cleanCrumbs([item.label]);
        hits.push({
          href: item.href,
          label: crumbs[crumbs.length - 1] ?? item.label,
          trail: crumbs.join(" · "),
        });
      }
      if (item.children?.length) {
        walk(item.children, [item.label]);
      }
    }
  }

  return hits;
}
