export interface WeatherItem {
    main: string;
    messages: Array<string>;
}

var WeatherList: object = {
    "200": {
        main: "Thunderstorm",
        messages: []
    },
    "300": {
        main: "Drizzle",
        messages: []
    },
    "500": {
        main: "Rain",
        messages: []
    },
    "600": {
        main: "Snow",
        messages: []
    },
    "700": {
        main: "Atmosphere",
        messages: []
    },
    "800": {
        main: "Clear",
        messages: []
    }
}
export default WeatherList;