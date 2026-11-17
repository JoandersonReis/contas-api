import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthService } from "./auth.service.js";

@Module({
  exports: [AuthGuard, AuthService],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AuthGuard],
})
export class AuthModule {}
