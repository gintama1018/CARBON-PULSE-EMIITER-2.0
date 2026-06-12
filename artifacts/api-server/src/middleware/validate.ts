import { type Request, type Response, type NextFunction } from "express";

type ParseableSchema = {
  safeParse(data: unknown): { success: boolean; data?: unknown; error?: { issues: unknown[] } };
};

export function validate(schema: ParseableSchema, source: "body" | "query" | "params" = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      res.status(400).json({ error: "Validation failed", issues: result.error!.issues });
      return;
    }
    // req.query is a read-only getter in Express 5 — only mutate body and params
    if (source !== "query") {
      (req as unknown as Record<string, unknown>)[source] = result.data;
    }
    next();
  };
}
