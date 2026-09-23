const express = require("express");
const multer = require("multer");

const {
  createPost,
  getPosts,
  getUserPosts,
  getPostById,
  deletePost,
  likePost,
  unlikePost,
  savePost,
  unsavePost,
  uploadPostMedia,
} = require("../controllers/postController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| MULTER CONFIGURATION
|--------------------------------------------------------------------------
*/

const storage = multer.memoryStorage();

/*
|--------------------------------------------------------------------------
| ALLOWED FILE TYPES
|--------------------------------------------------------------------------
*/

const allowedTypes = [
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",

  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/mpeg",
  "video/ogg",

  // Audio
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/webm",
  "audio/x-m4a",

  // PDF
  "application/pdf",

  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // PowerPoint
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // Text
  "text/plain",
];

/*
|--------------------------------------------------------------------------
| FILE FILTER
|--------------------------------------------------------------------------
*/

const fileFilter = (req, file, cb) => {
  /*
  |--------------------------------------------------------------------------
  | Exact MIME type
  |--------------------------------------------------------------------------
  */

  if (allowedTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  /*
  |--------------------------------------------------------------------------
  | Allow all video formats
  |--------------------------------------------------------------------------
  |
  | This helps with MOV, MP4 and other browser MIME variations.
  |
  |--------------------------------------------------------------------------
  */

  if (
    file.mimetype &&
    file.mimetype.startsWith("video/")
  ) {
    return cb(null, true);
  }

  /*
  |--------------------------------------------------------------------------
  | Allow all image formats
  |--------------------------------------------------------------------------
  */

  if (
    file.mimetype &&
    file.mimetype.startsWith("image/")
  ) {
    return cb(null, true);
  }

  /*
  |--------------------------------------------------------------------------
  | Allow all audio formats
  |--------------------------------------------------------------------------
  */

  if (
    file.mimetype &&
    file.mimetype.startsWith("audio/")
  ) {
    return cb(null, true);
  }

  /*
  |--------------------------------------------------------------------------
  | Reject unsupported file
  |--------------------------------------------------------------------------
  */

  return cb(
    new Error(
      "This file type is not supported. Please upload an image, video, audio, or document."
    ),
    false
  );
};

/*
|--------------------------------------------------------------------------
| MULTER UPLOAD
|--------------------------------------------------------------------------
|
| Maximum file size:
|
| 500 MB
|
|--------------------------------------------------------------------------
*/

const upload = multer({
  storage,

  limits: {
    fileSize: 500 * 1024 * 1024,
  },

  fileFilter,
});

/*
|--------------------------------------------------------------------------
| PUBLIC POST ROUTES
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Get All Posts
|--------------------------------------------------------------------------
| GET /api/posts
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  getPosts
);

/*
|--------------------------------------------------------------------------
| Get Posts By User
|--------------------------------------------------------------------------
| GET /api/posts/user/:userId
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Must come before "/:id".
|--------------------------------------------------------------------------
*/

router.get(
  "/user/:userId",
  getUserPosts
);

/*
|--------------------------------------------------------------------------
| UPLOAD POST MEDIA
|--------------------------------------------------------------------------
| POST /api/posts/upload-media
|--------------------------------------------------------------------------
|
| FormData:
|
| file = image/video/audio/document
|
|--------------------------------------------------------------------------
*/

router.post(
  "/upload-media",
  protect,
  upload.single("file"),
  uploadPostMedia
);

/*
|--------------------------------------------------------------------------
| Get Single Post
|--------------------------------------------------------------------------
| GET /api/posts/:id
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  getPostById
);

/*
|--------------------------------------------------------------------------
| PROTECTED POST ROUTES
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Create Post
|--------------------------------------------------------------------------
| POST /api/posts
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  protect,
  createPost
);

/*
|--------------------------------------------------------------------------
| Like Post
|--------------------------------------------------------------------------
| POST /api/posts/:id/like
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/like",
  protect,
  likePost
);

/*
|--------------------------------------------------------------------------
| Unlike Post
|--------------------------------------------------------------------------
| DELETE /api/posts/:id/like
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id/like",
  protect,
  unlikePost
);

/*
|--------------------------------------------------------------------------
| Save Post
|--------------------------------------------------------------------------
| POST /api/posts/:id/save
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/save",
  protect,
  savePost
);

/*
|--------------------------------------------------------------------------
| Unsave Post
|--------------------------------------------------------------------------
| DELETE /api/posts/:id/save
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id/save",
  protect,
  unsavePost
);

/*
|--------------------------------------------------------------------------
| Delete Post
|--------------------------------------------------------------------------
| DELETE /api/posts/:id
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  protect,
  deletePost
);

/*
|--------------------------------------------------------------------------
| MULTER ERROR HANDLER
|--------------------------------------------------------------------------
|
| Returns JSON instead of Express HTML error page.
|--------------------------------------------------------------------------
*/

router.use(
  (error, req, res, next) => {
    console.error(
      "Post upload error:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | File too large
    |--------------------------------------------------------------------------
    */

    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "File is too large. Maximum allowed size is 500 MB.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Other Multer errors
    |--------------------------------------------------------------------------
    */

    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "File upload failed.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | File filter / other errors
    |--------------------------------------------------------------------------
    */

    if (error) {
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "File upload failed.",
      });
    }

    next();
  }
);

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = router;