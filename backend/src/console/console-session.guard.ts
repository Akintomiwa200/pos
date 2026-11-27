import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { ConsoleService } from "./console.service";

type ConsoleRequest = Request & { query: Request["query"] & { token?: string } };

/** Require a live HQ session for the console API, with explicit public flows. */
@Injectable()
export class ConsoleSessionGuard implements CanActivate {
  constructor(private readonly console: ConsoleService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ConsoleRequest>();
    const method = request.method.toUpperCase();
    const path = request.path.replace(/^\/api\/console\/?/, "").replace(/\/$/, "");
    if (this.isPublic(method, path)) return true;

    const authorization = request.headers.authorization ?? "";
    const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const token = bearer || (typeof request.query.token === "string" ? request.query.token.trim() : "");
    if (!token) throw new UnauthorizedException("Sign in to continue");

    // Till configuration sync uses its paired device session, never an HQ user
    // credential. Keep this narrow to the two read-only sync endpoints.
    if ((method === "GET" && path === "setup") ||
        (method === "GET" && path === "setup/settings/stream")) {
      try {
        await this.console.me(token);
      } catch {
        await this.console.requireTillSession(token);
      }
      return true;
    }

    // Platform-wide administration must never be reachable by a tenant session.
    if (this.isProducerOnly(method, path)) {
      await this.console.requireProducer(token);
    } else {
      await this.console.me(token);
    }
    return true;
  }

  private isPublic(method: string, path: string): boolean {
    if (method === "POST" && [
      "login", "register", "register-company", "auth/google",
      "forgot-password", "reset-password", "verify-email/resend",
    ].includes(path)) return true;
    if (method === "GET" && ["verify-email", "auth/google-config", "groups", "billing/plans"].includes(path)) return true;
    if (method === "POST" && ["tills/activate", "tills/heartbeat"].includes(path)) return true;
    return false;
  }

  private isProducerOnly(method: string, path: string): boolean {
    if (path.startsWith("admin/")) return true;
    if (path === "security/overview") return true;
    if (path === "data-transfer/import") return true;
    if (path === "backup" || path.startsWith("backup/")) return true;
    if (path.startsWith("billing/")) {
      if (method === "GET" && path === "billing/plans") return false;
      return true;
    }
    return false;
  }
}
