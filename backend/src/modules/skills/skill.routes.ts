import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler.ts";
import { requireSession } from "../../middleware/requireSession.ts";
import { requireBearer } from "../../middleware/requireBearer.ts";
import { skillController } from "./skill.controller.ts";
import { mapRouter } from "../maps/map.routes.ts";

const internalRouter: Router = Router();

internalRouter.get("/", requireSession, asyncHandler(skillController.listMine));
internalRouter.post("/", requireSession, asyncHandler(skillController.create));

internalRouter.post(
  "/import",
  requireSession,
  asyncHandler(skillController.importFromPeer),
);

internalRouter.use("/:slug/maps", mapRouter);

internalRouter.get(
  "/:slug",
  requireSession,
  asyncHandler(skillController.getOne),
);
internalRouter.patch(
  "/:slug",
  requireSession,
  asyncHandler(skillController.update),
);
internalRouter.delete(
  "/:slug",
  requireSession,
  asyncHandler(skillController.remove),
);

const publicRouter: Router = Router();

publicRouter.get("/", requireBearer, asyncHandler(skillController.listForPeer));

export { internalRouter as skillRouter, publicRouter as skillPublicRouter };
