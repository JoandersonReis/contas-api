import { Module } from "@nestjs/common";
import { FoldersController } from "./folders.controller.js";
import { FoldersService } from "./folders.service.js";
import { FoldersRepository } from "./folders.repository.js";
import { AuthModule } from "../auth/auth.module.js";
@Module({
  imports: [AuthModule],
  controllers: [FoldersController],
  providers: [FoldersService, FoldersRepository],
})
export class FoldersModule {}
