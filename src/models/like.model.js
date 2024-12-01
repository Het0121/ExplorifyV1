import mongoose, { Schema } from "mongoose";

const likeSchema = new mongoose.Schema(
    {
        post: {
            type: Schema.Types.ObjectId,
            ref: "Post",
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet",
        },
        likedBy: {
            userType: {
                type: String,
                enum: ["Traveler", "Agency"],
                required: true,
            },
            userId: {
                type: Schema.Types.ObjectId,
                refPath: "likedBy.userType",
                required: true,
            },
        },
    },
    { timestamps: true }
);

// Prevent duplicate likes on posts, comments, and tweets
likeSchema.pre("save", async function (next) {
    // Check if the user already liked the specific entity (post, comment, or tweet)
    const existingLike = await this.constructor.findOne({
        $or: [
            { post: this.post, "likedBy.userId": this.likedBy.userId },
            { comment: this.comment, "likedBy.userId": this.likedBy.userId },
            { tweet: this.tweet, "likedBy.userId": this.likedBy.userId },
        ],
    });

    if (existingLike) {
        return next(new Error("User has already liked this entity"));
    }

    next();
});


export const Like = mongoose.model("Like", likeSchema);