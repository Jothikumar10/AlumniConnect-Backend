const mongoose = require("mongoose");
const Post = require("../models/Post");
const Follow = require("../models/Follow");
const createNotification = require("../utils/createNotification");
const cloudinary = require("../config/cloudinary");

/*
|--------------------------------------------------------------------------
| Helper: Check Logged-In User
|--------------------------------------------------------------------------
*/

const getAuthenticatedUserId = (req) => {
  if (!req.user || !req.user._id) {
    return null;
  }

  return req.user._id;
};

/*
|--------------------------------------------------------------------------
| Helper: Validate MongoDB ObjectId
|--------------------------------------------------------------------------
*/

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/*
|--------------------------------------------------------------------------
| Helper: Extract Hashtags
|--------------------------------------------------------------------------
*/

const extractHashtags = (content = "") => {
  const matches =
    String(content).match(/#[a-zA-Z0-9_]+/g) || [];

  return [
    ...new Set(
      matches.map((tag) => tag.toLowerCase())
    ),
  ];
};

/*
|--------------------------------------------------------------------------
| Helper: Extract Mentions
|--------------------------------------------------------------------------
*/

const extractMentions = (content = "") => {
  const matches =
    String(content).match(/@[a-zA-Z0-9_]+/g) || [];

  return [
    ...new Set(
      matches.map((mention) =>
        mention.substring(1)
      )
    ),
  ];
};

/*
|--------------------------------------------------------------------------
| Helper: Normalize Poll
|--------------------------------------------------------------------------
*/

const normalizePoll = (poll) => {
  if (!poll || typeof poll !== "object") {
    return null;
  }

  const question = String(
    poll.question || ""
  ).trim();

  if (!question) {
    return null;
  }

  const options = Array.isArray(poll.options)
    ? poll.options
        .map((option) => {
          if (typeof option === "string") {
            return {
              text: option.trim(),
              votes: 0,
            };
          }

          if (
            option &&
            typeof option === "object"
          ) {
            return {
              text: String(
                option.text || ""
              ).trim(),

              votes: Math.max(
                Number(option.votes) || 0,
                0
              ),
            };
          }

          return null;
        })
        .filter(
          (option) =>
            option &&
            option.text
        )
    : [];

  return {
    question,
    options,
  };
};

/*
|--------------------------------------------------------------------------
| Helper: Normalize Job
|--------------------------------------------------------------------------
*/

const normalizeJob = (job) => {
  if (!job || typeof job !== "object") {
    return null;
  }

  const title = String(
    job.title || ""
  ).trim();

  if (!title) {
    return null;
  }

  return {
    title,

    company: String(
      job.company || ""
    ).trim(),

    location: String(
      job.location || ""
    ).trim(),

    experience: String(
      job.experience || ""
    ).trim(),

    description: String(
      job.description || ""
    ).trim(),
  };
};

/*
|--------------------------------------------------------------------------
| Helper: Normalize Event
|--------------------------------------------------------------------------
*/

const normalizeEvent = (event) => {
  if (!event || typeof event !== "object") {
    return null;
  }

  const title = String(
    event.title || ""
  ).trim();

  if (!title) {
    return null;
  }

  return {
    title,

    date: String(
      event.date || ""
    ).trim(),

    location: String(
      event.location || ""
    ).trim(),

    description: String(
      event.description || ""
    ).trim(),
  };
};

/*
|--------------------------------------------------------------------------
| Helper: Populate Author
|--------------------------------------------------------------------------
*/

const populateAuthor = async (post) => {
  if (!post) {
    return post;
  }

  await post.populate(
    "author",
    "name email profileImage role company graduationYear"
  );

  return post;
};

/*
|--------------------------------------------------------------------------
| Helper: Get Media Type
|--------------------------------------------------------------------------
*/

const getMediaType = (mimetype = "") => {
  if (mimetype.startsWith("image/")) {
    return "image";
  }

  if (mimetype.startsWith("video/")) {
    return "video";
  }

  if (mimetype.startsWith("audio/")) {
    return "audio";
  }

  return "document";
};

/*
|--------------------------------------------------------------------------
| Helper: Upload Buffer To Cloudinary
|--------------------------------------------------------------------------
*/

const uploadToCloudinary = (
  buffer,
  options = {}
) => {
  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

    uploadStream.end(buffer);
  });
};

/*
|--------------------------------------------------------------------------
| Helper: Notify Followers About New Post
|--------------------------------------------------------------------------
*/

const notifyFollowersAboutNewPost = async (
  userId,
  post
) => {
  try {
    const follows = await Follow.find({
      following: userId,
    }).select("follower");

    if (!follows.length) {
      return;
    }

    const authorName =
      post?.author?.name ||
      "Someone";

    await Promise.all(
      follows.map((follow) =>
        createNotification({
          recipient: follow.follower,
          sender: userId,
          type: "new_post",
          title: "New Post",
          message: `${authorName} created a new post.`,
          post: post._id,
        })
      )
    );
  } catch (error) {
    console.error(
      "Notify followers about new post error:",
      error
    );
  }
};

/*
|--------------------------------------------------------------------------
| Helper: Notify Post Author About Like
|--------------------------------------------------------------------------
*/

const notifyPostAuthorAboutLike = async (
  post,
  userId
) => {
  try {
    if (!post || !post.author) {
      return;
    }

    await createNotification({
      recipient: post.author,
      sender: userId,
      type: "like",
      title: "Post Liked",
      message: "Someone liked your post.",
      post: post._id,
    });
  } catch (error) {
    console.error(
      "Notify post author about like error:",
      error
    );
  }
};

/*
|--------------------------------------------------------------------------
| UPLOAD POST MEDIA
|--------------------------------------------------------------------------
| POST /api/posts/upload-media
|--------------------------------------------------------------------------
| Authentication required.
|--------------------------------------------------------------------------
|
| Supports:
| - Images
| - Videos
| - Audio
| - Documents
|--------------------------------------------------------------------------
*/

const uploadPostMedia = async (
  req,
  res
) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required. Please login first.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check File
    |--------------------------------------------------------------------------
    */

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please select a file to upload.",
      });
    }

    const {
      mimetype,
      originalname,
      size,
      buffer,
    } = req.file;

    /*
    |--------------------------------------------------------------------------
    | Maximum File Size
    |--------------------------------------------------------------------------
    */

    const maxFileSize =
      50 * 1024 * 1024;

    if (size > maxFileSize) {
      return res.status(400).json({
        success: false,
        message:
          "File size must be 50 MB or less.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Allowed MIME Types
    |--------------------------------------------------------------------------
    */

    const allowedMimeTypes = [
      // Images
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",

      // Videos
      "video/mp4",
      "video/webm",
      "video/quicktime",

      // Audio
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",

      // Documents
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
    ];

    if (
      !allowedMimeTypes.includes(
        mimetype
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This file type is not supported.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Detect Media Type
    |--------------------------------------------------------------------------
    */

    const mediaType =
      getMediaType(mimetype);

    /*
    |--------------------------------------------------------------------------
    | Cloudinary Resource Type
    |--------------------------------------------------------------------------
    */

    let resourceType = "raw";

    if (mediaType === "image") {
      resourceType = "image";
    }

    if (
      mediaType === "video" ||
      mediaType === "audio"
    ) {
      resourceType = "video";
    }

    /*
    |--------------------------------------------------------------------------
    | Upload To Cloudinary
    |--------------------------------------------------------------------------
    */

    const uploadResult =
      await uploadToCloudinary(
        buffer,
        {
          folder:
            "alumniconnect/posts",

          resource_type:
            resourceType,

          use_filename: true,

          unique_filename: true,
        }
      );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,

      message:
        "Post media uploaded successfully.",

      data: {
        type: mediaType,

        url:
          uploadResult.secure_url,

        publicId:
          uploadResult.public_id,

        name:
          originalname,

        resourceType,
      },
    });
  } catch (error) {
    console.error(
      "Upload post media error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to upload post media.",

      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE POST
|--------------------------------------------------------------------------
| POST /api/posts
|--------------------------------------------------------------------------
| Authentication required.
|--------------------------------------------------------------------------
*/

const createPost = async (
  req,
  res
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required. Please login first.",
      });
    }

    const {
      content = "",
      type = "post",
      media = [],
      link = null,
      hashtags = [],
      mentions = [],
      poll = null,
      job = null,
      event = null,
    } = req.body || {};

    const cleanContent = String(
      content || ""
    ).trim();

    const hasContent =
      cleanContent.length > 0;

    const hasMedia =
      Array.isArray(media) &&
      media.length > 0;

    const hasLink =
      typeof link === "string" &&
      link.trim().length > 0;

    const hasPoll =
      poll &&
      typeof poll === "object" &&
      String(
        poll.question || ""
      ).trim().length > 0;

    const hasJob =
      job &&
      typeof job === "object" &&
      String(
        job.title || ""
      ).trim().length > 0;

    const hasEvent =
      event &&
      typeof event === "object" &&
      String(
        event.title || ""
      ).trim().length > 0;

    /*
    |--------------------------------------------------------------------------
    | Empty Post Check
    |--------------------------------------------------------------------------
    */

    if (
      !hasContent &&
      !hasMedia &&
      !hasLink &&
      !hasPoll &&
      !hasJob &&
      !hasEvent
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Post cannot be empty.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Allowed Post Types
    |--------------------------------------------------------------------------
    */

    const allowedTypes = [
      "post",
      "career",
      "job",
      "achievement",
      "event",
      "poll",
    ];

    const postType =
      allowedTypes.includes(type)
        ? type
        : "post";

    /*
    |--------------------------------------------------------------------------
    | Hashtags
    |--------------------------------------------------------------------------
    */

    const contentHashtags =
      extractHashtags(
        cleanContent
      );

    const providedHashtags =
      Array.isArray(hashtags)
        ? hashtags
            .map((tag) =>
              String(tag)
                .trim()
                .replace(/^#/, "")
                .toLowerCase()
            )
            .filter(Boolean)
        : [];

    const finalHashtags = [
      ...new Set([
        ...contentHashtags,
        ...providedHashtags,
      ]),
    ];

    /*
    |--------------------------------------------------------------------------
    | Mentions
    |--------------------------------------------------------------------------
    */

    const contentMentions =
      extractMentions(
        cleanContent
      );

    const providedMentions =
      Array.isArray(mentions)
        ? mentions
            .map((mention) =>
              String(mention)
                .trim()
                .replace(/^@/, "")
            )
            .filter(Boolean)
        : [];

    const finalMentions = [
      ...new Set([
        ...contentMentions,
        ...providedMentions,
      ]),
    ];

    /*
    |--------------------------------------------------------------------------
    | Poll
    |--------------------------------------------------------------------------
    */

    let normalizedPoll = null;

    if (poll) {
      normalizedPoll =
        normalizePoll(poll);

      if (!normalizedPoll) {
        return res.status(400).json({
          success: false,
          message:
            "Poll question is required.",
        });
      }

      if (
        normalizedPoll.options.length < 2
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A poll must have at least 2 options.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Media
    |--------------------------------------------------------------------------
    */

    const cleanMedia =
      Array.isArray(media)
        ? media
            .filter(
              (item) =>
                item &&
                typeof item ===
                  "object" &&
                item.type &&
                item.url
            )
            .map((item) => ({
              type: item.type,

              url: String(
                item.url
              ).trim(),

              name: String(
                item.name || ""
              ).trim(),
            }))
        : [];

    /*
    |--------------------------------------------------------------------------
    | Link
    |--------------------------------------------------------------------------
    */

    const cleanLink =
      typeof link === "string" &&
      link.trim()
        ? link.trim()
        : null;

    /*
    |--------------------------------------------------------------------------
    | Job
    |--------------------------------------------------------------------------
    */

    const cleanJob =
      normalizeJob(job);

    /*
    |--------------------------------------------------------------------------
    | Event
    |--------------------------------------------------------------------------
    */

    const cleanEvent =
      normalizeEvent(event);

    /*
    |--------------------------------------------------------------------------
    | Create Post
    |--------------------------------------------------------------------------
    */

    const postData = {
      author: userId,

      content: cleanContent,

      type: postType,

      media: cleanMedia,

      link: cleanLink,

      hashtags: finalHashtags,

      mentions: finalMentions,

      poll: normalizedPoll,

      job: cleanJob,

      event: cleanEvent,

      likes: [],

      comments: 0,

      shares: 0,

      savedBy: [],

      status: "published",
    };

    const post =
      await Post.create(
        postData
      );

    /*
    |--------------------------------------------------------------------------
    | Populate Author
    |--------------------------------------------------------------------------
    */

    await populateAuthor(post);

    /*
    |--------------------------------------------------------------------------
    | Notify Followers
    |--------------------------------------------------------------------------
    */

    await notifyFollowersAboutNewPost(
      userId,
      post
    );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,

      message:
        "Post created successfully.",

      post,
    });
  } catch (error) {
    console.error(
      "Create post error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to create post.",

      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET POSTS
|--------------------------------------------------------------------------
| GET /api/posts
|--------------------------------------------------------------------------
*/

const getPosts = async (
  req,
  res
) => {
  try {
    const page = Math.max(
      Number.parseInt(
        req.query.page,
        10
      ) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(
          req.query.limit,
          10
        ) || 10,
        1
      ),
      50
    );

    const skip =
      (page - 1) * limit;

    const {
      type,
      hashtag,
      status,
    } = req.query;

    const filter = {};

    /*
    |--------------------------------------------------------------------------
    | Status Filter
    |--------------------------------------------------------------------------
    */

    filter.status =
      status || "published";

    /*
    |--------------------------------------------------------------------------
    | Type Filter
    |--------------------------------------------------------------------------
    */

    if (type) {
      filter.type = type;
    }

    /*
    |--------------------------------------------------------------------------
    | Hashtag Filter
    |--------------------------------------------------------------------------
    */

    if (hashtag) {
      const cleanHashtag =
        String(hashtag)
          .trim()
          .replace(/^#/, "")
          .toLowerCase();

      if (cleanHashtag) {
        filter.hashtags =
          cleanHashtag;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Get Posts
    |--------------------------------------------------------------------------
    */

    const posts =
      await Post.find(filter)
        .populate(
          "author",
          "name email profileImage role company graduationYear"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean();

    /*
    |--------------------------------------------------------------------------
    | Count
    |--------------------------------------------------------------------------
    */

    const totalPosts =
      await Post.countDocuments(
        filter
      );

    const totalPages =
      Math.ceil(
        totalPosts / limit
      );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      message:
        "Posts fetched successfully.",

      pagination: {
        page,
        limit,
        totalPosts,
        totalPages,

        hasNextPage:
          page < totalPages,

        hasPreviousPage:
          page > 1,
      },

      posts,
    });
  } catch (error) {
    console.error(
      "Get posts error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch posts.",

      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET USER POSTS
|--------------------------------------------------------------------------
| GET /api/posts/user/:userId
|--------------------------------------------------------------------------
*/

const getUserPosts = async (
  req,
  res
) => {
  try {
    const { userId } =
      req.params;

    /*
    |--------------------------------------------------------------------------
    | Validate User ID
    |--------------------------------------------------------------------------
    */

    if (
      !isValidObjectId(userId)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid user ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const page = Math.max(
      Number.parseInt(
        req.query.page,
        10
      ) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(
          req.query.limit,
          10
        ) || 10,
        1
      ),
      50
    );

    const skip =
      (page - 1) * limit;

    /*
    |--------------------------------------------------------------------------
    | Filter
    |--------------------------------------------------------------------------
    */

    const filter = {
      author: userId,
      status: "published",
    };

    /*
    |--------------------------------------------------------------------------
    | Get User Posts
    |--------------------------------------------------------------------------
    */

    const posts =
      await Post.find(filter)
        .populate(
          "author",
          "name email profileImage role company graduationYear"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean();

    /*
    |--------------------------------------------------------------------------
    | Count
    |--------------------------------------------------------------------------
    */

    const totalPosts =
      await Post.countDocuments(
        filter
      );

    const totalPages =
      Math.ceil(
        totalPosts / limit
      );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      message:
        "User posts fetched successfully.",

      pagination: {
        page,
        limit,
        totalPosts,
        totalPages,

        hasNextPage:
          page < totalPages,

        hasPreviousPage:
          page > 1,
      },

      posts,
    });
  } catch (error) {
    console.error(
      "Get user posts error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch user posts.",

      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE POST
|--------------------------------------------------------------------------
| GET /api/posts/:id
|--------------------------------------------------------------------------
*/

const getPostById = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid post ID.",
      });
    }

    const post =
      await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,

        message:
          "Post not found.",
      });
    }

    await populateAuthor(post);

    return res.status(200).json({
      success: true,

      message:
        "Post fetched successfully.",

      post,
    });
  } catch (error) {
    console.error(
      "Get post error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch post.",

      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE POST
|--------------------------------------------------------------------------
| DELETE /api/posts/:id
|--------------------------------------------------------------------------
*/

const deletePost = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Authentication required. Please login first.",
      });
    }

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid post ID.",
      });
    }

    const post =
      await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,

        message:
          "Post not found.",
      });
    }

    if (
      !post.author ||
      post.author.toString() !==
        userId.toString()
    ) {
      return res.status(403).json({
        success: false,

        message:
          "You are not allowed to delete this post.",
      });
    }

    await Post.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,

      message:
        "Post deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete post error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to delete post.",

      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| LIKE POST
|--------------------------------------------------------------------------
| POST /api/posts/:id/like
|--------------------------------------------------------------------------
*/

const likePost = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Authentication required. Please login first.",
      });
    }

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid post ID.",
      });
    }

    const post =
      await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,

        message:
          "Post not found.",
      });
    }

    if (!Array.isArray(post.likes)) {
      post.likes = [];
    }

    const alreadyLiked =
      post.likes.some(
        (like) =>
          like &&
          like.toString() ===
            userId.toString()
      );

    if (alreadyLiked) {
      return res.status(400).json({
        success: false,

        message:
          "You have already liked this post.",

        likesCount:
          post.likes.length,
      });
    }

    post.likes.push(userId);

    await post.save();

    /*
    |--------------------------------------------------------------------------
    | Notify Post Author
    |--------------------------------------------------------------------------
    */

    await notifyPostAuthorAboutLike(
      post,
      userId
    );

    await populateAuthor(post);

    return res.status(200).json({
      success: true,

      message:
        "Post liked successfully.",

      likesCount:
        post.likes.length,

      post,
    });
  } catch (error) {
    console.error(
      "Like post error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to like post.",

      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| UNLIKE POST
|--------------------------------------------------------------------------
| DELETE /api/posts/:id/like
|--------------------------------------------------------------------------
*/

const unlikePost = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Authentication required. Please login first.",
      });
    }

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid post ID.",
      });
    }

    const post =
      await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,

        message:
          "Post not found.",
      });
    }

    if (!Array.isArray(post.likes)) {
      post.likes = [];
    }

    const alreadyLiked =
      post.likes.some(
        (like) =>
          like &&
          like.toString() ===
            userId.toString()
      );

    if (!alreadyLiked) {
      return res.status(400).json({
        success: false,

        message:
          "You have not liked this post.",

        likesCount:
          post.likes.length,
      });
    }

    post.likes =
      post.likes.filter(
        (like) =>
          like &&
          like.toString() !==
            userId.toString()
      );

    await post.save();

    await populateAuthor(post);

    return res.status(200).json({
      success: true,

      message:
        "Post unliked successfully.",

      likesCount:
        post.likes.length,

      post,
    });
  } catch (error) {
    console.error(
      "Unlike post error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to unlike post.",

      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| SAVE POST
|--------------------------------------------------------------------------
| POST /api/posts/:id/save
|--------------------------------------------------------------------------
*/

const savePost = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Authentication required. Please login first.",
      });
    }

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid post ID.",
      });
    }

    const post =
      await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,

        message:
          "Post not found.",
      });
    }

    if (!Array.isArray(post.savedBy)) {
      post.savedBy = [];
    }

    const alreadySaved =
      post.savedBy.some(
        (savedUser) =>
          savedUser &&
          savedUser.toString() ===
            userId.toString()
      );

    if (alreadySaved) {
      return res.status(400).json({
        success: false,

        message:
          "You have already saved this post.",

        savedCount:
          post.savedBy.length,

        isSaved: true,
      });
    }

    post.savedBy.push(userId);

    await post.save();

    await populateAuthor(post);

    return res.status(200).json({
      success: true,

      message:
        "Post saved successfully.",

      savedCount:
        post.savedBy.length,

      isSaved: true,

      post,
    });
  } catch (error) {
    console.error(
      "Save post error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to save post.",

      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| UNSAVE POST
|--------------------------------------------------------------------------
| DELETE /api/posts/:id/save
|--------------------------------------------------------------------------
*/

const unsavePost = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,

        message:
          "Authentication required. Please login first.",
      });
    }

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid post ID.",
      });
    }

    const post =
      await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,

        message:
          "Post not found.",
      });
    }

    if (!Array.isArray(post.savedBy)) {
      post.savedBy = [];
    }

    const alreadySaved =
      post.savedBy.some(
        (savedUser) =>
          savedUser &&
          savedUser.toString() ===
            userId.toString()
      );

    if (!alreadySaved) {
      return res.status(400).json({
        success: false,

        message:
          "You have not saved this post.",

        savedCount:
          post.savedBy.length,

        isSaved: false,
      });
    }

    post.savedBy =
      post.savedBy.filter(
        (savedUser) =>
          savedUser &&
          savedUser.toString() !==
            userId.toString()
      );

    await post.save();

    await populateAuthor(post);

    return res.status(200).json({
      success: true,

      message:
        "Post unsaved successfully.",

      savedCount:
        post.savedBy.length,

      isSaved: false,

      post,
    });
  } catch (error) {
    console.error(
      "Unsave post error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to unsave post.",

      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| EXPORT CONTROLLERS
|--------------------------------------------------------------------------
*/

module.exports = {
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
};