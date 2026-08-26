/** Canonical Google OAuth names used by the API and the web app. */
export function googleClientId(): string {
  return (
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    ""
  );
}

export function googleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
}
