const mongoose = require("mongoose");

const musicSchema = new mongoose.Schema(
    {
        uri: {
            type: String,
            required: true,
            trim: true,
        },

        // ImageKit's file identifier, required to delete the file later (Phase 6).
        // Without this, there is no way to remove the asset from storage.
        fileId: {
            type: String,
            required: true,
        },

        // Stored as the artist typed it, for display purposes.
        title: {
            type: String,
            required: true,
            trim: true,
        },

        // Lowercased copy of title, used only for the uniqueness check below.
        titleNormalized: {
            type: String,
            required: true,
        },

        artist: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
    },
    { timestamps: true }
);

musicSchema.pre("validate", function (next) {
    if (this.title) {
        this.titleNormalized = this.title.trim().toLowerCase();
    }
});

// An artist cannot have two tracks with the same title (case/whitespace-insensitive).
// Different artists can freely reuse the same title.
musicSchema.index({ artist: 1, titleNormalized: 1 }, { unique: true });

const musicModel = mongoose.model("music", musicSchema);

module.exports = musicModel;