import { toast as sonner } from "sonner";
import { resolveUserMessage } from "./errors";

export { resolveUserMessage } from "./errors";

function logDev(err: unknown, message: string) {
  if (process.env.NODE_ENV === "development" && err instanceof Error && err.message !== message) {
    console.error("[toast]", err);
  }
}

/** App-wide toast — use instead of importing from `sonner` directly. */
export const toast = {
  success(message: string) {
    sonner.success(message);
  },
  info(message: string) {
    sonner.info(message);
  },
  warning(message: string) {
    sonner.warning(message);
  },
  /** Pass a string for a fixed message, or an error + fallback for production-safe text. */
  error(errOrMessage: unknown, fallback = "Something went wrong. Try again.") {
    if (typeof errOrMessage === "string") {
      sonner.error(errOrMessage);
      return;
    }
    const message = resolveUserMessage(errOrMessage, fallback);
    logDev(errOrMessage, message);
    sonner.error(message);
  },
  promise<T>(promise: Promise<T>, messages: { loading: string; success: string; error: string }) {
    return sonner.promise(promise, messages);
  },
};

export const notifySuccess = toast.success;
export const notifyError = toast.error;
export const notifyInfo = toast.info;
export const notifyWarning = toast.warning;
export const notifyPromise = toast.promise;
