import express, {Request, Response} from "express";
import axios from "axios";

const findRouteRouter = express.Router();

findRouteRouter.get("/", async (req: Request, res: Response) => {
    const URL: string = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";
    const RESULT_DATA = {
        RESULT_CODE: 0,
        RESULT_MSG: "Ready",
        RESULT_DATA: {}
    }
    const routeMsg = await axios.post(URL, {
        coordinates: [[8.681495, 49.41461], [8.686507, 49.41943], [8.687872, 49.420318]]
    }, {
        headers: {
            Authorization: process.env.OPENROUTESERVICE_KEY
        },
    })
    RESULT_DATA["RESULT_CODE"] = routeMsg.status
    RESULT_DATA["RESULT_MSG"] = routeMsg.statusText
    if (routeMsg.status === 200) {
        // RESULT_DATA['RESULT_DATA'] = routeMsg.data.
    }
    res.send("Find Route API Router");
});

export default findRouteRouter;