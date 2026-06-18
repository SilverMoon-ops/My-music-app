const express = require("express");
const musicController = require("../controllers/music.controller");
const multer = require("multer");
const { authArtist, authUser } = require("../middleware/auth.middleware");

const upload = multer({
    storage: multer.memoryStorage()
});

const router = express.Router();

// artist only
router.post("/upload", authArtist, upload.single("music"), musicController.createMusic);
router.post("/album", authArtist, musicController.createAlbum);

// user only
router.get("/", authUser, musicController.getAllMusics);
router.get("/albums", authUser, musicController.getAllAlbums);
router.get("/albums/:albumId", authUser, musicController.getAlbumById);

module.exports = router;