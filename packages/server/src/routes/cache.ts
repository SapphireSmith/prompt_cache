import { Response, Router } from "express";

import { ApiErrorResponse } from "../types";

export const cacheRouter = Router();

cacheRouter.get("/", (_req, res: Response<ApiErrorResponse>) => {
  res.status(501).json({
    success: false,
    error: {
      code: "NOT_IMPLEMENTED",
      message: "Cache routes will be added in the next phase."
    }
  });
});
