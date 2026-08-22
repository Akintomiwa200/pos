const isDev = process.env.NODE_ENV === "development";

export class NetworkError extends Error {
  constructor() {
    super("Console API unavailable");
    this.name = "NetworkError";
  }
}

const USER_FACING = [
  "Product images must be 1 MB or smaller.",
  "Use JPG, PNG, WebP, or GIF for product images.",
  "Choose an image file to upload.",
  "Cloudinary is not configured",
  "Item not found",
  "Passwords do not match",
  "Enter a product name",
  "Add at least one data row.",
];

function looksTechnical(message: string) {
  const m = message.trim();
  if (!m) return true;
  if (m.length > 140) return true;
  if (/\n/.test(m)) return true;
  if (/\bat\s+\S+\(.+\)/.test(m)) return true;
  if (/^(TypeError|ReferenceError|SyntaxError|Error:)/i.test(m)) return true;
  if (/ECONNREFUSED|fetch failed|Failed to fetch|NetworkError|Unexpected token/i.test(m)) {
    return true;
  }
  return false;
}

export function resolveUserMessage(err: unknown, fallback: string): string {
  if (err instanceof NetworkError) {
    return isDev
      ? "HQ API is not running. Start the backend on port 3001."
      : "We couldn't reach the server. Check your connection and try again.";
  }

  if (err instanceof Error) {
    const message = err.message.trim();
    if (!message) return fallback;

    if (USER_FACING.some((line) => message.includes(line))) return message;

    if (looksTechnical(message)) {
      if (/cloudinary/i.test(message)) {
        return "Image upload isn't available right now. Save the item without a photo or try again later.";
      }
      if (/ECONNREFUSED|fetch failed|Failed to fetch/i.test(message)) {
        return "We couldn't reach the server. Check your connection and try again.";
      }
      return fallback;
    }

    return message;
  }

  return fallback;
}
