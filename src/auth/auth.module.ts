import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";

@Module({
  exports: [AuthGuard, AuthService],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AuthGuard],
})
export class AuthModule {}
