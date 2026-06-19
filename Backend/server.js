require("dotenv").config();
const { validateEnv } = require("./src/config/env");
const app = require("./src/app");
const connectDB = require("./src/db/db");

validateEnv();

async function start() {
    await connectDB();

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

start();