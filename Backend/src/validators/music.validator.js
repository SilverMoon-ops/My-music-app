const { body } = require("express-validator");

const uploadMusicRules = [
    body("title").trim().notEmpty().withMessage("Title is required"),
];

const createAlbumRules = [
    body("title").trim().notEmpty().withMessage("Album title is required"),
    body("musics")
        .isArray({ min: 1 })
        .withMessage("Album must contain at least one track"),
    body("musics.*").isMongoId().withMessage("Invalid music ID"),
];

module.exports = { uploadMusicRules, createAlbumRules };