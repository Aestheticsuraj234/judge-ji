import { Request, Response, NextFunction } from 'express';
import { ZodObject } from 'zod';

export const validateRequest = (schema: ZodObject<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      return next();
    } catch (error: any) {
      return res.status(422).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
  };
};
