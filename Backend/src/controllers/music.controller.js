const musicModel = require("../models/music.model");
const albumModel = require("../models/album.model");
const { uploadFile, deleteFile } = require("../services/storage.service");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

async function createMusic(req, res) {
    const { title } = req.body;
    const file = req.file;

    if (!file) {
        throw new ApiError(400, "No file uploaded");
    }

    const result = await uploadFile(file);

    let music;
    try {
        music = await musicModel.create({
            uri: result.url,
            fileId: result.fileId,
            title,
            artist: req.user.id,
        });
    } catch (err) {
        // The file already made it to ImageKit, but the database record
        // failed (e.g. duplicate title for this artist). Clean up the
        // now-orphaned file rather than leaving it sitting in storage
        // with nothing pointing to it. We swallow a secondary failure
        // here on purpose — the original error is what the user needs to see.
        await deleteFile(result.fileId).catch(() => {});
        throw err;
    }

    res.status(201).json({
        success: true,
        message: "Music created successfully",
        music: {
            id: music._id,
            uri: music.uri,
            title: music.title,
            artist: music.artist,
        },
    });
}

async function createAlbum(req, res) {
    const { title, musics } = req.body;

    // Reject duplicate track IDs in the same request.
    const uniqueMusicIds = [...new Set(musics)];
    if (uniqueMusicIds.length !== musics.length) {
        throw new ApiError(400, "Duplicate track IDs are not allowed");
    }

    // Confirm every track ID actually exists.
    const foundMusics = await musicModel.find({
        _id: { $in: uniqueMusicIds },
    });

    if (foundMusics.length !== uniqueMusicIds.length) {
        throw new ApiError(404, "One or more tracks could not be found");
    }

    // Confirm every track belongs to the artist creating this album.
    const hasUnownedTrack = foundMusics.some(
        (music) => music.artist.toString() !== req.user.id
    );

    if (hasUnownedTrack) {
        throw new ApiError(403, "You can only add your own tracks to an album");
    }

    const album = await albumModel.create({
        title,
        artist: req.user.id,
        musics: uniqueMusicIds,
    });

    res.status(201).json({
        success: true,
        message: "Album created successfully",
        album: {
            id: album._id,
            title: album.title,
            artist: album.artist,
            musics: album.musics,
        },
    });
}

async function getAllMusics(req, res) {
    const musics = await musicModel
        .find()
        .populate("artist", "username email");

    res.status(200).json({
        success: true,
        message: "Musics fetched successfully",
        musics,
    });
}

async function getAllAlbums(req, res) {
    const albums = await albumModel
        .find()
        .select("title artist")
        .populate("artist", "username email");

    res.status(200).json({
        success: true,
        message: "Albums fetched successfully",
        albums,
    });
}

async function getAlbumById(req, res) {
    const album = await albumModel
        .findById(req.params.albumId)
        .populate("artist", "username email")
        .populate("musics");

    if (!album) {
        throw new ApiError(404, "Album not found");
    }

    res.status(200).json({
        success: true,
        message: "Album fetched successfully",
        album,
    });
}

async function getMusicById(req, res) {
    const music = await musicModel
        .findById(req.params.musicId)
        .populate("artist", "username email");

    if (!music) {
        throw new ApiError(404, "Music not found");
    }

    res.status(200).json({
        success: true,
        message: "Music fetched successfully",
        music,
    });
}

async function getMyMusics(req, res) {
    const musics = await musicModel.find({ artist: req.user.id });

    res.status(200).json({
        success: true,
        message: "Your tracks fetched successfully",
        musics,
    });
}

async function getMyAlbums(req, res) {
    const albums = await albumModel
        .find({ artist: req.user.id })
        .populate("musics");

    res.status(200).json({
        success: true,
        message: "Your albums fetched successfully",
        albums,
    });
}

async function updateMusic(req, res) {
    const { title } = req.body;

    const music = await musicModel.findById(req.params.musicId);

    if (!music) {
        throw new ApiError(404, "Music not found");
    }

    if (music.artist.toString() !== req.user.id) {
        throw new ApiError(403, "You can only edit your own tracks");
    }

    if (title !== undefined) {
        music.title = title;
    }

    // Using .save() (not findByIdAndUpdate) so the pre("validate") hook runs
    // and titleNormalized stays in sync with the new title.
    await music.save();

    res.status(200).json({
        success: true,
        message: "Music updated successfully",
        music: {
            id: music._id,
            uri: music.uri,
            title: music.title,
            artist: music.artist,
        },
    });
}

async function deleteMusic(req, res) {
    const music = await musicModel.findById(req.params.musicId);

    if (!music) {
        throw new ApiError(404, "Music not found");
    }

    if (music.artist.toString() !== req.user.id) {
        throw new ApiError(403, "You can only delete your own tracks");
    }

    // Delete from storage FIRST. If this fails, we abort before touching
    // the database — so the record and the file stay in sync either way,
    // and the user can safely retry instead of ending up with an orphaned
    // file we can no longer ever reference again.
    try {
        await deleteFile(music.fileId);
    } catch (err) {
        throw new ApiError(500, "Failed to delete file from storage, please try again");
    }

    // Remove this track from any albums that reference it, so no album is
    // left pointing at a track that no longer exists.
    await albumModel.updateMany(
        { musics: music._id },
        { $pull: { musics: music._id } }
    );

    await music.deleteOne();

    res.status(200).json({
        success: true,
        message: "Music deleted successfully",
    });
}

async function updateAlbum(req, res) {
    const { title, musics } = req.body;

    const album = await albumModel.findById(req.params.albumId);

    if (!album) {
        throw new ApiError(404, "Album not found");
    }

    if (album.artist.toString() !== req.user.id) {
        throw new ApiError(403, "You can only edit your own albums");
    }

    if (musics !== undefined) {
        const uniqueMusicIds = [...new Set(musics)];
        if (uniqueMusicIds.length !== musics.length) {
            throw new ApiError(400, "Duplicate track IDs are not allowed");
        }

        const foundMusics = await musicModel.find({
            _id: { $in: uniqueMusicIds },
        });

        if (foundMusics.length !== uniqueMusicIds.length) {
            throw new ApiError(404, "One or more tracks could not be found");
        }

        const hasUnownedTrack = foundMusics.some(
            (music) => music.artist.toString() !== req.user.id
        );

        if (hasUnownedTrack) {
            throw new ApiError(403, "You can only add your own tracks to an album");
        }

        album.musics = uniqueMusicIds;
    }

    if (title !== undefined) {
        album.title = title;
    }

    await album.save();

    res.status(200).json({
        success: true,
        message: "Album updated successfully",
        album: {
            id: album._id,
            title: album.title,
            artist: album.artist,
            musics: album.musics,
        },
    });
}

async function deleteAlbum(req, res) {
    const album = await albumModel.findById(req.params.albumId);

    if (!album) {
        throw new ApiError(404, "Album not found");
    }

    if (album.artist.toString() !== req.user.id) {
        throw new ApiError(403, "You can only delete your own albums");
    }

    // Deleting an album does not delete the underlying tracks — they remain
    // available individually, just no longer grouped into this album.
    await album.deleteOne();

    res.status(200).json({
        success: true,
        message: "Album deleted successfully",
    });
}

module.exports = {
    createMusic: asyncHandler(createMusic),
    createAlbum: asyncHandler(createAlbum),
    getAllMusics: asyncHandler(getAllMusics),
    getAllAlbums: asyncHandler(getAllAlbums),
    getAlbumById: asyncHandler(getAlbumById),
    getMusicById: asyncHandler(getMusicById),
    getMyMusics: asyncHandler(getMyMusics),
    getMyAlbums: asyncHandler(getMyAlbums),
    updateMusic: asyncHandler(updateMusic),
    deleteMusic: asyncHandler(deleteMusic),
    updateAlbum: asyncHandler(updateAlbum),
    deleteAlbum: asyncHandler(deleteAlbum),
};
