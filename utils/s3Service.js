const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

/**
 * Uploads a base64 encoded image to AWS S3.
 * @param {string} base64Image - The base64 string (with or without prefix).
 * @param {string} folder - The folder in S3 (e.g., 'members', 'transactions').
 * @returns {Promise<string>} - The public URL of the uploaded image.
 */
async function uploadBase64Image(base64Image, folder = "members") {
    try {
        // Remove data URL prefix if it exists (e.g., "data:image/jpeg;base64,")
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        const fileName = `${folder}/${crypto.randomUUID()}.jpg`;
        const bucketName = process.env.S3_BUCKET_NAME || "sabiharaan-app-images";

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: buffer,
            ContentType: "image/jpeg"
        });

        await s3Client.send(command);

        const imageUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        console.log("Uploaded Image URL:", imageUrl);
        return imageUrl;
    } catch (error) {
        console.error("Error uploading to S3:", error);
        throw new Error("S3 Upload Failed: " + error.message);
    }
}

module.exports = {
    uploadBase64Image,
    s3Client
};
