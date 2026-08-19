# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

Only the latest development line on the default branch receives security fixes
until a stable release process is published.

## Reporting a vulnerability

Do **not** open a public issue for security problems.

Please report vulnerabilities through GitHub's **private vulnerability reporting**
(Security → Report a vulnerability) on this repository.

Include:

- A short description of the issue
- Affected app (`backend`, `pos`, `web`, or `price-check`)
- Steps to reproduce
- Impact (data exposure, till takeover, privilege escalation, and so on)
- Any suggested fix, if you have one

You should receive an acknowledgement within 7 days. We will keep you updated
on triage and remediation. Please give us a reasonable window to patch before
any public disclosure.

## Scope

In scope:

- Authentication and authorization on HQ or the till
- Till activation, session takeover, and subscription checks
- Exposure of secrets, tokens, or customer/payment data
- Injection, path traversal, or unsafe deserialization in the API

Out of scope:

- Denial of service against a local development server
- Issues that require physical access to an already unlocked till
- Reports that depend on leaked demo or local-only credentials

## Secrets and local data

Never commit `.env` files, till session tokens, or `backend/data/` runtime
files. See `.gitignore` and `.env.example`.
