// Spins up a real, temporary, in-memory MongoDB instance for tests to run
// against — so tests exercise real Mongoose behavior (including the unique
// indexes from Phase 4) without ever touching the real Atlas database.

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

async function connect() {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
}

async function clearDatabase() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}

async function closeDatabase() {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
}

module.exports = { connect, clearDatabase, closeDatabase };
