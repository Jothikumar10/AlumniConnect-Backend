const mongoose = require("mongoose");

const Comment = require("../models/Comment");
const Post = require("../models/Post");
const createNotification = require("../utils/createNotification");

/*
|--------------------------------------------------------------------------
| GET AUTHENTICATED USER ID
|--------------------------------------------------------------------------
*/

const getAuthenticatedUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    req.userId ||
    null
  );
};

/*
|--------------------------------------------------------------------------
| CHECK AUTHENTICATION
|--------------------------------------------------------------------------
*/

const requireAuthentication = (req, res) => {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });

    return null;
  }

  return userId;
};

/*
|--------------------------------------------------------------------------
| CREATE COMMENT
|--------------------------------------------------------------------------
| POST /api/comments/post/:postId
|--------------------------------------------------------------------------
*/

const createComment = async (req, res) => {
  try {
    const userId = requireAuthentication(req, res);

    if (!userId) {
      return;
    }

    const { postId } = req.params;
    const { content } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validate User ID
    |--------------------------------------------------------------------------
    */

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authenticated user.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Post ID
    |--------------------------------------------------------------------------
    */

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Content
    |--------------------------------------------------------------------------
    */

    const cleanContent = String(content || "").trim();

    if (!cleanContent) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot be empty.",
      });
    }

    if (cleanContent.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 1000 characters.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Post
    |--------------------------------------------------------------------------
    */

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create Comment
    |--------------------------------------------------------------------------
    */

    const comment = await Comment.create({
      post: postId,
      author: userId,
      content: cleanContent,
    });

    /*
    |--------------------------------------------------------------------------
    | Increase Post Comment Count
    |--------------------------------------------------------------------------
    */

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        $inc: {
          comments: 1,
        },
      },
      {
        new: true,
      }
    ).select("comments");

    /*
    |--------------------------------------------------------------------------
    | Populate Comment Author
    |--------------------------------------------------------------------------
    */

    await comment.populate(
      "author",
      "name profileImage role company graduationYear"
    );

    /*
    |--------------------------------------------------------------------------
    | Notify Post Owner
    |--------------------------------------------------------------------------
    */

    await createNotification({
      recipient: post.author,
      sender: userId,
      type: "comment",
      title: "New Comment",
      message: `${
        comment.author?.name || "Someone"
      } commented on your post.`,
      post: post._id,
    });

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      comment,
      commentsCount: updatedPost?.comments || 0,
    });
  } catch (error) {
    console.error("Create comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create comment.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET COMMENTS
|--------------------------------------------------------------------------
| GET /api/comments/post/:postId
|--------------------------------------------------------------------------
*/

const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    /*
    |--------------------------------------------------------------------------
    | Validate Post ID
    |--------------------------------------------------------------------------
    */

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Post
    |--------------------------------------------------------------------------
    */

    const post = await Post.findById(postId).select(
      "_id comments"
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const page = Math.max(
      Number.parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(req.query.limit, 10) || 10,
        1
      ),
      50
    );

    const skip = (page - 1) * limit;

    /*
    |--------------------------------------------------------------------------
    | Get Comments
    |--------------------------------------------------------------------------
    */

    const comments = await Comment.find({
      post: postId,
    })
      .populate(
        "author",
        "name profileImage role company graduationYear"
      )
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean();

    /*
    |--------------------------------------------------------------------------
    | Total Comments
    |--------------------------------------------------------------------------
    */

    const totalComments = await Comment.countDocuments({
      post: postId,
    });

    const totalPages = Math.ceil(
      totalComments / limit
    );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      message: "Comments fetched successfully.",

      pagination: {
        page,
        limit,
        totalComments,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },

      comments,

      commentsCount:
        post.comments || totalComments,
    });
  } catch (error) {
    console.error("Get comments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch comments.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE COMMENT
|--------------------------------------------------------------------------
| DELETE /api/comments/:id
|--------------------------------------------------------------------------
| Only the comment owner can delete.
|--------------------------------------------------------------------------
*/

const deleteComment = async (req, res) => {
  try {
    const userId = requireAuthentication(req, res);

    if (!userId) {
      return;
    }

    const { id } = req.params;

    /*
    |--------------------------------------------------------------------------
    | Validate User ID
    |--------------------------------------------------------------------------
    */

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authenticated user.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Comment ID
    |--------------------------------------------------------------------------
    */

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Comment
    |--------------------------------------------------------------------------
    */

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Ownership
    |--------------------------------------------------------------------------
    */

    if (
      !comment.author ||
      comment.author.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to delete this comment.",
      });
    }

    const postId = comment.post;

    /*
    |--------------------------------------------------------------------------
    | Delete Comment
    |--------------------------------------------------------------------------
    */

    await Comment.findByIdAndDelete(id);

    /*
    |--------------------------------------------------------------------------
    | Decrease Post Comment Count Safely
    |--------------------------------------------------------------------------
    */

    const updatedPost = await Post.findOneAndUpdate(
      {
        _id: postId,
        comments: {
          $gt: 0,
        },
      },
      {
        $inc: {
          comments: -1,
        },
      },
      {
        new: true,
      }
    ).select("comments");

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
      commentsCount: updatedPost?.comments || 0,
    });
  } catch (error) {
    console.error("Delete comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete comment.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/*
|--------------------------------------------------------------------------
| LIKE COMMENT
|--------------------------------------------------------------------------
| POST /api/comments/:id/like
|--------------------------------------------------------------------------
*/

const likeComment = async (req, res) => {
  try {
    const userId = requireAuthentication(req, res);

    if (!userId) {
      return;
    }

    const { id } = req.params;

    /*
    |--------------------------------------------------------------------------
    | Validate User ID
    |--------------------------------------------------------------------------
    */

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authenticated user.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Comment ID
    |--------------------------------------------------------------------------
    */

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Comment
    |--------------------------------------------------------------------------
    */

    const existingComment = await Comment.findById(id);

    if (!existingComment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Existing Like
    |--------------------------------------------------------------------------
    */

    const alreadyLiked =
      Array.isArray(existingComment.likes) &&
      existingComment.likes.some(
        (like) =>
          like &&
          like.toString() === userId.toString()
      );

    if (alreadyLiked) {
      return res.status(400).json({
        success: false,
        message:
          "You have already liked this comment.",
        likesCount:
          existingComment.likes.length,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Add Like
    |--------------------------------------------------------------------------
    */

    const comment = await Comment.findByIdAndUpdate(
      id,
      {
        $addToSet: {
          likes: userId,
        },
      },
      {
        new: true,
      }
    ).populate(
      "author",
      "name profileImage role company graduationYear"
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Notify Comment Owner
    |--------------------------------------------------------------------------
    */

    await createNotification({
      recipient:
        comment.author?._id ||
        existingComment.author,
      sender: userId,
      type: "comment_like",
      title: "Comment Liked",
      message: `${
        req.user?.name || "Someone"
      } liked your comment.`,
    });

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      message: "Comment liked successfully.",
      comment,
      likesCount: comment.likes.length,
    });
  } catch (error) {
    console.error("Like comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to like comment.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/*
|--------------------------------------------------------------------------
| UNLIKE COMMENT
|--------------------------------------------------------------------------
| DELETE /api/comments/:id/like
|--------------------------------------------------------------------------
*/

const unlikeComment = async (req, res) => {
  try {
    const userId = requireAuthentication(req, res);

    if (!userId) {
      return;
    }

    const { id } = req.params;

    /*
    |--------------------------------------------------------------------------
    | Validate User ID
    |--------------------------------------------------------------------------
    */

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authenticated user.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Comment ID
    |--------------------------------------------------------------------------
    */

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Remove Like
    |--------------------------------------------------------------------------
    */

    const comment = await Comment.findByIdAndUpdate(
      id,
      {
        $pull: {
          likes: userId,
        },
      },
      {
        new: true,
      }
    ).populate(
      "author",
      "name profileImage role company graduationYear"
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      message: "Comment unliked successfully.",
      comment,
      likesCount: comment.likes.length,
    });
  } catch (error) {
    console.error("Unlike comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to unlike comment.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/*
|--------------------------------------------------------------------------
| EXPORT CONTROLLERS
|--------------------------------------------------------------------------
*/

module.exports = {
  createComment,
  getComments,
  deleteComment,
  likeComment,
  unlikeComment,
};