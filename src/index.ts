import dotenv from "dotenv";
import express from "express";
import {setCors} from "./utils/cors";

dotenv.config();

const app = express();
setCors(app);

app.get("/", (req, res) => {
    res.send("Hello, World!");
});

app.listen(8080, () => {
    console.log("Server is Listening on Port 8080!");
});