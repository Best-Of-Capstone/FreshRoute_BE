// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, query, where, updateDoc, getDoc} from 'firebase/firestore';
import * as fs from 'fs';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseApiFile = fs.readFileSync(__dirname + "/../firebaseApiKey.json", "utf-8");
const firebaseConfig = JSON.parse(firebaseApiFile);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const subwayFile = fs.readFileSync(__dirname + "/../SubwayData/서울시 역사마스터 정보 최종.json", "utf-8");
const subwayData = JSON.parse(subwayFile);
const subwaysRef = collection(db, "SubwayTest5");


const setSubway = () => {
    subwayData.forEach(({ID: id, ...data}) => {
        setDoc(doc(subwaysRef, id.toString()), data);
    });
}

const makeTransfer = async () => {
    // const subwayFirebase = await getDocs(subwaysRef);
    const transferRef = collection(db, "Transfer3");
    const transferData = JSON.parse(fs.readFileSync(__dirname + "/../SubwayData/Transfer.json", "utf-8"));
    transferData.forEach(async (data) => {
        const srcQuery = query(subwaysRef,
            where("name", "==", data.name),
            where("line",  "==", data.line)
        );
        const dstQuery = query(subwaysRef,
            where("name", "==", data.name),
            where("line", "==", data["transfer_line"])
        );
        const srcQuerySnapShot = await getDocs(srcQuery);
        const dstQuerySnapShot = await getDocs(dstQuery);
        let srcId, dstId;
        if (srcQuerySnapShot.size !== 1 || dstQuerySnapShot.size !== 1){
            console.log(data);
            console.log(srcQuerySnapShot.size);
            console.log(dstQuerySnapShot.size)
            console.log("duplicate Docs!!");
            process.exit(1);
        }
        srcQuerySnapShot.forEach((queryDoc) => {
            srcId = queryDoc.id;
        });
        dstQuerySnapShot.forEach((queryDoc) => {
            dstId = queryDoc.id;
        })
        await setDoc(doc(transferRef, srcId), {
            "name": data.name,
            "line": data.line,
            "transferInfo": {
                "name": data.name,
                "line": data["transfer_line"],
                "dist": data.dist,
                "time": data.time,
            }
        });
        await setDoc(doc(transferRef, dstId), {
            "name": data.name,
            "line": data["transfer_line"],
            "transferInfo":{
                "name": data.name,
                "line": data.line,
                "dist": data.dist,
                "time": data.time,
            }
        });
    });


    // subwayFirebase.forEach(async (docs) => {
    //     const id = docs.id;
    //     const data = docs.data();
    //     const q = await query(subwaysRef, where("name", "==", data.name));
    //     const querySnapshot = await getDocs(q);
    //     if (querySnapshot.size > 1){
    //         const idObj = {};
    //         let idx = 0;
    //         querySnapshot.forEach((queryDoc) => {
    //             idObj[idx] = queryDoc.id;
    //             idx++;
    //         })
    //         setDoc(doc(transferRef, data.name), idObj);
    //     }
    // })
}

const JsonDir = fs.readdirSync(__dirname + "/../SubwayData/Json");
const setLinkedList = () => {
    JsonDir.forEach(async (filename) => {
        const JsonFile = fs.readFileSync(__dirname + "/../SubwayData/Json/" + filename, "utf-8");
        const distData = JSON.parse(JsonFile);
        for (let i = 0; i < distData.length - 1; i++){
            const u = distData[i];
            const v = distData[i + 1];
            if (v.distance === 0) continue;
            const query_u = await query(
                subwaysRef,
                where("line", "==", u.line),
                where("name", "==", u.name)
            );
            const query_v = await query(
                subwaysRef,
                where("line", "==", v.line),
                where("name", "==", v.name)
            );
            const querySnapShot_u = await getDocs(query_u);
            const querySnapShot_v = await getDocs(query_v);
            if (querySnapShot_u.size > 0){
                querySnapShot_u.forEach(async (queryDoc) => {
                    let adjacency = [];
                    if (queryDoc.data().adj !== undefined){
                        for (let id in queryDoc.data().adj){
                            adjacency.push(queryDoc.data().adj[id]);
                        }
                    }
                    adjacency.push({
                        id: queryDoc.id,
                        line: v.line,
                        name: v.name,
                        dist: v.distance,
                    });
                    await updateDoc(queryDoc.ref, {
                        adj: {...adjacency},
                    })
                })
            }
            if (querySnapShot_v.size > 0){
                querySnapShot_v.forEach(async (queryDoc) => {
                    let adjacency = [];
                    if (queryDoc.data().adj !== undefined){
                        for (let id in queryDoc.data().adj){
                            adjacency.push(queryDoc.data().adj[id]);
                        }
                    }
                    adjacency.push({
                        id: queryDoc.id,
                        line: u.line,
                        name: u.name,
                        dist: v.distance,
                    });
                    await updateDoc(queryDoc.ref, {
                        adj: {...adjacency},
                    })
                })
            }
        }
    })
}
//setSubway();
//setLinkedList();
makeTransfer()