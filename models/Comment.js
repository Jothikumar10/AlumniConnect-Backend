const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Post
    |--------------------------------------------------------------------------
    */

    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: [true, "Post is required"],
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Comment Author
    |--------------------------------------------------------------------------
    */

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Comment author is required"],
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Comment Content
    |--------------------------------------------------------------------------
    */

    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      minlength: 1,
      maxlength: 1000,
    },

    /*
    |--------------------------------------------------------------------------
    | Comment Likes
    |--------------------------------------------------------------------------
    */

    likes: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

commentSchema.index({
  post: 1,
  createdAt: -1,
});

commentSchema.index({
  author: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Comment",
  commentSchema
);