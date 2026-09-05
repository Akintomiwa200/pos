import { expandPrivileges, sessionScope, type ConsoleSession } from "./access";

/** Each Settings page section maps to a grantable privilege `settings-<id>`. */
export const SETTINGS_SECTION_IDS = [
  "general",
  "appearance",
  "receipts",
  "invoices",
  "register",
  "sales",
  "inventory",
  "notifications",
  "people",
  "data",
  "advanced",
  "security",
  "organization",
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number];

/**
 * Sections that aggregate pages already protected by their own nav privileges
 * only show when at least one underlying privilege is granted too.
 */
const AGGREGATE_REQUIREMENTS: Partial<Record<SettingsSectionId, readonly string[]>> = {
  people: ["users-account", "users-group", "staff"],
  data: ["others-data", "others-export", "others-import"],
  advanced: ["others-tax", "others-payment-gateway"],
  organization: [
    "others-company",
    "others-branch",
    "others-store",
    "others-storefront",
    "others-payment-gateway",
    "others-tax",
  ],
};

export function grantedPrivileges(
  session: Pick<ConsoleSession, "privileges" | "scope"> | null | undefined,
): Set<string> {
  if (!session) return new Set();
  return expandPrivileges(session.privileges ?? [], sessionScope(session));
}

export function allowedSettingsSections(
  session: Pick<ConsoleSession, "privileges" | "scope"> | null | undefined,
): SettingsSectionId[] {
  const granted = grantedPrivileges(session);
  return SETTINGS_SECTION_IDS.filter((id) => {
    if (!granted.has(`settings-${id}`)) return false;
    const required = AGGREGATE_REQUIREMENTS[id];
    return !required || required.some((navId) => granted.has(navId));
  });
}