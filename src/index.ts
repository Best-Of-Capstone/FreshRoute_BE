import dotenv from "dotenv";
import express from "express";
import {setCors} from "./utils/cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended : false}));
setCors(app);

app.get("/", (req, res) => {
    res.send("Hello, World!");
});

app.listen(8080, () => {
    console.log("Server is Listening on Port 8080!");
});