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

interface RouteDTO {
    distance: number;
    duration: number;
    ascent: number;
    descent: number;
    steps: [number, number, number];
}

interface RouteListDTO {
    id: number;
    description: string;
    route: RouteDTO
}

interface ResultMSGDTO {
    RESULT_CODE: number;
    RESULT_MSG: string;
    RESULT_DATA: {
        routeList?: RouteListDTO[];
    };
}