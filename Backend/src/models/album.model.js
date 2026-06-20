const mongoose = require("mongoose");

const albumSchema = new mongoose.Schema(
    {
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

        musics: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "music",
            },
        ],

        artist: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
    },
    { timestamps: true }
);

albumSchema.pre("validate", function (next) {
    if (this.title) {
        this.titleNormalized = this.title.trim().toLowerCase();
    }
});

// An artist cannot have two albums with the same title (case/whitespace-insensitive).
albumSchema.index({ artist: 1, titleNormalized: 1 }, { unique: true });

const albumModel = mongoose.model("album", albumSchema);

module.exports = albumModel;