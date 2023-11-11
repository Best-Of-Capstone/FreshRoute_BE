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
    const instructionTypes = {
        0: "좌회전", //Left
        1: "우회전", //Right
        2: "7시 방향", //Sharp left
        3: "5시 방향", //Sharp right
        4: "11시 방향", //Slight left
        5: "1시 방향", //Slight right
        6: "직진", //Straight
        7: "회전교차로 진입", //Enter roundabout
        8: "회전교차로 탈출", //Exit roundabout
        9: "유턴", //U-turn
        10: "목적지 도착", //Goal
        11: "출발", //Depart
        12: "왼쪽으로 크게 돌기", //keep left
        13: "오른쪽으로 크게 돌기", //keep right

    }

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
                routeList: routeMsg.data.features.map(({
                                                           geometry: geometry,
                                                           properties: properties
                                                       }: any, index: number) => {
                    const detailRouteInfo = properties.segments[0];
                    return {
                        id: index,
                        description: `Route ${index}`,
                        route: {
                            distance: detailRouteInfo.distance,
                            duration: detailRouteInfo.duration,
                            steps: detailRouteInfo.steps,
                            coordinates: geometry.coordinates.map((coordinate: [number, number]) => {
                                return [coordinate[1], coordinate[0]];
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