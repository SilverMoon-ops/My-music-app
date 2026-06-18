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

module.exports = { uploadFile };