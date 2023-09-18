import express, { Request, Response } from "express";

const app = express();

app.get("/", (req: Request, res: Response) => {
    res.send("Hello, World!");
});

app.listen(8080, "0.0.0.0", () => {
    console.log("Server listen on port 8080");
});
