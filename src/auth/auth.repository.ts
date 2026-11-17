import { Injectable } from "@nestjs/common";
import { db } from "../prisma/db.js";
@Injectable()
export class AuthRepository {
  createUser(data: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
  }) {
    return db.orm.public.User.create(data);
  }
  findUserByEmail(email: string) {
    return db.orm.public.User.where({ email }).first();
  }
  findPublicUser(id: string) {
    return db.orm.public.User.where({ id })
      .select("id", "name", "email")
      .first();
  }
  createSession(data: { id: string; userId: string; expiresAt: Date }) {
    return db.orm.public.Session.create(data);
  }
  findSession(id: string) {
    return db.orm.public.Session.where({ id }).first();
  }
  deleteSession(id: string) {
    return db.orm.public.Session.where({ id }).delete();
  }
}
