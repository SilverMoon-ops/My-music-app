const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

function auth(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        throw new ApiError(401, "Unauthorized");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        throw new ApiError(401, "Unauthorized");
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new ApiError(403, "You don't have access");
        }
        next();
    };
}

module.exports = { auth, requireRole };