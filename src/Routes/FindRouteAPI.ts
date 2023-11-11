import express, {Request, Response} from "express";
import axios, {AxiosError} from "axios";

const findRouteRouter = express.Router();

findRouteRouter.post("/", async (req: Request, res: Response) => {
    const URL: string = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";
    const coordinatesList: [number, number][] = [];
    const RESULT_DATA = {
        RESULT_CODE: 0,
        RESULT_MSG: "Ready",
        RESULT_DATA: {}
    }
    const alternativeRoutesConfig = {
        "target_count": 3,
        "weight_factor": 2,
        "share_factor": 1
    };

    alternativeRoutesConfig["target_count"] = req.body?.targetCount ?? alternativeRoutesConfig["target_count"];
    alternativeRoutesConfig["weight_factor"] = req.body?.targetCount ?? alternativeRoutesConfig["weight_factor"];
    alternativeRoutesConfig["share_factor"] = req.body?.targetCount ?? alternativeRoutesConfig["share_factor"];

    if (req.body?.startCord === undefined || req.body?.endCord === undefined) {
        RESULT_DATA['RESULT_CODE'] = 400;
        RESULT_DATA['RESULT_MSG'] = "body must have startCord property and endCord property";
        res.send(RESULT_DATA);
    }

    coordinatesList.push([req.body.startCord[1], req.body.startCord[0]]);
    coordinatesList.push([req.body.endCord[1], req.body.endCord[0]]);

    //weight_factor 1~2, share_factor 0.1~1
    try {
        const body = alternativeRoutesConfig.target_count === 1 ? {
            "coordinates": coordinatesList,
        } : {
            "coordinates": coordinatesList,
            "alternative_routes": alternativeRoutesConfig,
        }
        const routeMsg = await axios.post(URL, body, {
            headers: {
                Authorization: process.env.OPENROUTESERVICE_KEY
            },
        });
        RESULT_DATA["RESULT_CODE"] = routeMsg.status;
        RESULT_DATA["RESULT_MSG"] = routeMsg.statusText;
        if (routeMsg.status === 200) {
            RESULT_DATA['RESULT_DATA'] = {
                routeList: routeMsg.data.features.map(({geometry: geometry}: any, index: number) => {
                    return {
                        id: index,
                        description: `Route ${index}`,
                        route: {
                            coordinates: geometry.coordinates.map((coordinate: [number, number]) => {
                                return {
                                    description: "walking",
                                    coordinate: [coordinate[1], coordinate[0]]
                                };
                            }),
                        }
                    }
                }),
            }
        }
        res.send(RESULT_DATA);
    } catch (err) {
        if (err instanceof AxiosError) {
            RESULT_DATA["RESULT_CODE"] = err.response?.status ?? 404;
            RESULT_DATA["RESULT_MSG"] = err.response?.data.error.message ?? "Internal Server Error";
            res.send(RESULT_DATA);
        }
    }
});

export default findRouteRouter;