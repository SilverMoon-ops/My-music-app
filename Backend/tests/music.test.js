// Mock the storage service BEFORE requiring app — this ensures no test
// ever makes a real network call to ImageKit. Upload/delete are replaced
// with fakes we can inspect (toHaveBeenCalledWith, etc).
jest.mock("../src/services/storage.service", () => ({
    uploadFile: jest.fn().mockResolvedValue({
        url: "https://fake-imagekit-url/test.mp3",
        fileId: "fake_file_id_123",
    }),
    deleteFile: jest.fn().mockResolvedValue(undefined),
}));

const request = require("supertest");
const app = require("../src/app");
const { connect, clearDatabase, closeDatabase } = require("./dbHandler");
const { uploadFile, deleteFile } = require("../src/services/storage.service");

beforeAll(async () => {
    await connect();
});

afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
});

afterAll(async () => {
    await closeDatabase();
});

// Helper: registers a fresh artist and returns a supertest agent that's
// already logged in as that artist (cookie persists across requests).
async function loginAsArtist(overrides = {}) {
    const agent = request.agent(app);
    await agent.post("/api/auth/artist/register").send({
        username: "artist_" + Math.random().toString(36).slice(2, 8),
        email: `artist_${Math.random().toString(36).slice(2, 8)}@test.com`,
        password: "password123",
        ...overrides,
    });
    return agent;
}

async function loginAsListener() {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({
        username: "listener_" + Math.random().toString(36).slice(2, 8),
        email: `listener_${Math.random().toString(36).slice(2, 8)}@test.com`,
        password: "password123",
    });
    return agent;
}

function fakeAudioFile(name = "track.mp3") {
    return { buffer: Buffer.from("fake audio data"), filename: name, contentType: "audio/mpeg" };
}

describe("Music upload", () => {
    test("an artist can upload a track", async () => {
        const artist = await loginAsArtist();
        const file = fakeAudioFile();

        const res = await artist
            .post("/api/music/upload")
            .field("title", "My First Track")
            .attach("music", file.buffer, { filename: file.filename, contentType: file.contentType });

        expect(res.status).toBe(201);
        expect(res.body.music.title).toBe("My First Track");
        expect(uploadFile).toHaveBeenCalledTimes(1);
    });

    test("a listener cannot upload a track", async () => {
        const listener = await loginAsListener();
        const file = fakeAudioFile();

        const res = await listener
            .post("/api/music/upload")
            .field("title", "Should Fail")
            .attach("music", file.buffer, { filename: file.filename, contentType: file.contentType });

        expect(res.status).toBe(403);
    });

    test("rejects a second track with the same title from the same artist, case-insensitively", async () => {
        const artist = await loginAsArtist();
        const file1 = fakeAudioFile("a.mp3");
        const file2 = fakeAudioFile("b.mp3");

        await artist
            .post("/api/music/upload")
            .field("title", "Same Title")
            .attach("music", file1.buffer, { filename: file1.filename, contentType: file1.contentType });

        const res = await artist
            .post("/api/music/upload")
            .field("title", "same title") // different casing
            .attach("music", file2.buffer, { filename: file2.filename, contentType: file2.contentType });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already have an item with this title/i);
    });
});

describe("Album creation — referential & ownership integrity (Phase 4.2)", () => {
    test("rejects an album containing a track that belongs to a different artist", async () => {
        const artistA = await loginAsArtist();
        const file = fakeAudioFile();
        const uploadRes = await artistA
            .post("/api/music/upload")
            .field("title", "Artist A Track")
            .attach("music", file.buffer, { filename: file.filename, contentType: file.contentType });

        const trackId = uploadRes.body.music.id;

        const artistB = await loginAsArtist();
        const res = await artistB.post("/api/music/album").send({
            title: "Sneaky Album",
            musics: [trackId],
        });

        expect(res.status).toBe(403);
    });

    test("rejects duplicate track IDs within the same album request", async () => {
        const artist = await loginAsArtist();
        const file = fakeAudioFile();
        const uploadRes = await artist
            .post("/api/music/upload")
            .field("title", "Solo Track")
            .attach("music", file.buffer, { filename: file.filename, contentType: file.contentType });

        const trackId = uploadRes.body.music.id;

        const res = await artist.post("/api/music/album").send({
            title: "Dup Album",
            musics: [trackId, trackId],
        });

        expect(res.status).toBe(400);
    });

    test("rejects an album referencing a track ID that doesn't exist", async () => {
        const artist = await loginAsArtist();
        const fakeId = "64b64f1f1f1f1f1f1f1f1f1f"; // valid ObjectId shape, doesn't exist

        const res = await artist.post("/api/music/album").send({
            title: "Ghost Album",
            musics: [fakeId],
        });

        expect(res.status).toBe(404);
    });

    test("succeeds when all tracks exist and belong to the requesting artist", async () => {
        const artist = await loginAsArtist();
        const file = fakeAudioFile();
        const uploadRes = await artist
            .post("/api/music/upload")
            .field("title", "Owned Track")
            .attach("music", file.buffer, { filename: file.filename, contentType: file.contentType });

        const trackId = uploadRes.body.music.id;

        const res = await artist.post("/api/music/album").send({
            title: "Legit Album",
            musics: [trackId],
        });

        expect(res.status).toBe(201);
        expect(res.body.album.musics).toContain(trackId);
    });
});

describe("Ownership enforcement on update/delete", () => {
    test("an artist cannot edit another artist's track", async () => {
        const artistA = await loginAsArtist();
        const file = fakeAudioFile();
        const uploadRes = await artistA
            .post("/api/music/upload")
            .field("title", "Protected Track")
            .attach("music", file.buffer, { filename: file.filename, contentType: file.contentType });

        const trackId = uploadRes.body.music.id;

        const artistB = await loginAsArtist();
        const res = await artistB.patch(`/api/music/${trackId}`).send({ title: "Hijacked" });

        expect(res.status).toBe(403);
    });

    test("an artist cannot delete another artist's track", async () => {
        const artistA = await loginAsArtist();
        const file = fakeAudioFile();
        const uploadRes = await artistA
            .post("/api/music/upload")
            .field("title", "Protected Track 2")
            .attach("music", file.buffer, { filename: file.filename, contentType: file.contentType });

        const trackId = uploadRes.body.music.id;

        const artistB = await loginAsArtist();
        const res = await artistB.delete(`/api/music/${trackId}`);

        expect(res.status).toBe(403);
    });
});

describe("Storage lifecycle (Phase 6)", () => {
    test("deleting a track calls storage.deleteFile with the correct fileId", async () => {
        const artist = await loginAsArtist();
        const file = fakeAudioFile();
        const uploadRes = await artist
            .post("/api/music/upload")
            .field("title", "To Be Deleted")
            .attach("music", file.buffer, { filename: file.filename, contentType: file.contentType });

        const trackId = uploadRes.body.music.id;

        const res = await artist.delete(`/api/music/${trackId}`);

        expect(res.status).toBe(200);
        expect(deleteFile).toHaveBeenCalledWith("fake_file_id_123");
    });

    test("deleting a track removes it from any album that referenced it", async () => {
        const artist = await loginAsArtist();
        const file = fakeAudioFile();
        const uploadRes = await artist
            .post("/api/music/upload")
            .field("title", "Albummed Track")
            .attach("music", file.buffer, { filename: file.filename, contentType: file.contentType });

        const trackId = uploadRes.body.music.id;

        const albumRes = await artist.post("/api/music/album").send({
            title: "Album With Track",
            musics: [trackId],
        });
        const albumId = albumRes.body.album.id;

        await artist.delete(`/api/music/${trackId}`);

        // Use the artist-accessible "mine" route — /albums/:albumId is
        // listener-only (requireRole("user")), which an artist agent
        // would get a 403 from.
        const getAlbumsRes = await artist.get("/api/music/albums/mine");
        const album = getAlbumsRes.body.albums.find(
            (a) => String(a._id) === String(albumId)
        );

        expect(album).toBeDefined();
        expect(album.musics).toEqual([]);
    });
});

describe("validateId middleware (Phase 4.3)", () => {
    test("rejects a malformed :musicId before it reaches the database", async () => {
        const listener = await loginAsListener();

        const res = await listener.get("/api/music/not-a-valid-object-id");

        expect(res.status).toBe(400);
    });

    test("rejects a malformed :albumId before it reaches the database", async () => {
        const listener = await loginAsListener();

        const res = await listener.get("/api/music/albums/not-a-valid-object-id");

        expect(res.status).toBe(400);
    });
});
