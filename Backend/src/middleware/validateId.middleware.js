const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");

// Validates that a given URL param is a syntactically valid MongoDB ObjectId,
// before it ever reaches a database query. This is a fast, explicit guard rail
// that catches malformed IDs (typos, wrong length, injected junk) up front,
// rather than relying on a generic CastError surfacing from deep inside Mongoose.
function validateId(paramName) {
    return (req, res, next) => {
        const id = req.params[paramName];

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new ApiError(400, `Invalid ${paramName}`);
        }

        next();
    };
}

module.exports = validateId;