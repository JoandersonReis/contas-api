import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { cookieName, type AuthRequest } from "./auth.http.js";
export type { AuthRequest } from "./auth.http.js";
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly service: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = req.cookies?.[cookieName];
    if (typeof token !== "string")
      throw new UnauthorizedException("Entre para continuar.");
    req.userId = await this.service.authenticate(token);
    return true;
  }
}
