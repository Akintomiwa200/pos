import { Injectable, Logger } from "@nestjs/common";
import nodemailer from "nodemailer";
import type Transporter from "nodemailer/lib/mailer";

export type AccountWelcomeMail = {
  to: string;
  name: string;
  username: string;
  groupName: string;
  companyName?: string;
  loginUrl: string;
  password?: string;
  invitedBy?: string;
  authProvider?: "password" | "google" | "both";
};

export type CompanyWelcomeMail = {
  to: string;
  name: string;
  username: string;
  companyName: string;
  loginUrl: string;
  authProvider?: "password" | "google" | "both";
};

export type PasswordResetMail = {
  to: string;
  name: string;
  resetUrl: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private transporterReady = false;

  isConfigured() {
    return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
  }

  hqAppUrl() {
    return (process.env.HQ_APP_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
  }

  loginUrl() {
    return `${this.hqAppUrl()}/login`;
  }

  private async getTransporter() {
    if (this.transporterReady) return this.transporter;
    this.transporterReady = true;

    const host = process.env.SMTP_HOST?.trim();
    const from = process.env.SMTP_FROM?.trim();
    if (!host || !from) {
      this.logger.warn("SMTP is not configured — emails will be logged only");
      return null;
    }

    const port = Number(process.env.SMTP_PORT?.trim() || "587");
    const secure =
      process.env.SMTP_SECURE?.trim() === "true" || String(port) === "465";
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: pass ?? "" } : undefined,
    });

    try {
      await this.transporter.verify();
      this.logger.log(`SMTP ready (${host}:${port})`);
    } catch (err) {
      this.logger.error(`SMTP verification failed: ${String(err)}`);
      this.transporter = null;
    }

    return this.transporter;
  }

  private async send(input: { to: string; subject: string; text: string; html: string }) {
    const from = process.env.SMTP_FROM?.trim();
    const transporter = await this.getTransporter();

    if (!transporter || !from) {
      this.logger.log(`[email skipped] To: ${input.to}\nSubject: ${input.subject}\n${input.text}`);
      return { sent: false as const, reason: "not_configured" as const };
    }

    try {
      await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      this.logger.log(`Email sent to ${input.to}: ${input.subject}`);
      return { sent: true as const };
    } catch (err) {
      this.logger.error(`Failed to send email to ${input.to}: ${String(err)}`);
      return { sent: false as const, reason: "send_failed" as const };
    }
  }

  private layout(title: string, bodyHtml: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#18181b;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
    <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#71717a;">POS HQ</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${title}</h1>
    ${bodyHtml}
    <p style="margin:24px 0 0;font-size:12px;color:#71717a;">If you did not expect this message, you can ignore it.</p>
  </div>
</body>
</html>`;
  }

  private button(href: string, label: string) {
    return `<p style="margin:24px 0 0;">
  <a href="${href}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:999px;">${label}</a>
</p>`;
  }

  async sendAccountWelcome(input: AccountWelcomeMail) {
    const companyLine = input.companyName
      ? `<p style="margin:0 0 12px;">Your HQ account for <strong>${input.companyName}</strong> is ready.</p>`
      : `<p style="margin:0 0 12px;">Your HQ account is ready.</p>`;

    const invitedLine = input.invitedBy
      ? `<p style="margin:0 0 12px;color:#52525b;">${input.invitedBy} created this account for you with the <strong>${input.groupName}</strong> group.</p>`
      : `<p style="margin:0 0 12px;color:#52525b;">You were added to the <strong>${input.groupName}</strong> group.</p>`;

    const passwordBlock = input.password
      ? `<p style="margin:16px 0 0;padding:14px 16px;background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;font-size:14px;line-height:1.6;">
  <strong>Username:</strong> ${input.username}<br/>
  <strong>Temporary password:</strong> ${input.password}<br/>
  <span style="color:#71717a;">Sign in and change your password after your first login.</span>
</p>`
      : input.authProvider === "google"
        ? `<p style="margin:16px 0 0;padding:14px 16px;background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;font-size:14px;line-height:1.6;">
  <strong>Username:</strong> ${input.username}<br/>
  <span style="color:#71717a;">Sign in with <strong>Google</strong> using this email address.</span>
</p>`
        : `<p style="margin:16px 0 0;padding:14px 16px;background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;font-size:14px;line-height:1.6;">
  <strong>Username:</strong> ${input.username}<br/>
  <span style="color:#71717a;">Use the password you chose when your account was created.</span>
</p>`;

    const textPassword = input.password
      ? `\nUsername: ${input.username}\nTemporary password: ${input.password}\n`
      : input.authProvider === "google"
        ? `\nUsername: ${input.username}\nSign in with Google using this email.\n`
        : `\nUsername: ${input.username}\nUse the password you set when the account was created.\n`;

    const subject = input.invitedBy
      ? `Your POS HQ account is ready`
      : `Welcome to POS HQ`;

    const html = this.layout(
      "Your HQ account is ready",
      `${companyLine}${invitedLine}${passwordBlock}${this.button(input.loginUrl, "Sign in to HQ")}`,
    );

    const text = `Hi ${input.name},

Your POS HQ account is ready.
Group: ${input.groupName}
${input.invitedBy ? `Created by: ${input.invitedBy}\n` : ""}${textPassword}
Sign in: ${input.loginUrl}
`;

    return this.send({ to: input.to, subject, text, html });
  }

  async sendCompanyWelcome(input: CompanyWelcomeMail) {
    const signInHint =
      input.authProvider === "google"
        ? `<span style="color:#71717a;">Sign in with <strong>Google</strong> using this email address.</span>`
        : `<span style="color:#71717a;">Sign in with the password you chose during registration.</span>`;
    const signInText =
      input.authProvider === "google"
        ? "Sign in with Google using this email address."
        : "Sign in with the password you chose during registration.";

    const html = this.layout(
      `Welcome to ${input.companyName}`,
      `<p style="margin:0 0 12px;">Hi ${input.name},</p>
<p style="margin:0 0 12px;color:#52525b;">Your company <strong>${input.companyName}</strong> is set up on POS HQ. You are the administrator for this organisation.</p>
<p style="margin:16px 0 0;padding:14px 16px;background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;font-size:14px;line-height:1.6;">
  <strong>Username:</strong> ${input.username}<br/>
  ${signInHint}
</p>
${this.button(input.loginUrl, "Open HQ console")}`,
    );

    const text = `Hi ${input.name},

Welcome to POS HQ. Your company "${input.companyName}" is ready.

Username: ${input.username}
${signInText}

Sign in: ${input.loginUrl}
`;

    return this.send({
      to: input.to,
      subject: `Welcome to POS HQ — ${input.companyName}`,
      text,
      html,
    });
  }

  async sendPasswordReset(input: PasswordResetMail) {
    const html = this.layout(
      "Reset your HQ password",
      `<p style="margin:0 0 12px;">Hi ${input.name},</p>
<p style="margin:0 0 12px;color:#52525b;">We received a request to reset your POS HQ password. This link expires in one hour.</p>
${this.button(input.resetUrl, "Set a new password")}
<p style="margin:16px 0 0;font-size:13px;color:#71717a;">If you did not request a reset, you can ignore this email.</p>`,
    );

    const text = `Hi ${input.name},

Reset your POS HQ password (expires in one hour):
${input.resetUrl}
`;

    return this.send({
      to: input.to,
      subject: "Reset your POS HQ password",
      text,
      html,
    });
  }
}
