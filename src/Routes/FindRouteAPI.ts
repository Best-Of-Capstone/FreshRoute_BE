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

    if (requestData.congestion === undefined || requestData.transportation === undefined) {
        RESULT_DATA.RESULT_CODE = 100;
        RESULT_DATA.RESULT_MSG = "Parameter Error";
        res.send(RESULT_DATA);
    }

    if (requestData.congestion < -2 || requestData.congestion > 2) {
        RESULT_DATA.RESULT_CODE = 100;
        RESULT_DATA.RESULT_MSG = "Congestion Parameter Error";
        res.send(RESULT_DATA);
    }

    if (requestData.transportation < 0 || requestData.transportation > 2) {
        RESULT_DATA.RESULT_CODE = 100;
        RESULT_DATA.RESULT_MSG = "Transportation Parameter Error";
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
    alternativeRoutesConfig["weight_factor"] = req.body?.weightFactor ?? alternativeRoutesConfig["weight_factor"];
    alternativeRoutesConfig["share_factor"] = req.body?.shareFactor ?? alternativeRoutesConfig["share_factor"];

    if (alternativeRoutesConfig["target_count"] > 3) {
        alternativeRoutesConfig["target_count"] = 3;
    }

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
            "endCord": [req.body.endCord[0], req.body.endCord[1]],
            "congestion": req.body.congestion,
            "transportation": req.body.transportation,
            "targetCount": req.body.targetCount
        }
        const transportData = await axios.post(transportURL, transportBODY);
        const subResultData: RouteListDTO[] = [];
        let index = 0;
        if (req.body.transportation === 1) {
            const {endTransport, startTransport} = transportData.data.data.RESULT_DATA.routeList;
            const busURL = `https://api.odsay.com/v1/api/searchPubTransPathT?` +
                `SX=${startTransport[1]}&SY=${startTransport[0]}&` +
                `EX=${endTransport[1]}&EY=${endTransport[0]}&` +
                `SearchPathType=2&` + // 1 = subway, 2 = bus
                `apiKey=${process.env.ODSAY_KEY}`;
            const busData = await axios.get(busURL);
            const tmpBustDataList = busData.data.result.path.slice(0, 3);
            for (const path of tmpBustDataList) {
                const {info, subPath} = path;
                const totalTransDistance = info.totalDistance;
                const totalTransDuration = info.totalTime;
                const subCord: [number, number, number][] = [];
                for (const data of subPath) {
                    if (data.trafficType == 2) {
                        for (const passStopInfo of data.passStopList.stations) {
                            const {y: latitude, x: longitude} = passStopInfo;
                            subCord.push([parseFloat(latitude), parseFloat(longitude), 0]);
                        }
                    }
                }
                const transCoordinates: any = [
                    [...startTransport, 0],
                    ...subCord,
                    [...endTransport, 0]
                ];
                // 시작점에서 대중교통 출발지까지 경로를 result_walk_first에 저장
                walkBody["coordinates"] = [coordinatesList[0], [startTransport[1], startTransport[0]]];
                const result_walk_first: ResultMSGDTO = await findWalkRoute(walkBody, 1);

                // 대중교통 도착지에서 도착지까지 경로를 result_walk_second에 저장
                walkBody["coordinates"] = [[endTransport[1], endTransport[0]], coordinatesList[1]];
                const result_walk_second: ResultMSGDTO = await findWalkRoute(walkBody, 2);

                if (result_walk_first.RESULT_CODE !== 200) {
                    res.send(result_walk_first);
                }
                if (result_walk_second.RESULT_CODE !== 200) {
                    res.send(result_walk_second);
                }
                for (const {route: routeListElementFirst} of result_walk_first.RESULT_DATA.routeList!) {
                    const firstCordLength: number = routeListElementFirst.coordinates.length;
                    for (const {route: routeListElementSecond} of result_walk_second.RESULT_DATA.routeList!) {
                        const totalDistance: number = routeListElementFirst.distance + totalTransDistance + routeListElementSecond.distance;
                        const totalDuration: number = routeListElementFirst.duration + totalTransDuration + routeListElementSecond.distance;
                        const transSteps: StepDTO[] = [];
                        let count = firstCordLength;
                        for (let i = 0; i < subPath.length; i++) {
                            const data = subPath[i];
                            const {trafficType, distance: transDistance, sectionTime: transSectionTIme} = data;
                            if (trafficType == 3) {
                                const possibleLane = subPath[i + 1]?.lane.map((laneObj: any) => {
                                    return laneObj.busNo;
                                });
                                if (possibleLane === undefined) {
                                    transSteps.push({
                                        distance: transDistance,
                                        duration: transSectionTIme,
                                        type: "하차",
                                        isWalking: true,
                                        name: "버스 하차",
                                        elevationDelta: 0,
                                        wayPoints: [count, count + 1],
                                    });
                                } else {
                                    transSteps.push({
                                        distance: transDistance,
                                        duration: transSectionTIme,
                                        type: `${subPath[i + 1].startName}정류장으로 이동`,
                                        isWalking: true,
                                        name: subPath[i + 1].startName,
                                        elevationDelta: 0,
                                        wayPoints: [count, count + 1]
                                    });
                                    count += 1;
                                }
                            } else {
                                const possibleLane = subPath[i]["lane"].map((laneObj: any) => {
                                    return laneObj.busNo;
                                });
                                const busStop = subPath[i].passStopList.stations;
                                transSteps.push({
                                    distance: transDistance,
                                    duration: transSectionTIme,
                                    type: `${possibleLane.join()} 버스 탑승`,
                                    isWalking: false,
                                    name: `${subPath[i].startName}에서 ${subPath[i].endName} 까지 버스 탑승`,
                                    elevationDelta: 0,
                                    wayPoints: [count, count + busStop.length - 1],
                                });
                                count += busStop.length - 1;
                            }
                        }

                        const routeListElementSecondSteps: StepDTO[] = routeListElementSecond.steps.map((step: StepDTO): StepDTO => {
                            return {
                                distance: step.distance,
                                duration: step.duration,
                                type: step.type,
                                isWalking: step.isWalking,
                                name: step.name,
                                elevationDelta: step.elevationDelta,
                                wayPoints: [
                                    step.wayPoints[0] + firstCordLength + transCoordinates.length,
                                    step.wayPoints[1] + firstCordLength + transCoordinates.length
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
                    }
                }
            }
        } else {
            const tmpRouteList = transportData.data.data.RESULT_DATA.routeList;
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
                const result_walk_first: ResultMSGDTO = await findWalkRoute(walkBody, 1);

                // 대중교통 도착지에서 도착지까지 경로를 result_walk_second에 저장
                walkBody["coordinates"] = [[endTransport[1], endTransport[0]], coordinatesList[1]];
                const result_walk_second: ResultMSGDTO = await findWalkRoute(walkBody, 2);

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

const findWalkRoute = async (body: any, type: number): Promise<ResultMSGDTO> => {
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
            const routeList = routeMsg.data.features.map(({
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
                                isWalking: true,
                            }
                        }),
                        coordinates: geometry.coordinates.map((coordinate: [number, number, number]) => {
                            return [coordinate[1], coordinate[0], coordinate[2]];
                        }),
                    }
                }
            });
            if (type === 1) {
                for (const routeElement of routeList) {
                    routeElement.route.steps.pop();
                    const len = routeElement.route.steps.length;
                    routeElement.route.steps[len - 1].wayPoints[1] = routeElement.route.steps[len - 1].wayPoints[1] + 1;
                }
            } else {
                const lat1 = body.coordinates[0][1], lat2 = body.coordinates[1][1], lon1 = body.coordinates[0][0],
                    lon2 = body.coordinates[1][0];
                const R = 6371e3; // metres
                const pi1 = lat1 * Math.PI / 180; // φ, λ in radians
                const pi2 = lat2 * Math.PI / 180;
                const deltaPi = (lat2 - lat1) * Math.PI / 180;
                const deltaLambda = (lon2 - lon1) * Math.PI / 180;

                const a = Math.sin(deltaPi / 2) * Math.sin(deltaPi / 2) +
                    Math.cos(pi1) * Math.cos(pi2) *
                    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                const d = R * c; // in metres
                for (const routeElement of routeList) {
                    const len = routeElement.route.steps.length;
                    const firstStepElement = routeElement.route.steps[0];
                    firstStepElement.distance = d;
                    firstStepElement.duration = 1;
                    firstStepElement.type = "직진";
                    firstStepElement.wayPoints[0] -= 1;

                    if (len == 1) {
                        routeElement.route.steps.push({
                            distance: 0,
                            duration: 0,
                            type: '도착',
                            isWalking: true,
                            name: "목적지 도착",
                            elevationDelta: 0,
                            wayPoints: [len - 1, len],
                        });
                        routeElement.route.coordinates.push([body.coordinates[1][1], body.coordinates[1][0], 0]);
                    }
                }
            }

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