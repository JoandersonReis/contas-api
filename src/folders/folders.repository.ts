import { Injectable } from "@nestjs/common";
import { db } from "../prisma/db.js";
import { FolderDto, EntryDto } from "../dto.js";
@Injectable()
export class FoldersRepository {
  findOwned(userId: string, id: string) {
    return db.orm.public.Folder.where({ id, userId }).first();
  }
  list(userId: string) {
    return db.orm.public.Folder.where({ userId }).include("entries").all();
  }
  create(data: FolderDto & { id: string; userId: string }) {
    return db.orm.public.Folder.create(data);
  }
  update(userId: string, id: string, data: FolderDto) {
    return db.orm.public.Folder.where({ id, userId }).update(data);
  }
  remove(userId: string, id: string) {
    return db.orm.public.Folder.where({ id, userId }).delete();
  }
  createEntry(data: EntryDto & { id: string; folderId: string }) {
    return db.orm.public.Entry.create(data);
  }
  updateEntry(folderId: string, id: string, data: EntryDto) {
    return db.orm.public.Entry.where({ id, folderId }).update(data);
  }
  removeEntry(folderId: string, id: string) {
    return db.orm.public.Entry.where({ id, folderId }).delete();
  }
}
