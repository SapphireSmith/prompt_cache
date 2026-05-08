import { Router, Response } from "express";

import { HealthResponse } from "../types";

export const healthRouter = Router();

healthRouter.get("/", (_req, res: Response<HealthResponse>) => {
  res.status(200).json({
    success: true,
    status: "ok"
  });
});
