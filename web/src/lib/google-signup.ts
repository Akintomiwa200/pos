const STORAGE_KEY = "hq.google.signup.credential";

export function writeGoogleSignupCredential(credential: string) {
  sessionStorage.setItem(STORAGE_KEY, credential.trim());
}

export function readGoogleSignupCredential() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(STORAGE_KEY)?.trim() || "";
}

export function clearGoogleSignupCredential() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function googleCredentialProfile(credential: string) {
  try {
    const part = credential.split(".")[1];
    if (!part) return { email: "", name: "" };
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { email?: string; name?: string };
    return {
      email: payload.email?.trim() || "",
      name: payload.name?.trim() || "",
    };
  } catch {
    return { email: "", name: "" };
  }
}
