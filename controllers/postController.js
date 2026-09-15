const mongoose = require("mongoose");
const Post = require("../models/Post");

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
      matches.map((tag) =>
        tag.toLowerCase()
      )
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
    String(content).match(
      /@[a-zA-Z0-9_]+/g
    ) || [];

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

  const options = Array.isArray(
    poll.options
  )
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
| CREATE POST
|--------------------------------------------------------------------------
| POST /api/posts
|--------------------------------------------------------------------------
| Authentication required.
|--------------------------------------------------------------------------
*/

const createPost = async (req, res) => {
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

    const cleanLink =
      typeof link === "string" &&
      link.trim()
        ? link.trim()
        : null;

    const cleanJob =
      normalizeJob(job);

    const cleanEvent =
      normalizeEvent(event);

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

    await populateAuthor(post);

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

const getPosts = async (req, res) => {
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

    filter.status =
      status || "published";

    if (type) {
      filter.type = type;
    }

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

    const totalPosts =
      await Post.countDocuments(
        filter
      );

    const totalPages =
      Math.ceil(
        totalPosts / limit
      );

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
| Only post owner can delete.
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

    await Post.findByIdAndDelete(
      id
    );

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
    | Validate Post ID
    |--------------------------------------------------------------------------
    */

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid post ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Post
    |--------------------------------------------------------------------------
    */

    const post =
      await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,

        message:
          "Post not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Make Sure savedBy Is An Array
    |--------------------------------------------------------------------------
    */

    if (!Array.isArray(post.savedBy)) {
      post.savedBy = [];
    }

    /*
    |--------------------------------------------------------------------------
    | Check Existing Save
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Add Save
    |--------------------------------------------------------------------------
    */

    post.savedBy.push(userId);

    await post.save();

    /*
    |--------------------------------------------------------------------------
    | Populate Author
    |--------------------------------------------------------------------------
    */

    await populateAuthor(post);

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

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
    | Validate Post ID
    |--------------------------------------------------------------------------
    */

    if (
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid post ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Post
    |--------------------------------------------------------------------------
    */

    const post =
      await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,

        message:
          "Post not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Make Sure savedBy Is An Array
    |--------------------------------------------------------------------------
    */

    if (!Array.isArray(post.savedBy)) {
      post.savedBy = [];
    }

    /*
    |--------------------------------------------------------------------------
    | Check Existing Save
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Remove Save
    |--------------------------------------------------------------------------
    */

    post.savedBy =
      post.savedBy.filter(
        (savedUser) =>
          savedUser &&
          savedUser.toString() !==
            userId.toString()
      );

    await post.save();

    /*
    |--------------------------------------------------------------------------
    | Populate Author
    |--------------------------------------------------------------------------
    */

    await populateAuthor(post);

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

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
  getPostById,
  deletePost,
  likePost,
  unlikePost,
  savePost,
  unsavePost,
};