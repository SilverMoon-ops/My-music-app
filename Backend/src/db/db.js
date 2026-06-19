const mongoose = require("mongoose");

const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);



async function connectDB(){

    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Database connected");
    }catch(error){
        console.error("Database connection error", error);
        process.exit(1);
    }
}

module.exports = connectDB;