import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import * as argon2 from "argon2";
import { LoginDto, RegisterDto } from "../dto";
import { AuthRepository } from "./auth.repository";
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
@Injectable()
export class AuthService {
  constructor(private readonly repository: AuthRepository) {}
  private async session(userId: string) {
    const token = randomBytes(32).toString("hex");
    await this.repository.createSession({
      id: digest(token),
      userId,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });

    return { token, user: await this.repository.findPublicUser(userId) };
  }
  async register(dto: RegisterDto) {
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2d,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
    let user;
    try {
      user = await this.repository.createUser({
        id: randomUUID(),
        name: dto.name,
        email: dto.email,
        passwordHash,
      });
    } catch (error) {
      if ((error as { sqlState?: string }).sqlState === "23505")
        throw new ConflictException("Este e-mail já está cadastrado.");
      throw error;
    }
    return this.session(user.id);
  }
  async login(dto: LoginDto) {
    const user = await this.repository.findUserByEmail(dto.email);
    if (!user) {
      await argon2.hash(dto.password, {
        type: argon2.argon2d,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    }
    if (!(await argon2.verify(user.passwordHash, dto.password)))
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    return this.session(user.id);
  }

  me(userId: string) {
    return this.repository.findPublicUser(userId);
  }
  async logout(token: unknown) {
    if (typeof token === "string")
      await this.repository.deleteSession(digest(token));
    return { ok: true };
  }
  async authenticate(token: string) {
    const session = await this.repository.findSession(digest(token));
    if (!session || session.expiresAt <= new Date())
      throw new UnauthorizedException("Sua sessão expirou. Entre novamente.");
    return session.userId;
  }
}
