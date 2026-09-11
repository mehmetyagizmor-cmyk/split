import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

/**
 * Request'in body/params/query'sini verilen Zod şemasına göre doğrular.
 * Şema geçersizse ZodError fırlatır — errorHandler bunu 400'e çevirir.
 * Geçerliyse doğrulanmış (ve varsayılan değerleri uygulanmış) veriyi
 * req.body/params/query'nin yerine yazar, controller'lar temiz veriyle çalışır.
 *
 * Kullanım: router.post("/", validate({ body: createOrderSchema }), controller)
 */
export function validate(schemas: {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.params) {
      // Express'in ParamsDictionary/ParsedQs tipleri Zod'un ürettiği tiple
      // birebir eşleşmiyor; doğrulama çalışma zamanında zaten yapıldığı için
      // burada güvenle cast ediyoruz.
      req.params = schemas.params.parse(req.params) as typeof req.params;
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query) as typeof req.query;
    }
    next();
  };
}
