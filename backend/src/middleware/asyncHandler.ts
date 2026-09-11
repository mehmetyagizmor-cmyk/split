import type { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/**
 * Express, async controller içinde fırlatılan hataları otomatik yakalamaz —
 * unutulursa sunucu sessizce "hang" olur ya da unhandled rejection loglanır.
 * Bu sarmalayıcı, her async controller'ı try/catch yazmaktan kurtarıp
 * hatayı otomatik olarak `next(error)` ile merkezi error handler'a iletir.
 */
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
