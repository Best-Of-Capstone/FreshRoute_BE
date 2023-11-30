import express, {Request, Response} from "express";
import axios, {AxiosError} from "axios";
import {ResultMSGDTO, RouteBodyDTO, RouteListDTO, RouteRequestDTO, RouteStepDTO, StepDTO} from "../Types/types";

const findRouteRouter = express.Router();

findRouteRouter.post("/", async (req: Request, res: Response) => {
    const requestData: RouteRequestDTO = req.body;
    const RESULT_DATA: ResultMSGDTO = {
        RESULT_CODE: 0,
        RESULT_MSG: "Ready",
        RESULT_DATA: {}
    }

    if(requestData.congestion === undefined || requestData.transportation === undefined){
        RESULT_DATA.RESULT_CODE = 100;
        RESULT_DATA.RESULT_MSG = "Parameter Error";
        res.send(RESULT_DATA);
    }

    const transportURL: string = "https://asia-northeast3-spring-market-404709.cloudfunctions.net/function-2"
    const coordinatesList: [number, number][] = [];

    //weight_factor 1~2, share_factor 0.1~1
    const alternativeRoutesConfig: any = {
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

    try {
        const walkBody: RouteBodyDTO = alternativeRoutesConfig.target_count === 1 ? {
            "coordinates": coordinatesList,
        } : {
            "coordinates": coordinatesList,
            "alternative_routes": alternativeRoutesConfig,
        }
        walkBody["elevation"] = true;

        const transportBODY = {
            "startCord": [req.body.startCord[0], req.body.startCord[1]],
            "endCord": [req.body.endCord[0], req.body.endCord[1]]
        }
        const transportData = await axios.post(transportURL, transportBODY);
        const tmpRouteList = transportData.data.data.RESULT_DATA.routeList;
        const subResultData: RouteListDTO[] = [];
        let index = 0;
        for (const {route} of tmpRouteList) {
            const {
                coordinates: transCoordinates,
                distance: transDistance,
                duration: transDuration,
                endTransport,
                startTransport,
                steps
            } = route;
            const transCoordinatesLength: number = transCoordinates.length;
            transCoordinates.forEach((_: any, index: number, array: any) => {
                array[index] = [array[index][1], array[index][0], 0];
            });

            // 시작점에서 대중교통 출발지까지 경로를 result_walk_first에 저장
            walkBody["coordinates"] = [coordinatesList[0], [startTransport[1], startTransport[0]]];
            const result_walk_first: ResultMSGDTO = await findWalkRoute(walkBody);

            // 대중교통 도착지에서 도착지까지 경로를 result_walk_second에 저장
            walkBody["coordinates"] = [[endTransport[1], endTransport[0]], coordinatesList[1]];
            const result_walk_second: ResultMSGDTO = await findWalkRoute(walkBody);

            if (result_walk_first.RESULT_CODE !== 200) {
                res.send(result_walk_first);
            }
            if (result_walk_second.RESULT_CODE !== 200) {
                res.send(result_walk_second);
            }

            result_walk_first.RESULT_DATA.routeList?.forEach(({route: routeListElementFirst}: RouteListDTO) => {
                const firstCordLength: number = routeListElementFirst.coordinates.length;
                result_walk_second.RESULT_DATA.routeList?.forEach(({route: routeListElementSecond}: RouteListDTO) => {
                    const totalDistance: number = routeListElementFirst.distance + transDistance + routeListElementSecond.distance;
                    const totalDuration: number = routeListElementFirst.duration + transDuration + routeListElementSecond.distance;
                    const transSteps: StepDTO[] = steps.map((step: any): StepDTO => {
                        return {
                            distance: step.distance,
                            duration: step.duration,
                            name: step.name,
                            type: step.type,
                            wayPoints: [step.wayPoints[0] + firstCordLength, step.wayPoints[1] + firstCordLength],
                            isWalking: false,
                            elevationDelta: 0
                        }
                    });

                    const routeListElementSecondSteps: StepDTO[] = routeListElementSecond.steps.map((step: StepDTO): StepDTO => {
                        return {
                            distance: step.distance,
                            duration: step.duration,
                            type: step.type,
                            isWalking: step.isWalking,
                            name: step.name,
                            elevationDelta: step.elevationDelta,
                            wayPoints: [
                                step.wayPoints[0] + firstCordLength + transCoordinatesLength,
                                step.wayPoints[1] + firstCordLength + transCoordinatesLength
                            ]
                        }
                    });

                    const subRouteList: RouteListDTO = {
                        id: index,
                        description: `Route ${index}`,
                        route: {
                            distance: totalDistance,
                            duration: totalDuration,
                            ascent: (routeListElementFirst.ascent + routeListElementSecond.ascent) / 2,
                            descent: (routeListElementFirst.descent + routeListElementSecond.descent) / 2,
                            coordinates: [...routeListElementFirst.coordinates, ...transCoordinates, ...routeListElementSecond.coordinates],
                            steps: [...routeListElementFirst.steps, ...transSteps, ...routeListElementSecondSteps]
                        }
                    }
                    subResultData.push(subRouteList);
                    index++;
                });
            });
        }
        RESULT_DATA.RESULT_CODE = 200;
        RESULT_DATA.RESULT_MSG = "Success";
        RESULT_DATA.RESULT_DATA = {
            routeList: subResultData
        }
        res.send(RESULT_DATA);
    } catch (err) {
        if (err instanceof AxiosError) {
            RESULT_DATA["RESULT_CODE"] = err.response?.status ?? 404;
            RESULT_DATA["RESULT_MSG"] = err.response?.data ?? "Internal Server Error";
            res.send(RESULT_DATA);
        }
    }
});

const findWalkRoute = async (body: any): Promise<ResultMSGDTO> => {
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
    const routeURL: string = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";
    const RESULT_DATA: ResultMSGDTO = {
        RESULT_CODE: 0,
        RESULT_MSG: "Ready",
        RESULT_DATA: {}
    }
    const routeMsg = await axios.post(routeURL, body, {
        headers: {
            Authorization: process.env.OPENROUTESERVICE_KEY
        },
    });
    RESULT_DATA["RESULT_CODE"] = routeMsg.status;
    RESULT_DATA["RESULT_MSG"] = routeMsg.statusText;
    try {
        if (routeMsg.status === 200) {
            const routeList = await Promise.all(routeMsg.data.features.map(async ({
                                                                                      geometry: geometry,
                                                                                      properties: properties
                                                                                  }: any, index: number) => {
                const detailRouteInfo = properties.segments[0];
                const elevationList = geometry.coordinates.map((coordinate: [number, number, number]) => {
                    return coordinate[2];
                });

                const detailStepInfo = await Promise.all(detailRouteInfo.steps.map(async (step: RouteStepDTO) => {
                    const [longitude, latitude] = geometry.coordinates[step.way_points[0]];
                    const REVERSE_GEOCODING_URL: string = `https://api.vworld.kr/req/address?request=getAddress&` +
                        `service=address&point=${longitude},${latitude}&` +
                        `type=parcel&zipcode=false&key=${process.env.GEOCODING_KEY}`;
                    const reverseGeocodeResultResponse = await axios.get(REVERSE_GEOCODING_URL);
                    const textData = reverseGeocodeResultResponse.data.response?.result[0].text ?? "-";
                    return {
                        distance: step.distance,
                        duration: step.duration,
                        type: instructionTypes[step.type],
                        name: textData,
                        elevationDelta: elevationList[step.way_points[1]] - elevationList[step.way_points[0]],
                        wayPoints: step.way_points,
                        isWalking: true,
                    }
                }));

                return {
                    id: index,
                    description: `Route ${index}`,
                    route: {
                        distance: detailRouteInfo.distance,
                        duration: detailRouteInfo.duration,
                        ascent: properties.ascent,
                        descent: properties.descent,
                        steps: detailStepInfo,
                        coordinates: geometry.coordinates.map((coordinate: [number, number, number]) => {
                            return [coordinate[1], coordinate[0], coordinate[2]];
                        }),
                    }
                }
            }));
            RESULT_DATA['RESULT_DATA'] = {
                routeList: routeList
            }
        }
        return RESULT_DATA;
    } catch (err) {
        if (err instanceof AxiosError) {
            RESULT_DATA["RESULT_CODE"] = err.response?.status ?? 404;
            RESULT_DATA["RESULT_MSG"] = err.response?.data.error.message ?? "Internal Server Error";
            return RESULT_DATA;
        }
        return RESULT_DATA;
    }
}

export default findRouteRouter;