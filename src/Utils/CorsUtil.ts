import cors, {CorsOptions} from "cors";
import {Express} from "express";

export const setCors = (app: Express) => {
    const corsList = [process.env.URL_DEV, process.env.URL_PUB];
    const corsOptions: CorsOptions = {
        origin: (origin: string | undefined, callback: (err: Error | null, options?: boolean | undefined) => void) => {
            if(corsList.indexOf(origin) !== -1){
                callback(null, true);
            }else{
                callback(new Error("Not Allowed Origin!"));
                console.log(origin);
            }
        },
    };

    // app.use(cors(corsOptions));
    app.use(cors());
}