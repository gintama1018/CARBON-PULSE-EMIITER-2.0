import type { Request, Response } from "express";

export function requireUserId(req: Request, res: Response): string | null {
  const id = req.headers["x-user-id"];
  if (typeof id !== "string" || id.trim() === "") {
    res.status(401).json({ error: "x-user-id header is required" });
    return null;
  }
  return id.trim();
}
