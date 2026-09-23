import { Router } from "express";
import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.ts";
import { requireSession } from "../../middleware/requireSession.ts";
import { BadRequestError, UnauthorizedError } from "../../lib/errors.ts";
import { mapService, parseLens } from "./map.service.ts";

const mapRouter: Router = Router({ mergeParams: true });

const readSlug = (req: Request): string => {
  const { slug } = req.params;
  if (typeof slug !== "string" || slug.length === 0) {
    throw new BadRequestError("Missing skill slug");
  }
  return slug;
};

const readNodeId = (req: Request): string => {
  const { nodeId } = req.params;
  if (typeof nodeId !== "string" || nodeId.length === 0) {
    throw new BadRequestError("Missing node id");
  }
  return nodeId;
};

const sessionOf = (req: Request) => {
  const session = req.session;
  if (!session) throw new UnauthorizedError();
  return session;
};

mapRouter.get(
  "/:lens",
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req);
    const map = await mapService.getForSkill(
      session.userId,
      readSlug(req),
      parseLens(req.params["lens"]),
    );

    res.json({ map });
  }),
);

mapRouter.post(
  "/:lens",
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req);
    const map = await mapService.generate(
      session.userId,
      readSlug(req),
      parseLens(req.params["lens"]),
    );
    res.status(201).json({ map });
  }),
);

mapRouter.post(
  "/:lens/nodes/:nodeId/expand",
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req);
    const result = await mapService.expand(session.userId, readNodeId(req));
    res.status(201).json(result);
  }),
);

mapRouter.post(
  "/:lens/nodes/:nodeId/promote",
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = sessionOf(req);
    const result = await mapService.promote(session.userId, readNodeId(req));
    res.status(201).json(result);
  }),
);

export { mapRouter };
