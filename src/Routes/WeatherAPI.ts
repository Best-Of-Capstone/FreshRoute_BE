import express, { Request, Response } from "express";

const weatherRouter = express.Router();

weatherRouter.get("/getWeatherInfo", async (req: Request, res: Response) => {
    res.send("Get Weather API Router");
});

export default weatherRouter;