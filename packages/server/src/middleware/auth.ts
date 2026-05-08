import { NextFunction, Request, Response } from "express";

import { ApiErrorResponse } from "../types";

export function requireApiKey(expectedApiKey: string) {
  return (req: Request, res: Response<ApiErrorResponse>, next: NextFunction): void => {
    const providedApiKey = req.header("x-api-key")?.trim();

    if (!providedApiKey || providedApiKey !== expectedApiKey) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or missing API key."
        }
      });

      return;
    }

    next();
  };
}
