import type { Request } from "express";

export type AuthRequest = Request & { userId: string };

export const cookieName = "contas_session";

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api",
};
