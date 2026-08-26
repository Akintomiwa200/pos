/** Same name as the API: GOOGLE_CLIENT_ID (also accepts the old Next.js prefix). */
export function googleClientId(): string {
  return (
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    ""
  );
}
