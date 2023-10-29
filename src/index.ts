import dotenv from "dotenv";
import express from "express";

import findRouteRouter from "./Routes/FindRouteAPI";
import userRouter from "./Routes/UserAPI";
import weatherRouter from "./Routes/WeatherAPI";

import {setCors} from "./Utils/CorsUtil";

dotenv.config();

const app = express();
setCors(app);

app.use(express.json());
app.use(express.urlencoded({extended : false}));

app.use("/findRouter", findRouteRouter);
app.use("/user", userRouter);
app.use("/weather", weatherRouter);

app.get("/", (req, res) => {
    res.send("Hello, World!");
});

app.listen(8080, () => {
    console.log("Server is Listening on Port 8080!");
});