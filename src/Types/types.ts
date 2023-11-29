export interface RouteStepDTO {
    distance: number;
    duration: number;
    type: number;
    instruction: string;
    name: string;
    way_points: [number, number];
}

export interface RouteBodyDTO {
    [key: string]: any;
}

export interface RouteDTO {
    distance: number;
    duration: number;
    ascent: number;
    descent: number;
    steps: [number, number, number];
}

export interface RouteListDTO {
    id: number;
    description: string;
    route: RouteDTO
}

export interface ResultMSGDTO {
    RESULT_CODE: number;
    RESULT_MSG: string;
    RESULT_DATA: {
        routeList?: RouteListDTO[];
    };
}