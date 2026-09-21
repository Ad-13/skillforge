import { Router } from "express";
import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.ts";
import { requireSession } from "../../middleware/requireSession.ts";
import { BadRequestError, UnauthorizedError } from "../../lib/errors.ts";
import { mapService } from "./map.service.ts";

const mapRouter: Router = Router({ mergeParams: true });

const readSlug = (req: Request): string => {
  const { slug } = req.params;
  if (typeof slug !== "string" || slug.length === 0) {
    throw new BadRequestError("Missing skill slug");
  }
  return slug;
};

mapRouter.get(
  "/",
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = req.session;
    if (!session) throw new UnauthorizedError();

    const map = await mapService.getForSkill(session.userId, readSlug(req));

    res.json({ map });
  }),
);

mapRouter.post(
  "/",
  requireSession,
  asyncHandler(async (req: Request, res: Response) => {
    const session = req.session;
    if (!session) throw new UnauthorizedError();

    const map = await mapService.generateForSkill(
      session.userId,
      readSlug(req),
    );
    res.status(201).json({ map });
  }),
);

export { mapRouter };
