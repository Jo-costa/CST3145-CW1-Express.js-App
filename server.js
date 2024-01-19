const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const cors = require("cors");

app.use(express.json());

app.use((req, res, next) => {
    //enable cors for all routes
    // console.log(store);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    next();
});

app.options("*", cors());
let propertiesReader = require("properties-reader")
let propertiesPath = path.resolve(__dirname, "conf/db.properties");
let properties = propertiesReader(propertiesPath);

let dbPrefix = properties.get("db.prefix");
let dbUsername = encodeURIComponent(properties.get("db.user"));
let dbpassword = encodeURIComponent(properties.get("db.password"));
let dbName = properties.get("db.dbName");
let dbUrl = properties.get("db.dbUrl");
let dbParams = properties.get("db.params");

const uri = dbPrefix + dbUsername + ":" + dbpassword + dbUrl + dbParams

const {
    MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb');


const connectDB = async () => {
    const client = new MongoClient(uri, {
        serverApi: ServerApiVersion.v1
    });
    try {
        await client.connect();
        console.log("Connected to the database");
    } catch (err) {
        console.error("Error connecting to the database", err);
    }
    return client.db(dbName);
};



app.param("collectionName", function (req, res, next, collectionName) {
    connectDB().then((db) => {
        req.collection = db.collection(collectionName);
        next();
    });
});

app.get("/collections/:collectionName", function (req, res) {
    req.collection.find({}).toArray(function (error, results) {
        if (error) {
            return next(error);
        }
        res.send(results);
    });
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})