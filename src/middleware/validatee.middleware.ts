import { Request, Response, NextFunction } from 'express';
import { ZodObject , ZodError } from 'zod';

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
      if(error instanceof ZodError){
          return res.status(422).json({
       error: 'Validation failed',
          details: error.issues
        });
      }
      return res.status(500).json({
        
        details: "internal validation error"
      });
    }
  };
};
