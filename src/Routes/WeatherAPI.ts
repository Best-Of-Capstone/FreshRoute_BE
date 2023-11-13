import express, { Request, Response } from "express";
import axios from "axios";

const weatherRouter = express.Router();

weatherRouter.get("/getWeatherInfo", async (req: Request, res: Response) => {
    const RESULT_DATA = {
        RESULT_CODE: 0,
        RESULT_MSG: "Ready",
        RESULT_DATA: {}
    }

    const API_KEY = process.env.OPENWEATHER_KEY;
    const lat = req.query.lat;
    const lon = req.query.lon;

    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
    await axios.get(apiUrl)
        .then((res) => {
            RESULT_DATA.RESULT_DATA = res["data"]["weather"][0];
            Object.assign(RESULT_DATA.RESULT_DATA, res["data"]["main"]);

            RESULT_DATA.RESULT_CODE = 200;
            RESULT_DATA.RESULT_MSG = "Success";
        })
        .catch((err) => {
            RESULT_DATA.RESULT_CODE = 100;
            RESULT_DATA.RESULT_MSG = err.toString();
        });

    res.send(RESULT_DATA);
});

export default weatherRouter;