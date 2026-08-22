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

export type ConsoleGroup = {
  id: string;
  name: string;
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
  departments: Array<DepartmentName | "*">;
  privileges: string[];
};

export const SESSION_KEY = "hq.session.v1";

function nodeIds(node: NavNode): string[] {
  if (!isNavGroup(node)) return [node.id];
  return [node.id, ...node.children.flatMap(nodeIds)];
}

function itemIds(item: NavItem): string[] {
  return [item.id, ...(item.children ?? []).flatMap(nodeIds)];
}

export function allNavIds(): string[] {
  return ACCESS_NAV.flatMap((section) => section.items.flatMap(itemIds));
}

function accessIds(node: AccessNode): string[] {
  return [node.id, ...(node.children ?? []).flatMap(accessIds)];
}

export function expandPrivileges(privileges: string[]): Set<string> {
  if (privileges.includes("*")) return new Set(["*", ...allNavIds()]);
  const granted = new Set(privileges);

  function expand(node: AccessNode) {
    if (granted.has(node.id) && node.children?.length) {
      for (const id of accessIds(node)) granted.add(id);
      return;
    }
    for (const child of node.children ?? []) expand(child);
  }

  for (const section of accessTree()) {
    for (const item of section.items) expand(item);
  }
  return granted;
}

function filterNodes(nodes: NavNode[], granted: Set<string>): NavNode[] {
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
): NavSection[] {
  const granted = expandPrivileges(privileges);
  return filterSections(NAV, departments, granted);
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

const OPEN_PATHS = new Set([
  "/dashboard",
  "/password",
  "/admin",
  "/procurement",
  "/audit",
  "/it",
  "/finance",
  "/hr",
  "/catalog",
]);

export function canAccessPath(
  pathname: string,
  departments: Array<DepartmentName | "*">,
  privileges: string[],
) {
  if (OPEN_PATHS.has(pathname) || pathname.startsWith("/verticals/")) return true;
  const sections = filterAccessNav(departments, privileges);
  return collectHrefs(sections).some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
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

export function compressPrivileges(granted: Set<string>): string[] {
  if (granted.has("*") || allNavIds().every((id) => granted.has(id))) return ["*"];
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

  for (const section of accessTree()) walk(section.items);
  return out;
}

export function accessParentMap(): Map<string, string | undefined> {
  const map = new Map<string, string | undefined>();
  function walk(nodes: AccessNode[], parent?: string) {
    for (const node of nodes) {
      map.set(node.id, parent);
      if (node.children) walk(node.children, node.id);
    }
  }
  for (const section of accessTree()) walk(section.items);
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
