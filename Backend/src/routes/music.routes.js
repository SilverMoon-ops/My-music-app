const express = require("express");
const multer = require("multer");
const musicController = require("../controllers/music.controller");
const { auth, requireRole } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { uploadMusicRules, createAlbumRules } = require("../validators/music.validator");
const ApiError = require("../utils/ApiError");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/x-wav"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new ApiError(400, "Only audio files are allowed"));
        }
    },
});

const router = express.Router();

// artist only
router.post(
    "/upload",
    auth,
    requireRole("artist"),
    upload.single("music"),
    uploadMusicRules,
    validate,
    musicController.createMusic
);

router.post(
    "/album",
    auth,
    requireRole("artist"),
    createAlbumRules,
    validate,
    musicController.createAlbum
);

// listener app only
router.get("/", auth, requireRole("user"), musicController.getAllMusics);
router.get("/albums", auth, requireRole("user"), musicController.getAllAlbums);
router.get("/albums/:albumId", auth, requireRole("user"), musicController.getAlbumById);

module.exports = router;