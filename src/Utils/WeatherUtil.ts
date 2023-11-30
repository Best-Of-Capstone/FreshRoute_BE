export interface WeatherItem {
    main: string;
    messages: Array<string>;
}

var WeatherList: object = {
    "2": {
        main: "Thunderstorm",
        messages: ["오늘은 폭풍우가 몰아친대요. 되도록이면 외출을 삼가해주세요!"]
    },
    "3": {
        main: "Drizzle",
        messages: ["약간의 이슬비가 내릴거에요. 적지만 우산을 꼭 챙기세요!"]
    },
    "5": {
        main: "Rain",
        messages: ["비가 오네요! 우산은 챙기셨나요? 오늘은 걷는 것 보다는 대중교통이 좋겠어요."]
    },
    "6": {
        main: "Snow",
        messages: ["오늘은 새하얀 눈이 내릴거에요! 미끄럼에 주의하며 겨울을 느껴보세요!"]
    },
    "7": {
        main: "Atmosphere",
        messages: ["오늘은 안개가 꼈어요. 주변 환경에 주의하며 대중교통을 이용해보아요!"]
    },
    "8": {
        main: "Clear",
        messages: ["맑은 날이에요! 오늘은 버스대신 걷기 어때요?"]
    },
    "8.1": {
        main: "Cloudy",
        messages: ["오늘은 구름이 흐렸네요. 대신 신나는 노래와 함께 즐거운 하루 되세요!"]
    }
}
export default WeatherList;