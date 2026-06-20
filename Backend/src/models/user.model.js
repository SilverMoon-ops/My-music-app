const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        // Stored as the user typed it, for display purposes.
        username: {
            type: String,
            required: true,
            trim: true,
        },

        // Lowercased copy of username, used only for uniqueness/login lookups.
        // This is what makes "Rahul" and "rahul" collide as the same account.
        usernameLower: {
            type: String,
            required: true,
            unique: true,
        },

        // Emails have no display-casing convention worth preserving,
        // so we lowercase the field directly rather than using a shadow field.
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
        },

        password: {
            type: String,
            required: true,
        },

        role: {
            type: String,
            enum: ["user", "artist"],
            default: "user",
        },
    },
    { timestamps: true }
);

// Keep usernameLower in sync with username whenever it changes.
userSchema.pre("validate", function (next) {
    if (this.username) {
        this.usernameLower = this.username.trim().toLowerCase();
    }
});

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;