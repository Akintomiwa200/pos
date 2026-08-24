/* Smoke test: boots the compiled Nest app against an in-memory Postgres (pg-mem)
   and exercises the whole console auth flow. Run: node smoke-auth.mjs */
import Module from "node:module";

process.env.DATABASE_URL = "postgres://smoke:test@localhost:5432/smoke";
process.env.PORT = "3444";

const mem = (await import("pg-mem")).newDb();
const mockPg = mem.adapters.createPg();
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "pg") return mockPg;
  return origLoad.apply(this, arguments);
};

const { NestFactory } = await import("@nestjs/core");
const { AppModule } = await import("../dist/app.module.js");

const app = await NestFactory.create(AppModule, { logger: ["error", "warn"] });
app.setGlobalPrefix("api");
await app.listen(3444);

const base = "http://127.0.0.1:3444/api";
async function call(path, { method = "GET", body, token, expect } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (expect && res.status !== expect) {
    throw new Error(`${method} ${path} → ${res.status} (wanted ${expect}): ${JSON.stringify(data)}`);
  }
  return { status: res.status, data };
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// 1. login with seeded account (legacy seed passwords are hashed at seed time now)
const login = await call("/console/login", {
  method: "POST",
  body: { email: "emma.wang@example.com", password: "demo" },
  expect: 201,
});
check("login seeded admin", Boolean(login.data.token && login.data.user.privileges?.includes("*")));
const adminToken = login.data.token;

// 2. me()
const me = await call("/console/me", { token: adminToken, expect: 200 });
check("me returns session", me.data.user.username === "emma" && me.data.user.groupName === "Administrator");

// 3. bad password rejected
const bad = await call("/console/login", {
  method: "POST",
  body: { email: "emma", password: "wrong" },
});
check("bad password rejected", bad.status === 401, String(bad.data.message));

// 4. change password
await call("/console/password", {
  method: "POST",
  token: adminToken,
  body: { current: "demo", password: "newsecret1" },
  expect: 201,
});
const relaunch = await call("/console/login", {
  method: "POST",
  body: { username: "emma", password: "newsecret1" },
  expect: 201,
});
check("change password works", Boolean(relaunch.data.token));
// old session should have been revoked (single session per account)
const oldSession = await call("/console/me", { token: adminToken });
check("old session revoked after re-login", oldSession.status === 401);
const emmaToken = relaunch.data.token;

// 5. forgot-password → returns token when SMTP not configured
const forgot = await call("/console/forgot-password", {
  method: "POST",
  body: { email: "emma.wang@example.com" },
  expect: 201,
});
const resetToken = forgot.data.resetToken;
check("forgot password issues reset token", Boolean(resetToken));

// 6. reset-password
await call("/console/reset-password", {
  method: "POST",
  body: { token: resetToken, password: "brandnew2" },
  expect: 201,
});
const afterReset = await call("/console/login", {
  method: "POST",
  body: { email: "emma", password: "brandnew2" },
  expect: 201,
});
check("reset password works", Boolean(afterReset.data.token));
const reuseReset = await call("/console/reset-password", {
  method: "POST",
  body: { token: resetToken, password: "another3" },
});
check("reset token single-use", reuseReset.status === 400);

// 7. register-company onboarding
const signup = await call("/console/register-company", {
  method: "POST",
  body: {
    company: { name: "Test Mart Ltd", state: "Lagos" },
    account: {
      name: "Ada Owner",
      email: "ada@testmart.ng",
      username: "ada",
      password: "ownerpass1",
    },
  },
  expect: 201,
});
check(
  "register-company creates org+admin",
  signup.data.onboarding === "company" &&
    signup.data.company.name === "Test Mart Ltd" &&
    signup.data.user.groupName === "Administrator",
);

// duplicate signup rejected
const dupSignup = await call("/console/register-company", {
  method: "POST",
  body: {
    company: { name: "Other Co" },
    account: { name: "Ada Owner", email: "ada@testmart.ng", username: "ada2", password: "ownerpass1" },
  },
});
check("duplicate email rejected", dupSignup.status === 400 || dupSignup.status === 409, String(dupSignup.data.message));

// 8. google-config endpoint (GIS button gate)
const gcfg = await call("/console/auth/google-config", { expect: 200 });
check("google-config responds", gcfg.data.enabled === false && gcfg.data.clientId === null);

// 9. google auth without credential → clear error
const gnone = await call("/console/auth/google", {
  method: "POST",
  body: { credential: "", intent: "login" },
});
check("google without config errors clearly", gnone.status === 400, String(gnone.data.message));

// 10. accounts management via API
const accounts = await call("/console/accounts", { token: afterReset.data.token, expect: 200 });
check("accounts list hides password hashes", Array.isArray(accounts.data) && !("password_hash" in accounts.data[0]) && !("password" in accounts.data[0]));

// 11. notifications flow
const notes = await call("/console/notifications", { token: afterReset.data.token, expect: 200 });
check("notifications list", typeof notes.data.unread === "number" && Array.isArray(notes.data.items));

// 12. logout
await call("/console/logout", { method: "POST", token: afterReset.data.token, expect: 201 });
const gone = await call("/console/me", { token: afterReset.data.token });
check("logout invalidates session", gone.status === 401);

// 13. till lifecycle
const owner = await call("/console/login", {
  method: "POST",
  body: { email: "ada@testmart.ng", password: "ownerpass1" },
  expect: 201,
});
const ownerToken = owner.data.token;

const till = await call("/console/tills", {
  method: "POST",
  token: ownerToken,
  body: { name: "TILL-TEST-01", branchName: "Ikeja", product: "restaurant" },
  expect: 201,
});
check("till created with code", /^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/.test(till.data.code));

const activated = await call("/console/tills/activate", {
  method: "POST",
  body: { code: till.data.code, hardwareHex: "AA-BB-CC-DD" },
  expect: 201,
});
check("till activates on device", Boolean(activated.data.sessionToken && activated.data.pairedAt));

const beat = await call("/console/tills/heartbeat", {
  method: "POST",
  body: {
    code: till.data.code,
    hardwareHex: "AA-BB-CC-DD",
    sessionToken: activated.data.sessionToken,
  },
  expect: 201,
});
check("till heartbeat ok", Boolean(beat.data.lastSeenAt));

const wrongBeat = await call("/console/tills/heartbeat", {
  method: "POST",
  body: { code: till.data.code, hardwareHex: "FF-EE-DD-CC", sessionToken: "nope" },
});
check("heartbeat from other device rejected", wrongBeat.status === 409);

const renewed = await call(`/console/tills/${till.data.id}/renew`, { method: "POST", token: ownerToken, expect: 201 });
check("till renewed one year", new Date(renewed.data.subscriptionExpiresAt) > new Date());

const regen = await call(`/console/tills/${till.data.id}/regenerate`, { method: "POST", token: ownerToken, expect: 201 });
check("till code regenerated", regen.data.code !== till.data.code && !regen.data.hardwareHex);

await call(`/console/tills/${till.data.id}`, { method: "DELETE", token: ownerToken, expect: 200 });

// 14. invite + delete-account guard
const invite = await call("/console/accounts", {
  method: "POST",
  token: ownerToken,
  body: { name: "Cashier One", email: "cashier@testmart.ng", username: "cashier1", groupId: "g-sales", password: "cashpass1" },
  expect: 201,
});
check("account invited", Boolean(invite.data.id && !invite.data.password));
const cashierLogin = await call("/console/login", {
  method: "POST",
  body: { email: "cashier@testmart.ng", password: "cashpass1" },
  expect: 201,
});
check("invited account can login", cashierLogin.data.user.groupName === "Sales");
const del = await call(`/console/accounts/${invite.data.id}`, { method: "DELETE", token: ownerToken });
check("delete non-admin account ok", del.status === 200);
const delOwner = await call("/console/accounts", {
  method: "POST",
  token: ownerToken,
  body: { name: "Second Admin", email: "admin2@testmart.ng", username: "admin2", groupId: "g-admin", password: "adminpass1" },
  expect: 201,
});
const delAdmin = await call(`/console/accounts/${delOwner.data.id}`, { method: "DELETE", token: ownerToken });
check("second admin removable", delAdmin.status === 200);
// remove the other seeded administrator so only the company owner remains
const allAccounts = await call("/console/accounts", { token: ownerToken, expect: 200 });
const emmaId = allAccounts.data.find((row) => row.username === "emma")?.id;
if (emmaId) await call(`/console/accounts/${emmaId}`, { method: "DELETE", token: ownerToken });
const delLast = await call(`/console/accounts/${owner.data.user.id}`, { method: "DELETE", token: ownerToken });
check("last administrator protected", delLast.status === 400, String(delLast.data.message));

// 15. company profile persisted through setup endpoints
const company = await call("/console/setup/company", { expect: 200 });
check("company profile stored", company.data.name === "Test Mart Ltd");

await app.close();
const failed = results.filter((row) => !row.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
