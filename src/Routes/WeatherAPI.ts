import express, { Request, Response } from "express";

const weatherRouter = express.Router();

weatherRouter.get("/getWeatherInfo", async (req: Request, res: Response) => {
    const API_KEY = process.env.OPENWEATHER_KEY;
    const lat = req.query.lat;
    const lon = req.query.lon;

    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

    res.send("Get Weather API Router");
});

export default weatherRouter;