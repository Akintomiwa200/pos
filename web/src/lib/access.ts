import {
  ACCESS_NAV,
  DEPARTMENTS,
  NAV,
  accessTree,
  isNavGroup,
  type AccessNode,
  type DepartmentName,
  type NavItem,
  type NavNode,
  type NavSection,
} from "./nav";
import { PRODUCER_NAV, producerAccessTree } from "./producer-nav";

export type GroupScope = "tenant" | "producer";

export type ConsoleGroup = {
  id: string;
  name: string;
  scope?: GroupScope;
  departments: Array<DepartmentName | "*">;
  privileges: string[];
};

export type ConsoleAccount = {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string;
  groupId: string;
  active: boolean;
};

export type ConsoleSession = {
  token: string;
  id: string;
  name: string;
  email: string;
  username: string;
  groupId: string;
  groupName: string;
  scope?: GroupScope;
  departments: Array<DepartmentName | "*">;
  privileges: string[];
};

export function groupScope(group: { scope?: GroupScope } | null | undefined): GroupScope {
  return group?.scope === "producer" ? "producer" : "tenant";
}

export function sessionScope(session: { scope?: GroupScope } | null | undefined): GroupScope {
  return session?.scope === "producer" ? "producer" : "tenant";
}

export const SESSION_KEY = "hq.session.v1";

/** Always reachable when signed in (not shown as group privileges). */
const ALWAYS_ALLOWED_PATHS = ["/password", "/help"];

function nodeIds(node: NavNode): string[] {
  if (!isNavGroup(node)) return [node.id];
  return [node.id, ...node.children.flatMap(nodeIds)];
}

function itemIds(item: NavItem): string[] {
  return [item.id, ...(item.children ?? []).flatMap(nodeIds)];
}

export function allNavIds(): string[] {
  return [
    ...NAV.flatMap((section) => section.items.flatMap(itemIds)),
    ...ACCESS_NAV.flatMap((section) => section.items.flatMap(itemIds)),
  ];
}

function allSidebarIds(): string[] {
  return NAV.flatMap((section) => section.items.flatMap(itemIds));
}

function producerSidebarIds(): string[] {
  return PRODUCER_NAV.flatMap((section) => section.items.flatMap(itemIds));
}

function navFor(scope: GroupScope): NavSection[] {
  return scope === "producer" ? PRODUCER_NAV : NAV;
}

function treeFor(scope: GroupScope) {
  return scope === "producer" ? producerAccessTree() : accessTree();
}

function accessIds(node: AccessNode): string[] {
  return [node.id, ...(node.children ?? []).flatMap(accessIds)];
}

export function expandPrivileges(privileges: string[], scope: GroupScope = "tenant"): Set<string> {
  if (privileges.includes("*")) {
    return new Set(["*", ...allNavIds(), ...allSidebarIds(), ...producerSidebarIds()]);
  }
  const granted = new Set(privileges);

  function expand(node: AccessNode) {
    if (granted.has(node.id) && node.children?.length) {
      for (const id of accessIds(node)) granted.add(id);
      return;
    }
    for (const child of node.children ?? []) expand(child);
  }

  for (const section of treeFor(scope)) {
    for (const item of section.items) expand(item);
  }

  if (scope === "tenant") {
    for (const section of ACCESS_NAV) {
      for (const item of section.items) expand(itemToAccessNode(item));
    }
  }

  return granted;
}

function itemToAccessNode(item: NavItem): AccessNode {
  return {
    id: item.id,
    label: item.label,
    children: item.children?.map((node) =>
      isNavGroup(node)
        ? { id: node.id, label: node.label, children: node.children.map(nodeToAccessNode) }
        : { id: node.id, label: node.label },
    ),
  };
}

function nodeToAccessNode(node: NavNode): AccessNode {
  if (isNavGroup(node)) {
    return {
      id: node.id,
      label: node.label,
      children: node.children.map(nodeToAccessNode),
    };
  }
  return { id: node.id, label: node.label };
}

function filterNodes(nodes: NavNode[], granted: Set<string>): NavNode[] {
  if (granted.has("*")) return nodes;
  return nodes.flatMap((node): NavNode[] => {
    if (isNavGroup(node)) {
      if (granted.has(node.id)) return [node];
      const children = filterNodes(node.children, granted);
      return children.length ? [{ ...node, children }] : [];
    }
    return granted.has(node.id) ? [node] : [];
  });
}

function filterItem(item: NavItem, granted: Set<string>): NavItem[] {
  if (granted.has("*")) return [item];
  if (item.children?.length) {
    if (granted.has(item.id)) return [item];
    const children = filterNodes(item.children, granted);
    return children.length ? [{ ...item, children }] : [];
  }
  return granted.has(item.id) ? [item] : [];
}

export function hasDepartment(
  departments: Array<DepartmentName | "*">,
  heading: string,
) {
  return departments.includes("*") || departments.includes(heading as DepartmentName);
}

function filterSections(
  sections: NavSection[],
  departments: Array<DepartmentName | "*">,
  granted: Set<string>,
) {
  return sections.flatMap((section) => {
    if (!hasDepartment(departments, section.department)) return [];
    const items = section.items.flatMap((item) => filterItem(item, granted));
    if (!items.length) return [];
    return [{ heading: section.heading, department: section.department, items }];
  });
}

export function filterNav(
  departments: Array<DepartmentName | "*">,
  privileges: string[],
  scope: GroupScope = "tenant",
): NavSection[] {
  const granted = expandPrivileges(privileges, scope);
  return filterSections(navFor(scope), departments, granted);
}

export function filterAccessNav(
  departments: Array<DepartmentName | "*">,
  privileges: string[],
): NavSection[] {
  const granted = expandPrivileges(privileges);
  return filterSections(ACCESS_NAV, departments, granted);
}

function hrefsFromNodes(nodes: NavNode[]): string[] {
  return nodes.flatMap((node) => {
    if (isNavGroup(node)) return hrefsFromNodes(node.children);
    return [node.href];
  });
}

export function collectHrefs(sections: NavSection[]): string[] {
  return sections.flatMap((section) =>
    section.items.flatMap((item) => {
      if (item.href) return [item.href, ...(item.children ? hrefsFromNodes(item.children) : [])];
      return item.children ? hrefsFromNodes(item.children) : [];
    }),
  );
}

function isAlwaysAllowed(pathname: string) {
  return ALWAYS_ALLOWED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function pathMatchesHref(pathname: string, href: string) {
  const clean = href.split("?")[0];
  if (clean === "/admin") return pathname === "/admin";
  return pathname === clean || pathname.startsWith(`${clean}/`);
}

export function canAccessPath(
  pathname: string,
  departments: Array<DepartmentName | "*">,
  privileges: string[],
  scope: GroupScope = "tenant",
) {
  if (isAlwaysAllowed(pathname)) return true;
  const producerPath =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/super" ||
    pathname.startsWith("/super/");
  if (scope === "producer") {
    if (!producerPath) return false;
    if (privileges.includes("*")) return true;
    const hrefs = collectHrefs(filterNav(departments, privileges, "producer"));
    return hrefs.some((href) => pathMatchesHref(pathname, href));
  }
  if (producerPath) return false;
  if (privileges.includes("*")) return true;

  const hrefs = [
    ...collectHrefs(filterNav(departments, privileges, scope)),
    ...collectHrefs(filterAccessNav(departments, privileges)),
  ];

  return hrefs.some((href) => pathMatchesHref(pathname, href));
}

/** First page this group is allowed to open (for redirects). */
export function firstAllowedPath(
  departments: Array<DepartmentName | "*">,
  privileges: string[],
  scope: GroupScope = "tenant",
) {
  if (scope === "producer") {
    if (privileges.includes("*")) return "/admin";
    const hrefs = collectHrefs(filterNav(departments, privileges, "producer"));
    return hrefs[0] ?? "/admin";
  }
  if (privileges.includes("*")) return "/dashboard";
  const hrefs = collectHrefs(filterNav(departments, privileges));
  if (hrefs.includes("/dashboard")) return "/dashboard";
  return hrefs[0] ?? "/help";
}

export function homePathForSession(session: {
  departments: Array<DepartmentName | "*">;
  privileges: string[];
  scope?: GroupScope;
}) {
  return firstAllowedPath(session.departments, session.privileges, sessionScope(session));
}

/** Derive department flags from which sidebar sections have any granted privileges. */
export function departmentsFromPrivileges(
  privileges: string[],
  scope: GroupScope = "tenant",
): Array<DepartmentName | "*"> {
  if (privileges.includes("*")) return ["*"];
  const granted = expandPrivileges(privileges, scope);
  const depts = new Set<DepartmentName>();
  for (const section of navFor(scope)) {
    const ids = section.items.flatMap(itemIds);
    if (ids.some((id) => granted.has(id))) depts.add(section.department);
  }
  return depts.size ? [...depts] : [];
}

export function isChecked(granted: Set<string>, node: AccessNode): boolean {
  if (granted.has("*") || granted.has(node.id)) return true;
  if (!node.children?.length) return granted.has(node.id);
  return node.children.every((child) => isChecked(granted, child));
}

export function isIndeterminate(granted: Set<string>, node: AccessNode): boolean {
  if (!node.children?.length || granted.has("*") || granted.has(node.id)) return false;
  const some = node.children.some(
    (child) => isChecked(granted, child) || isIndeterminate(granted, child),
  );
  return some && !isChecked(granted, node);
}

export function compressPrivileges(granted: Set<string>, scope: GroupScope = "tenant"): string[] {
  if (granted.has("*")) return ["*"];
  const sidebarIds = scope === "producer" ? producerSidebarIds() : allSidebarIds();
  if (sidebarIds.length && sidebarIds.every((id) => granted.has(id))) return ["*"];
  const out: string[] = [];

  function walk(nodes: AccessNode[]) {
    for (const node of nodes) {
      if (isChecked(granted, node)) {
        out.push(node.id);
        continue;
      }
      if (node.children) walk(node.children);
    }
  }

  for (const section of treeFor(scope)) walk(section.items);
  return out;
}

export function accessParentMap(scope: GroupScope = "tenant"): Map<string, string | undefined> {
  const map = new Map<string, string | undefined>();
  function walk(nodes: AccessNode[], parent?: string) {
    for (const node of nodes) {
      map.set(node.id, parent);
      if (node.children) walk(node.children, node.id);
    }
  }
  for (const section of treeFor(scope)) walk(section.items);
  return map;
}

export function toggleAccessNode(
  granted: Set<string>,
  node: AccessNode,
  parentOf: Map<string, string | undefined>,
): Set<string> {
  const next = new Set(granted);
  next.delete("*");
  const ids = accessIds(node);
  const turnOn = !isChecked(granted, node);
  if (turnOn) {
    for (const id of ids) next.add(id);
  } else {
    for (const id of ids) next.delete(id);
    let parent = parentOf.get(node.id);
    while (parent) {
      next.delete(parent);
      parent = parentOf.get(parent);
    }
  }
  return next;
}

export { DEPARTMENTS };
