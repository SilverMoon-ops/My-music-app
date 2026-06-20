const express = require("express");
const multer = require("multer");
const musicController = require("../controllers/music.controller");
const { auth, requireRole } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const validateId = require("../middleware/validateId.middleware");
const {
    uploadMusicRules,
    createAlbumRules,
    updateMusicRules,
    updateAlbumRules,
} = require("../validators/music.validator");
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

// -- Create (artist only) --------------------------------------------------
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

// -- Artist's own content (must be registered before the dynamic
//    ":musicId" / ":albumId" routes below, or Express would try to match
//    "mine" as an ID instead) ------------------------------------------------
router.get("/mine", auth, requireRole("artist"), musicController.getMyMusics);
router.get("/albums/mine", auth, requireRole("artist"), musicController.getMyAlbums);

// -- Listener-facing reads --------------------------------------------------
router.get("/", auth, requireRole("user"), musicController.getAllMusics);
router.get("/albums", auth, requireRole("user"), musicController.getAllAlbums);
router.get(
    "/albums/:albumId",
    auth,
    requireRole("user"),
    validateId("albumId"),
    musicController.getAlbumById
);

// Track detail - available to both roles (listener playback page,
// artist viewing their own track), so just `auth`, no role restriction.
router.get(
    "/:musicId",
    auth,
    validateId("musicId"),
    musicController.getMusicById
);

// -- Update / delete (artist only, ownership enforced in the controller) ---
router.patch(
    "/:musicId",
    auth,
    requireRole("artist"),
    validateId("musicId"),
    updateMusicRules,
    validate,
    musicController.updateMusic
);

router.delete(
    "/:musicId",
    auth,
    requireRole("artist"),
    validateId("musicId"),
    musicController.deleteMusic
);

router.patch(
    "/album/:albumId",
    auth,
    requireRole("artist"),
    validateId("albumId"),
    updateAlbumRules,
    validate,
    musicController.updateAlbum
);

router.delete(
    "/album/:albumId",
    auth,
    requireRole("artist"),
    validateId("albumId"),
    musicController.deleteAlbum
);

module.exports = router;
