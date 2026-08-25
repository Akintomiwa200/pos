export type AccountDraft = {
  id?: string;
  name: string;
  email: string;
  username: string;
  password: string;
  groupId: string;
  active: boolean;
};

export type AccountFieldErrors = Partial<
  Record<"name" | "email" | "username" | "password" | "groupId", string>
>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

export function validateAccountDraft(
  draft: AccountDraft,
  options?: { requirePassword?: boolean },
): AccountFieldErrors {
  const errors: AccountFieldErrors = {};
  const name = draft.name.trim();
  const email = draft.email.trim().toLowerCase();
  const username = draft.username.trim().toLowerCase();
  const password = draft.password.trim();
  const groupId = draft.groupId.trim();
  const isNew = !draft.id;
  const requirePassword = options?.requirePassword ?? isNew;

  if (!name) errors.name = "Name is required";
  if (!email) errors.email = "Email is required";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address";
  if (!username) errors.username = "Username is required";
  else if (!USERNAME_RE.test(username)) {
    errors.username =
      "Use 3–32 characters: letters, numbers, dots, underscores, or hyphens";
  }
  if (!groupId) errors.groupId = "Group is required";
  if (requirePassword && !password) errors.password = "Password is required";
  else if (password && password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  return errors;
}

export function firstAccountError(errors: AccountFieldErrors) {
  return (
    errors.name ||
    errors.email ||
    errors.username ||
    errors.groupId ||
    errors.password ||
    null
  );
}
