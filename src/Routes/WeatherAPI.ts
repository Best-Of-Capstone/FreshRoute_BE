import express, { Request, Response } from "express";

const weatherRouter = express.Router();

weatherRouter.get("/", async (req: Request, res: Response) => {
    res.send("Weather API Router");
});

export default weatherRouter;