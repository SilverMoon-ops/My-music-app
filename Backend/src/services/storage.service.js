const ImageKit = require("imagekit");

const ImageKitClient = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,   // also needed
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT, // also needed
});

async function uploadFile(file) {
  if (!file || !file.buffer) {
    throw new Error("File buffer missing");
  }

  const result = await ImageKitClient.upload({
    file: file.buffer.toString("base64"),
    fileName: file.originalname || `music_${Date.now()}`,
    folder: "/music",
  });

  return result;
}

async function deleteFile(fileId) {
  if (!fileId) {
    return;
  }

  try {
    await ImageKitClient.deleteFile(fileId);
  } catch (err) {
    // If the file was already gone (e.g. someone deleted it manually from
    // the ImageKit dashboard), treat that as success — the end state we
    // actually care about, "file no longer exists", is already true.
    const status = err?.$ResponseMetadata?.statusCode || err?.statusCode;
    if (status === 404) {
      return;
    }
    throw err;
  }
}

module.exports = { uploadFile, deleteFile };