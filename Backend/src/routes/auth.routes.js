const express = require("express");
const authController = require("../controllers/auth.controller");
const validate = require("../middleware/validate.middleware");
const { registerRules, loginRules } = require("../validators/auth.validator");
const { auth } = require("../middleware/auth.middleware");

const router = express.Router();

// listener app (Spotify-style)
router.post("/register", registerRules, validate, authController.registerUser);
router.post("/login", loginRules, validate, authController.loginUser);

// artist app (Spotify for Artists-style)
router.post("/artist/register", registerRules, validate, authController.registerArtist);
router.post("/artist/login", loginRules, validate, authController.loginArtist);

router.post("/logout", authController.logoutUser);
router.get("/me", auth, authController.getMe);

module.exports = router;