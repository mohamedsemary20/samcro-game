import type { NextFunction, Request, RequestHandler, Response } from 'express'

export function asyncRoute(handler: (request: Request, response: Response) => Promise<unknown>): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response).catch(next)
  }
}
