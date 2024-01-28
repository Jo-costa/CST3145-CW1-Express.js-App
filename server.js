const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const cors = require("cors");

app.use(express.json());


app.use(cors())

app.use(function(req, res, next){
    console.log("Incoming request url: " + req.protocol+'://'+req.get('host') + req.url);
    next();  
})

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
const { error } = require("console");


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




app.use('/img', (req, res, next)=>{

    const filePath = path.join(__dirname, ".." ,"frontend","img", req.url)
    fs.stat(filePath, (error, fileInfo)=>{

        if(error){
            next()
            return
        }

        if(fileInfo.isFile()){
            res.sendFile(filePath)
        }else{
            next();
        }

    })

})

app.use("/img",(req, res)=>{
    res.status(404)
    res.send("Image not found!")
})




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

app.get("/collections/:collectionName/search", function (req, res, next) {

    const search = req.query.query
    req.collection.find(
        {
            $or:
            [
                {
                    subject:
                    {
                        $regex: `${search}`, 
                        $options:"i"
                    }
                },
                         {
                            "location": 
                         {
                            $regex: `${search}`, 
                         $options:"i"
                        }
                    }
                ]
            }).toArray(function (error, results) {
        if (error) {
            return next(error);
        }
        if(results.length > 0){

            res.send(results);
        }else{
            res.json([])
        }
    });

    
});

app.post("/collections/:collectionName/orderPlaced", function (req, res) {

    const data = req.body;
    req.collection.insertOne(data, (error, result)=>{
        if(error){
            res.status(500).send("Server Error")
            return
        }

        
        const orderId = result.insertedId        
        res.send({msg: "Order Successfully placed. Order id: " + orderId, orderId: orderId});
        
    })

})


app.put('/collections/:collectionName', function(req, res){

    const data = req.body.updateSpacesArray;

    const dataToUpdate = []
    
    
    data.forEach((item)=> {

        dataToUpdate.push({
            id: item.productID,
            spaces: item.updateInv
        })
    })

    


    dataToUpdate.forEach((item)=>{
        req.collection.updateMany({id: item.id}, {$set: {spaces: item.spaces}}, (error, result)=>{
            if(error){
                res.status(500).send("Server Error")
                return
            }

        })

    })

    
    res.send("Successfully updated")


})




const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})
