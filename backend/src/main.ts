import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

loadEnv({ path: resolve(__dirname, "../.env") });
loadEnv({ path: resolve(process.cwd(), ".env") });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });
  app.setGlobalPrefix("api");
  await app.listen(process.env.PORT ?? 3001, "0.0.0.0");
}

bootstrap();
