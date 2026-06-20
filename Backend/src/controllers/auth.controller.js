const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { cookieOptions } = require("../config/cookie");

function signToken(user) {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}

async function registerAccount(req, res, role) {
    const { username, email, password } = req.body;

    const usernameLower = username.trim().toLowerCase();
    const emailLower = email.trim().toLowerCase();

    // Look up using the normalized forms so "Rahul"/"rahul" and
    // "User@Mail.com"/"user@mail.com" are correctly treated as the same identity.
    const existing = await userModel.findOne({
        $or: [{ usernameLower }, { email: emailLower }],
    });

    if (existing) {
        if (existing.usernameLower === usernameLower) {
            throw new ApiError(409, "Username already taken");
        }
        throw new ApiError(409, "Email already in use");
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await userModel.create({
        username,
        email,
        password: hash,
        role,
    });

    const token = signToken(user);
    res.cookie("token", token, cookieOptions);

    const label = role === "artist" ? "Artist" : "User";

    res.status(201).json({
        success: true,
        message: `${label} registered successfully`,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
        },
    });
}

async function registerUser(req, res) {
    return registerAccount(req, res, "user");
}

async function registerArtist(req, res) {
    return registerAccount(req, res, "artist");
}

async function loginAccount(req, res, expectedRole) {
    const { username, email, password } = req.body;

    // Only build conditions for fields that were actually provided,
    // and normalize them the same way they're stored.
    const orConditions = [];
    if (username) orConditions.push({ usernameLower: username.trim().toLowerCase() });
    if (email) orConditions.push({ email: email.trim().toLowerCase() });

    const user = await userModel.findOne({ $or: orConditions });

    if (!user) {
        throw new ApiError(401, "Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    if (user.role !== expectedRole) {
        throw new ApiError(403, `This account is not a ${expectedRole}`);
    }

    const token = signToken(user);
    res.cookie("token", token, cookieOptions);

    const label = expectedRole === "artist" ? "Artist" : "User";

    res.status(200).json({
        success: true,
        message: `${label} logged in successfully`,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
        },
    });
}

async function loginUser(req, res) {
    return loginAccount(req, res, "user");
}

async function loginArtist(req, res) {
    return loginAccount(req, res, "artist");
}

async function logoutUser(req, res) {
    res.clearCookie("token", cookieOptions);
    res.status(200).json({ success: true, message: "Logged out successfully" });
}

async function getMe(req, res) {
    const user = await userModel.findById(req.user.id).select("-password");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    res.status(200).json({
        success: true,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
        },
    });
}

module.exports = {
    registerUser: asyncHandler(registerUser),
    registerArtist: asyncHandler(registerArtist),
    loginUser: asyncHandler(loginUser),
    loginArtist: asyncHandler(loginArtist),
    logoutUser: asyncHandler(logoutUser),
    getMe: asyncHandler(getMe),
};
