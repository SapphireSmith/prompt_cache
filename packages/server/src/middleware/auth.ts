import { NextFunction, Request, Response } from "express";

export function requireApiKey(_req: Request, _res: Response, next: NextFunction): void {
  next();
}

