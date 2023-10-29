import dotenv from "dotenv";
import express from "express";
import {setCors} from "./Utils/CorsUtil";
import userRouter from "./Routes/UserAPI";
import weatherRouter from "./Routes/WeatherAPI";

dotenv.config();

const app = express();
setCors(app);

app.use(express.json());
app.use(express.urlencoded({extended : false}));

app.use("/user", userRouter);
app.use("/weather", weatherRouter);

app.get("/", (req, res) => {
    res.send("Hello, World!");
});

app.listen(8080, () => {
    console.log("Server is Listening on Port 8080!");
});