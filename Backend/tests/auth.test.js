const request = require("supertest");
const app = require("../src/app");
const { connect, clearDatabase, closeDatabase } = require("./dbHandler");

beforeAll(async () => {
    await connect();
});

afterEach(async () => {
    await clearDatabase();
});

afterAll(async () => {
    await closeDatabase();
});

describe("Auth", () => {
    const baseUser = {
        username: "Rahul1",
        email: "rahul1@test.com",
        password: "password123",
    };

    test("registers a new user successfully", async () => {
        const res = await request(app).post("/api/auth/register").send(baseUser);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.user.username).toBe("Rahul1");
        // password must never be returned
        expect(res.body.user.password).toBeUndefined();
    });

    test("rejects a duplicate username that only differs in casing", async () => {
        await request(app).post("/api/auth/register").send(baseUser);

        const res = await request(app).post("/api/auth/register").send({
            ...baseUser,
            username: "rahul1", // same as "Rahul1", different case
            email: "different@test.com",
        });

        expect(res.status).toBe(409);
        expect(res.body.message).toBe("Username already taken");
    });

    test("rejects a duplicate email that only differs in casing", async () => {
        await request(app).post("/api/auth/register").send(baseUser);

        const res = await request(app).post("/api/auth/register").send({
            ...baseUser,
            username: "someoneelse",
            email: "RAHUL1@TEST.com",
        });

        expect(res.status).toBe(409);
        expect(res.body.message).toBe("Email already in use");
    });

    test("rejects registration with a missing required field", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ username: "a", password: "password123" }); // no email

        expect(res.status).toBe(400);
    });

    test("rejects registration with a short password", async () => {
        const res = await request(app).post("/api/auth/register").send({
            ...baseUser,
            password: "short",
        });

        expect(res.status).toBe(400);
    });

    test("logs in successfully, case-insensitively, using username", async () => {
        await request(app).post("/api/auth/register").send(baseUser);

        const res = await request(app).post("/api/auth/login").send({
            username: "RAHUL1", // different casing than registered
            password: baseUser.password,
        });

        expect(res.status).toBe(200);
        expect(res.headers["set-cookie"]).toBeDefined();
    });

    test("rejects login with the wrong password", async () => {
        await request(app).post("/api/auth/register").send(baseUser);

        const res = await request(app).post("/api/auth/login").send({
            username: baseUser.username,
            password: "wrongpassword",
        });

        expect(res.status).toBe(401);
    });

    test("rejects an artist-only account logging in through the listener login route", async () => {
        await request(app).post("/api/auth/artist/register").send({
            username: "artistonly",
            email: "artistonly@test.com",
            password: "password123",
        });

        const res = await request(app).post("/api/auth/login").send({
            username: "artistonly",
            password: "password123",
        });

        expect(res.status).toBe(403);
    });

    test("GET /me without a cookie is rejected", async () => {
        const res = await request(app).get("/api/auth/me");
        expect(res.status).toBe(401);
    });

    test("GET /me returns the logged-in user when a valid cookie is present", async () => {
        const agent = request.agent(app); // persists cookies across requests
        await agent.post("/api/auth/register").send(baseUser);

        const res = await agent.get("/api/auth/me");

        expect(res.status).toBe(200);
        expect(res.body.user.username).toBe(baseUser.username);
    });
});
