import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { FolderDto, EntryDto } from "../dto";
import { FoldersRepository } from "./folders.repository";
@Injectable()
export class FoldersService {
  constructor(private readonly repository: FoldersRepository) {}
  private async own(userId: string, id: string) {
    const folder = await this.repository.findOwned(userId, id);
    if (!folder) throw new NotFoundException("Pasta não encontrada.");
    return folder;
  }
  async list(userId: string) {
    const folders = await this.repository.list(userId);
    return folders
      .map((folder) => ({
        ...folder,
        spentCents: folder.entries.reduce(
          (sum, entry) => sum + entry.amountCents,
          0,
        ),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async create(userId: string, dto: FolderDto) {
    return this.repository.create({
      id: randomUUID(),
      userId: userId,
      ...dto,
    });
  }
  async update(userId: string, id: string, dto: FolderDto) {
    const folder = await this.repository.update(userId, id, dto);
    if (!folder) throw new NotFoundException("Pasta não encontrada.");
    return folder;
  }
  async remove(userId: string, id: string) {
    const folder = await this.repository.remove(userId, id);
    if (!folder) throw new NotFoundException("Pasta não encontrada.");
    return { ok: true };
  }
  async createEntry(userId: string, id: string, dto: EntryDto) {
    await this.own(userId, id);
    return this.repository.createEntry({
      id: randomUUID(),
      folderId: id,
      ...dto,
    });
  }
  async updateEntry(
    userId: string,
    id: string,
    entryId: string,
    dto: EntryDto,
  ) {
    await this.own(userId, id);
    const entry = await this.repository.updateEntry(id, entryId, dto);
    if (!entry) throw new NotFoundException("Lançamento não encontrado.");
    return entry;
  }
  async removeEntry(userId: string, id: string, entryId: string) {
    await this.own(userId, id);
    const entry = await this.repository.removeEntry(id, entryId);
    if (!entry) throw new NotFoundException("Lançamento não encontrado.");
    return { ok: true };
  }
}
