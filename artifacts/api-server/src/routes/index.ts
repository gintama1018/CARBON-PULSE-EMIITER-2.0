import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import activitiesRouter from "./activities";
import insightsRouter from "./insights";
import goalsRouter from "./goals";
import communityRouter from "./community";
import emissionFactorsRouter from "./emissionFactors";
import streakRouter from "./streak";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(activitiesRouter);
router.use(insightsRouter);
router.use(goalsRouter);
router.use(communityRouter);
router.use(emissionFactorsRouter);
router.use(streakRouter);

export default router;
