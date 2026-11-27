import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { NestFactory } from "@nestjs/core";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { AppModule } from "./app.module";

loadEnv({ path: resolve(__dirname, "../.env") });
loadEnv({ path: resolve(process.cwd(), ".env") });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const production = process.env.NODE_ENV === "production";
  const configuredOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (production && configuredOrigins.length === 0) {
    throw new Error("CORS_ORIGINS must list the trusted HTTPS app origins in production.");
  }
  if (production && configuredOrigins.some((origin) =>
    !origin.startsWith("https://") && origin !== "tauri://localhost" && origin !== "https://tauri.localhost"
  )) {
    throw new Error("Production CORS_ORIGINS may only contain HTTPS web origins or the Tauri app origin.");
  }
  const allowedOrigins = new Set(configuredOrigins);
  if (!production) {
    for (const origin of [
      "http://localhost:3000", "http://127.0.0.1:3000",
      "http://localhost:1420", "http://127.0.0.1:1420",
      "http://localhost:1430", "http://127.0.0.1:1430",
      "tauri://localhost", "https://tauri.localhost",
    ]) allowedOrigins.add(origin);
  }

  // Bound abusive clients without introducing a new runtime dependency. The
  // map is capped and periodically pruned so arbitrary IPs cannot exhaust it.
  const buckets = new Map<string, { count: number; resetAt: number }>();
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    if (production) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const authRoute = /^\/api\/(auth\/login|staff\/(unlock|authorize|pin(?:\/local)?|shift\/close|day\/close)|console\/(login|auth\/google|register|register-company|forgot-password|reset-password|verify-email(?:\/resend)?|tills\/activate))/.test(req.path);
    const limit = authRoute ? 20 : 600;
    const windowMs = authRoute ? 15 * 60_000 : 60_000;
    const now = Date.now();
    let bucket = buckets.get(ip);
    if (!bucket || bucket.resetAt <= now) {
      if (buckets.size >= 10_000) {
        for (const [key, value] of buckets) if (value.resetAt <= now) buckets.delete(key);
      }
      if (!bucket && buckets.size >= 10_000) {
        res.setHeader("Retry-After", "60");
        res.status(429).json({ statusCode: 429, message: "Request capacity reached" });
        return;
      }
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ statusCode: 429, message: "Too many requests" });
      return;
    }
    if (buckets.size > 10_000) {
      for (const [key, value] of buckets) if (value.resetAt <= now) buckets.delete(key);
    }
    next();
  });
  // Webhook signatures are computed over the exact bytes sent by the provider.
  const captureRaw = (req: unknown, _res: unknown, buf: Buffer) => {
    (req as { rawBody?: Buffer }).rawBody = Buffer.from(buf);
  };
  app.use(express.json({ limit: "25mb", verify: captureRaw }));
  app.use(express.urlencoded({ extended: true, limit: "25mb", verify: captureRaw }));
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      // Native clients and server-to-server webhooks do not send Origin.
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed"), false);
    },
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    maxAge: 600,
  });
  app.setGlobalPrefix("api");
  await app.listen(process.env.PORT ?? 3001, "0.0.0.0");
}

bootstrap();
