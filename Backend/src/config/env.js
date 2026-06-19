const required = [
    "MONGO_URI",
    "JWT_SECRET",
    "IMAGEKIT_PUBLIC_KEY",
    "IMAGEKIT_PRIVATE_KEY",
    "IMAGEKIT_URL_ENDPOINT",
];

function validateEnv() {
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        console.error(`Missing required env vars: ${missing.join(", ")}`);
        process.exit(1);
    }
}

module.exports = { validateEnv };