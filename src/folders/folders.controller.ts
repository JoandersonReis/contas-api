import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AuthGuard, type AuthRequest } from "../auth/auth.guard.js";
import { FolderDto, EntryDto } from "../dto.js";
import { FoldersService } from "./folders.service.js";
@Controller("folders")
@UseGuards(AuthGuard)
export class FoldersController {
  constructor(private readonly service: FoldersService) {}
  @Get() async list(@Req() req: AuthRequest) {
    return this.service.list(req.userId);
  }
  @Post() create(@Req() req: AuthRequest, @Body() dto: FolderDto) {
    return this.service.create(req.userId, dto);
  }
  @Put(":id") async update(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: FolderDto,
  ) {
    return this.service.update(req.userId, id, dto);
  }
  @Delete(":id") async remove(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(req.userId, id);
  }
  @Post(":id/entries") async createEntry(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: EntryDto,
  ) {
    return this.service.createEntry(req.userId, id, dto);
  }
  @Put(":id/entries/:entryId") async updateEntry(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("entryId", ParseUUIDPipe) entryId: string,
    @Body() dto: EntryDto,
  ) {
    return this.service.updateEntry(req.userId, id, entryId, dto);
  }
  @Delete(":id/entries/:entryId") async removeEntry(
    @Req() req: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("entryId", ParseUUIDPipe) entryId: string,
  ) {
    return this.service.removeEntry(req.userId, id, entryId);
  }
}
