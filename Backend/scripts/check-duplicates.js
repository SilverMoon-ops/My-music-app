// Run this BEFORE deploying the Phase 4 model changes, if your database
// already has any users, music, or albums in it.
//
// Usage:
//   cd Backend
//   node scripts/check-duplicates.js
//
// It only reads data — it does not modify or delete anything.

const mongoose = require("mongoose");
require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

async function checkDuplicates() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("MONGO_URI not found in environment variables");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.\n");

    const db = mongoose.connection.db;

    // 1. Duplicate usernames (case-insensitive, trimmed)
    console.log("Checking for duplicate usernames...");
    const duplicateUsernames = await db.collection("users").aggregate([
        {
            $group: {
                _id: { $trim: { input: { $toLower: "$username" } } },
                count: { $sum: 1 },
                originalNames: { $push: "$username" },
                ids: { $push: "$_id" },
            },
        },
        { $match: { count: { $gt: 1 } } },
    ]).toArray();
    console.log(
        duplicateUsernames.length > 0
            ? `Found ${duplicateUsernames.length} duplicate username group(s):\n${JSON.stringify(duplicateUsernames, null, 2)}`
            : "No duplicate usernames found."
    );

    // 2. Duplicate emails (case-insensitive, trimmed)
    console.log("\nChecking for duplicate emails...");
    const duplicateEmails = await db.collection("users").aggregate([
        {
            $group: {
                _id: { $trim: { input: { $toLower: "$email" } } },
                count: { $sum: 1 },
                originalEmails: { $push: "$email" },
                ids: { $push: "$_id" },
            },
        },
        { $match: { count: { $gt: 1 } } },
    ]).toArray();
    console.log(
        duplicateEmails.length > 0
            ? `Found ${duplicateEmails.length} duplicate email group(s):\n${JSON.stringify(duplicateEmails, null, 2)}`
            : "No duplicate emails found."
    );

    // 3. Duplicate music titles per artist (case-insensitive, trimmed)
    console.log("\nChecking for duplicate music titles per artist...");
    const duplicateMusics = await db.collection("musics").aggregate([
        {
            $group: {
                _id: {
                    artist: "$artist",
                    title: { $trim: { input: { $toLower: "$title" } } },
                },
                count: { $sum: 1 },
                originalTitles: { $push: "$title" },
                ids: { $push: "$_id" },
            },
        },
        { $match: { count: { $gt: 1 } } },
    ]).toArray();
    console.log(
        duplicateMusics.length > 0
            ? `Found ${duplicateMusics.length} duplicate music title group(s):\n${JSON.stringify(duplicateMusics, null, 2)}`
            : "No duplicate music titles per artist found."
    );

    // 4. Duplicate album titles per artist (case-insensitive, trimmed)
    console.log("\nChecking for duplicate album titles per artist...");
    const duplicateAlbums = await db.collection("albums").aggregate([
        {
            $group: {
                _id: {
                    artist: "$artist",
                    title: { $trim: { input: { $toLower: "$title" } } },
                },
                count: { $sum: 1 },
                originalTitles: { $push: "$title" },
                ids: { $push: "$_id" },
            },
        },
        { $match: { count: { $gt: 1 } } },
    ]).toArray();
    console.log(
        duplicateAlbums.length > 0
            ? `Found ${duplicateAlbums.length} duplicate album title group(s):\n${JSON.stringify(duplicateAlbums, null, 2)}`
            : "No duplicate album titles per artist found."
    );

    await mongoose.disconnect();
    console.log("\nDone. Disconnected from MongoDB.");
}

checkDuplicates().catch((err) => {
    console.error("Error running duplicate check:", err);
    process.exit(1);
});