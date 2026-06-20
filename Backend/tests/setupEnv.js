// Runs before any test file or app code loads. Sets just enough env vars
// for the app to function in tests — no real MongoDB or ImageKit credentials
// are ever needed, since tests use an in-memory DB and a mocked storage service.

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_for_automated_tests_only";

// storage.service.js constructs its ImageKit client at module-load time,
// which happens whenever anything requires src/app.js — even in test files
// that never touch storage at all (e.g. auth.test.js). These dummy values
// only need to satisfy ImageKit's constructor check (non-empty strings);
// no real network call to ImageKit happens unless the service is actually
// invoked, and tests that exercise upload/delete mock the whole module anyway.
process.env.IMAGEKIT_PUBLIC_KEY = "test_public_key";
process.env.IMAGEKIT_PRIVATE_KEY = "test_private_key";
process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/test";
