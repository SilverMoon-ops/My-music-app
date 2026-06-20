const ApiError = require("../utils/ApiError");

function notFound(req, res, next) {
    next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal server error";

    if (err.name === "CastError") {
        statusCode = 400;
        message = "Invalid ID format";
    }

    if (err.code === 11000) {
        statusCode = 409;

        // err.keyPattern tells us which index was violated. For a compound
        // index (e.g. { artist: 1, titleNormalized: 1 }), the field we
        // actually care about for messaging isn't necessarily the FIRST
        // key — so check membership across all keys, not just keyPattern[0].
        const fields = err.keyPattern ? Object.keys(err.keyPattern) : [];

        if (fields.includes("usernameLower")) {
            message = "Username already taken";
        } else if (fields.includes("email")) {
            message = "Email already in use";
        } else if (fields.includes("titleNormalized")) {
            message = "You already have an item with this title";
        } else {
            message = "Duplicate field value";
        }
    }

    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Unauthorized";
    }

    if (err.name === "MulterError") {
        statusCode = 400;
        message = err.message;
    }

    if (process.env.NODE_ENV === "production" && statusCode === 500) {
        message = "Internal server error";
    }

    res.status(statusCode).json({
        success: false,
        message,
    });
}

module.exports = { notFound, errorHandler };