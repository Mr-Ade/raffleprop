import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = formatZodError(result.error);
      res.status(422).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(422).json({
        success: false,
        error: 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        details: formatZodError(result.error),
      });
      return;
    }
    req.query = result.data as Record<string, string>;
    next();
  };
}

function formatZodError(err: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.');
    if (!out[key]) out[key] = [];
    out[key].push(issue.message);
  }
  return out;
}
