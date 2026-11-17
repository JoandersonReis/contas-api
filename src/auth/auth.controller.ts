import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { LoginDto, RegisterDto } from "../dto.js";
import { AuthService } from "./auth.service.js";
import { AuthGuard } from "./auth.guard.js";
import { cookieName, cookieOptions, type AuthRequest } from "./auth.http.js";
@Controller("auth")
export class AuthController {
  constructor(private readonly service: AuthService) {}
  private respond(
    session: Awaited<ReturnType<AuthService["login"]>>,
    res: Response,
  ) {
    res.cookie(cookieName, session.token, {
      ...cookieOptions,
      maxAge: 7 * 86400000,
    });
    return session.user;
  }
  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(await this.service.register(dto), res);
  }
  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(await this.service.login(dto), res);
  }
  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() req: AuthRequest) {
    return this.service.me(req.userId);
  }
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.service.logout(req.cookies?.[cookieName]);
    res.clearCookie(cookieName, cookieOptions);
    return result;
  }
}
