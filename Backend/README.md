# Gwen — Audio Streaming Backend

A Node.js/Express + MongoDB backend for an audio streaming platform, with
separate listener (`user`) and artist account types.

## Tech stack
- Node.js + Express 5
- MongoDB + Mongoose 9
- JWT auth via httpOnly cookies
- ImageKit for audio file storage
- express-validator for request validation

## Setup

```bash
cd Backend
npm install
cp .env.example .env
# fill in real values in .env, see comments in that file
npm run dev
```

`npm run dev` uses `nodemon` (auto-restarts on file changes) — use this while
developing. `npm start` runs the server once without auto-restart, for
production-style runs.

The server validates required env vars on startup (`src/config/env.js`) and
will exit immediately with a clear error if any are missing.

## Project structure

```
Backend/
  server.js              entry point — connects DB, starts the HTTP server
  src/
    app.js               Express app setup: middleware, routes, error handling
    config/              env validation, cookie options
    db/                  MongoDB connection
    models/              Mongoose schemas (user, music, album)
    controllers/          route handler logic
    routes/               route definitions
    validators/            express-validator rule sets per route group
    middleware/            auth, role checks, error handling, ID validation
    services/              ImageKit upload/delete
    utils/                  ApiError, asyncHandler
  scripts/
    check-duplicates.js   one-off script: checks for case-insensitive
                           duplicate usernames/emails/titles before deploying
                           schema changes that add uniqueness constraints
  tests/
    auth.test.js           registration, login, case-insensitive uniqueness
    music.test.js          uploads, albums, ownership, storage lifecycle
    dbHandler.js            in-memory MongoDB setup/teardown for tests
    setupEnv.js              test environment variables
```

## Account types
Two roles share the same `user` collection, distinguished by `role`:
- **`user`** — listener. Can browse/play music and albums.
- **`artist`** — can upload tracks, create/edit/delete their own albums and
  tracks. Cannot access another artist's tracks/albums for editing.

Auth uses httpOnly cookies (not Bearer tokens) — log in once, the cookie is
sent automatically on subsequent requests from the same origin.

## Frontend integration — read this before you start

Your frontend will run on a **different origin** than this backend (e.g.
`http://localhost:5173` vs `http://localhost:3000`). Because auth uses
httpOnly cookies, two things must both be true or login will silently appear
to "not work" (you'll get a 200 on login, but every request after it will
look unauthenticated):

1. **Every fetch/axios call must explicitly send credentials.**
   - `fetch`: add `credentials: "include"` to every request, not just login.
   - `axios`: set `withCredentials: true`, either per-request or globally via
     `axios.defaults.withCredentials = true`.
   Without this, the browser will not send or store the auth cookie at all,
   even though the backend sets it correctly.

2. **`CLIENT_URL` in your `.env` must exactly match your frontend's origin**
   — same protocol, host, and port, no trailing slash. `cors()` in `app.js`
   is configured with `credentials: true` and a single allowed origin from
   this value; a mismatch (even just the port) will cause the browser to
   silently block the response.

If login seems to succeed but `/api/auth/me` (or any protected route) keeps
returning 401 right after, check these two things first before assuming it's
a backend bug.

## API Reference

All responses are JSON: `{ success: boolean, message: string, ...data }`.
Errors follow the same shape with `success: false`.

### Auth — `/api/auth`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/register` | none | `{ username, email, password }` | creates a `user` account |
| POST | `/login` | none | `{ username or email, password }` | logs in as `user` |
| POST | `/artist/register` | none | `{ username, email, password }` | creates an `artist` account |
| POST | `/artist/login` | none | `{ username or email, password }` | logs in as `artist` |
| POST | `/logout` | cookie | — | clears the auth cookie |
| GET | `/me` | cookie | — | returns the logged-in user's profile |

Username/email matching is case-insensitive (`"Rahul"` and `"rahul"` are the
same account). Duplicate registration returns a field-specific message
(`"Username already taken"` or `"Email already in use"`). Rate-limited at
20 requests / 15 min per IP on this whole route group.

### Music & Albums — `/api/music`

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/upload` | artist | form-data: `title` (text), `music` (file) |
| POST | `/album` | artist | `{ title, musics: [id, ...] }` — tracks must exist, belong to you, no duplicates |
| GET | `/` | user | all tracks |
| GET | `/albums` | user | all albums |
| GET | `/albums/:albumId` | user | one album, populated with its tracks |
| GET | `/mine` | artist | your own tracks |
| GET | `/albums/mine` | artist | your own albums |
| GET | `/:musicId` | any logged-in user | one track's detail |
| PATCH | `/:musicId` | artist, owner only | `{ title }` — rename a track |
| DELETE | `/:musicId` | artist, owner only | deletes the track + its file in storage |
| PATCH | `/album/:albumId` | artist, owner only | `{ title?, musics? }` — rename/replace tracklist |
| DELETE | `/album/:albumId` | artist, owner only | deletes the album, not its tracks |

Track and album titles are unique per-artist (case/whitespace-insensitive) —
you can't have two tracks named "Test" and "test", but two different artists
both can.

## What's implemented (all 9 phases complete)

**Done:** auth (both roles), security hardening, data integrity constraints,
full CRUD on tracks/albums with ownership checks, ImageKit upload/delete
lifecycle (including orphaned-file cleanup if a DB save fails after upload),
clean project structure, full documentation, and an automated test suite.

**Test suite (Phase 9):** 23 integration tests using Jest + Supertest +
mongodb-memory-server — runs against a real, temporary, in-memory MongoDB
instance, with ImageKit fully mocked (no test ever touches your real
ImageKit account or your real database).

```bash
npm test
```

First run takes a little longer (downloads a small MongoDB test binary,
cached afterward). Covers: registration/login including the case-insensitive
uniqueness behavior, album referential/ownership integrity, cross-artist
edit/delete blocking, the storage delete lifecycle, and the `validateId`
middleware.

This is coverage of the business-rule-critical paths from Phases 4–6, not
exhaustive line coverage — e.g. the rename (`PATCH`) endpoints are covered
for ownership-blocking but not every field-update edge case. Good habit
going forward: when you add a new feature, add a test alongside it.

## Useful one-off scripts

```bash
node scripts/check-duplicates.js
```
Checks your live database for case-insensitive duplicate usernames, emails,
or per-artist track/album titles. Read-only, makes no changes. Run this
before deploying any future schema change that adds a new uniqueness
constraint, to catch conflicts before the index build fails on deploy.