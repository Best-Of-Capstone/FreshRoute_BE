import express, {Request, Response} from "express";
import axios from "axios";

const findRouteRouter = express.Router();

findRouteRouter.post("/", async (req: Request, res: Response) => {
    const URL: string = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";
    const coordinatesList = [];
    const RESULT_DATA = {
        RESULT_CODE: 0,
        RESULT_MSG: "Ready",
        RESULT_DATA: {}
    }

    if (req.body?.startCord === undefined || req.body?.endCord === undefined) {
        RESULT_DATA['RESULT_CODE'] = 400;
        RESULT_DATA['RESULT_MSG'] = "body must have startCord property and endCord property";
        res.send(RESULT_DATA);
    }

    coordinatesList.push([req.body.startCord[1], req.body.startCord[0]]);
    if (req.body?.stopover !== undefined) {
        coordinatesList.push(...req.body.stopover.map((coordinate: [number, number]) => {
            return [coordinate[1], coordinate[0]];
        }));
    }
    coordinatesList.push([req.body.endCord[1], req.body.endCord[0]]);
    try {
        const routeMsg = await axios.post(URL, {
            coordinates: coordinatesList
        }, {
            headers: {
                Authorization: process.env.OPENROUTESERVICE_KEY
            },
        });
        RESULT_DATA["RESULT_CODE"] = routeMsg.status;
        RESULT_DATA["RESULT_MSG"] = routeMsg.statusText;
        if (routeMsg.status === 200) {
            RESULT_DATA['RESULT_DATA'] = {
                coordinates: routeMsg.data.features[0].geometry.coordinates.map((coordinate: [number, number]) => {
                    return {
                        description: "walking",
                        coordinate: [coordinate[1], coordinate[0]]
                    };
                }),
            }
        }
        res.send(RESULT_DATA);
    } catch (err) {
        RESULT_DATA["RESULT_CODE"] = 400;
        RESULT_DATA["RESULT_MSG"] = err instanceof Error ? err.message : "400 not found";
        res.send(RESULT_DATA);
    }
});

export default findRouteRouter;