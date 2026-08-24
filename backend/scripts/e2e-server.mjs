/* Boots the compiled API against in-memory Postgres on :3001 for web E2E tests. */
import Module from "node:module";

process.env.DATABASE_URL = "postgres://smoke:test@localhost:5432/smoke";
process.env.PORT = "3001";

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
await app.listen(3001);
console.log("API ready on :3001 (pg-mem)");
