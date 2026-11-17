import "reflect-metadata";
import "dotenv/config";
import {
  Injectable,
  Module,
  OnApplicationShutdown,
  ValidationPipe,
} from "@nestjs/common";
import { APP_GUARD, NestFactory } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AuthModule } from "./auth/auth.module.js";
import { FoldersModule } from "./folders/folders.module.js";
import { db } from "./prisma/db.js";
import { allowedWebOrigins } from "./origins.js";
@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  async onApplicationShutdown() {
    await db.close();
  }
}
@Module({
  imports: [
    AuthModule,
    FoldersModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
  ],
  providers: [
    DatabaseLifecycle,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
class AppModule {}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.use(helmet());
  app.use(cookieParser());
  const origins = allowedWebOrigins(
    process.env.WEB_ORIGIN,
    process.env.NODE_ENV,
  );
  app.enableCors({ origin: origins, credentials: true });
  app.use(
    (
      req: import("express").Request,
      res: import("express").Response,
      next: import("express").NextFunction,
    ) => {
      if (
        !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
        (!req.headers.origin || !origins.includes(req.headers.origin))
      ) {
        res.status(403).json({ message: "Origem não permitida." });
        return;
      }
      next();
    },
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  await app.listen(
    Number(process.env.PORT || 3000),
    process.env.HOST || "0.0.0.0",
  );
}
void bootstrap();
