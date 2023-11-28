import express, {Request, Response} from "express";
import axios, {AxiosError} from "axios";

const findRouteRouter = express.Router();

interface RouteStepDTO {
    distance: number;
    duration: number;
    type: number;
    instruction: string;
    name: string;
    way_points: [number, number];
}

interface RouteBodyDTO {
    [key: string]: any;
}

findRouteRouter.post("/", async (req: Request, res: Response) => {
    const routeURL: string = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";
    const coordinatesList: [number, number][] = [];
    const RESULT_DATA = {
        RESULT_CODE: 0,
        RESULT_MSG: "Ready",
        RESULT_DATA: {}
    }
    //weight_factor 1~2, share_factor 0.1~1
    const alternativeRoutesConfig: any = {
        "target_count": 3,
        "weight_factor": 2,
        "share_factor": 1
    };
    const instructionTypes = [
        "좌회전", //Left
        "우회전", //Right
        "7시 방향", //Sharp left
        "5시 방향", //Sharp right
        "11시 방향", //Slight left
        "1시 방향", //Slight right
        "직진", //Straight
        "회전교차로 진입", //Enter roundabout
        "회전교차로 탈출", //Exit roundabout
        "유턴", //U-turn
        "목적지 도착", //Goal
        "출발", //Depart
        "왼쪽으로 크게 돌기", //keep left
        "오른쪽으로 크게 돌기" //keep right
    ];

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

    try {
        const body: RouteBodyDTO = alternativeRoutesConfig.target_count === 1 ? {
            "coordinates": coordinatesList,
        } : {
            "coordinates": coordinatesList,
            "alternative_routes": alternativeRoutesConfig,
        }
        body["elevation"] = true;
        const routeMsg = await axios.post(routeURL, body, {
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
                    const elevationList = geometry.coordinates.map((coordinate: [number, number, number]) => {
                        return coordinate[2];
                    });
                    return {
                        id: index,
                        description: `Route ${index}`,
                        route: {
                            distance: detailRouteInfo.distance,
                            duration: detailRouteInfo.duration,
                            ascent: properties.ascent,
                            descent: properties.descent,
                            steps: detailRouteInfo.steps.map((step: RouteStepDTO) => {
                                return {
                                    distance: step.distance,
                                    duration: step.duration,
                                    type: instructionTypes[step.type],
                                    name: step.name,
                                    elevationDelta: elevationList[step.way_points[1]] - elevationList[step.way_points[0]],
                                    wayPoints: step.way_points,
                                }
                            }),
                            coordinates: geometry.coordinates.map((coordinate: [number, number, number]) => {
                                return [coordinate[1], coordinate[0], coordinate[2]];
                            }),
                        }
                    }
                }),
            }
        }

        try {
            const testURL: string = "https://asia-northeast3-spring-market-404709.cloudfunctions.net/function-2"
            const testBODY = {
                "startCord": [req.body.startCord[0], req.body.startCord[1]],
                "endCord": [req.body.endCord[0], req.body.endCord[1]]
            }
            const testData = await axios.post(testURL, testBODY);
            // console.dir(testData.data.data.RESULT_DATA.routeList[0].route.steps);
            const routeList = testData.data.data.RESULT_DATA.routeList;
            routeList.map(({route}: any) => {
                const coordinates = route.coordinates;
                const steps = route.steps;
                const filter_steps = steps.filter((element: any) => {
                    return element.type === "지하철 탑승";
                });
                console.dir(filter_steps);
            })
            console.log("----");
        } catch (e) {
            console.dir(e);
        }
        // X역에서 N호선 탑승
        // XX역에서 N호선 환승
        // XX역에서 N호선 하차
        //
        // XX 정류장에서 N번 버스 탑승
        // XX 정류장에서 N번 버스 환승
        // XX 정류장에서 N번 버스 하차
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