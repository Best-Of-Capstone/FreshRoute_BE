import express, { Request, Response } from "express";

const userRouter = express.Router();

userRouter.get("/getUserInfo", async (req: Request, res: Response) => {
    res.send("Get User Info");
});

userRouter.post("/registerUser", async (req: Request, res: Response) => {
    res.send("Register User");
});

userRouter.post("/tryLogin", async (req: Request, res: Response) => {
    res.send("Try Login");
});

export default userRouter;