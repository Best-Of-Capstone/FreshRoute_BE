import express, { Request, Response } from "express";

const findRouteRouter = express.Router();

findRouteRouter.get("/", async (req: Request, res: Response) => {
    res.send("Find Route API Router");
});

export default findRouteRouter;