const { body } = require("express-validator");

const registerRules = [
    body("username")
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage("Username must be 3-30 characters"),
    body("email")
        .trim()
        .isEmail()
        .withMessage("Valid email required"),
    body("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters"),
];

const loginRules = [
    body("password").notEmpty().withMessage("Password required"),
    body().custom((_, { req }) => {
        if (!req.body.username && !req.body.email) {
            throw new Error("Username or email required");
        }
        return true;
    }),
];

module.exports = { registerRules, loginRules };