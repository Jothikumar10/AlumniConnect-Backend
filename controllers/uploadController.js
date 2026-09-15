const cloudinary = require("../config/cloudinary");

const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a file to upload.",
      });
    }

    const file = req.file;

    let resourceType = "auto";

    if (file.mimetype.startsWith("image/")) {
      resourceType = "image";
    } else if (file.mimetype.startsWith("video/")) {
      resourceType = "video";
    } else if (file.mimetype.startsWith("audio/")) {
      resourceType = "video";
    } else {
      resourceType = "raw";
    }

    const uploadResult = await new Promise(
      (resolve, reject) => {
        const uploadStream =
          cloudinary.uploader.upload_stream(
            {
              folder: "alumniconnect/posts",
              resource_type: resourceType,
              use_filename: true,
              unique_filename: true,
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );

        uploadStream.end(file.buffer);
      }
    );

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully.",
      data: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        resourceType: uploadResult.resource_type,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
  } catch (error) {
    console.error("Media upload error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload file.",
      error: error.message,
    });
  }
};

module.exports = {
  uploadMedia,
};