import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Helper function to calculate unique like count for a post
const calculatePostLikeCount = async (postId) => {
    const result = await Like.aggregate([
        {
            $match: {
                post: mongoose.Types.ObjectId(postId)
            }
        }, // Match likes for the post
        {
            $group: {
                _id: "$post",
                uniqueLikes: { $addToSet: "$likedBy.userId" }
            }
        }, // Collect unique user IDs
        {
            $project: {
                likeCount: { $size: "$uniqueLikes" }
            }
        }, // Count unique user IDs
    ]);
    return result[0]?.likeCount || 0; // Return like count or 0 if no likes
};

// Helper function to calculate unique like count for a comment
const calculateCommentLikeCount = async (commentId) => {
    const result = await Like.aggregate([
        {
            $match:
            {
                comment: mongoose.Types.ObjectId(commentId)

            }
        }, // Match likes for the comment
        {
            $group: {
                _id: "$comment",
                uniqueLikes: { $addToSet: "$likedBy.userId" }
            }
        }, // Collect unique user IDs
        {
            $project: {
                likeCount: { $size: "$uniqueLikes" }
            }
        }, // Count unique user IDs
    ]);
    return result[0]?.likeCount || 0; // Return like count or 0 if no likes
};


// Helper function to calculate unique like count for a tweet
const calculateTweetLikeCount = async (tweetId) => {
    const result = await Like.aggregate([
        {
            $match: {
                tweet: mongoose.Types.ObjectId(tweetId)
            }
        }, // Match likes for the tweet
        {
            $group: {
                _id: "$tweet",
                uniqueLikes: { $addToSet: "$likedBy.userId" }
            }
        }, // Collect unique user IDs
        {
            $project: {
                likeCount: { $size: "$uniqueLikes" }
            }
        }, // Count unique user IDs
    ]);
    return result[0]?.likeCount || 0; // Return like count or 0 if no likes
};

// Helper function to calculate unique like count for a package
const calculatePackageLikeCount = async (packageId) => {
    const result = await Like.aggregate([
        {
            $match: {
                package: mongoose.Types.ObjectId(packageId)
            }
        }, // Match likes for the package
        {
            $group: {
                _id: "$package",
                uniqueLikes: { $addToSet: "$likedBy.userId" }
            }
        }, // Collect unique user IDs
        {
            $project: {
                likeCount: { $size: "$uniqueLikes" }
            }
        }, // Count unique user IDs
    ]);
    return result[0]?.likeCount || 0; // Return like count or 0 if no likes
};

// Toggle like for a post
const togglePostLike = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { userId, userType } = req.body;

    if (!mongoose.isValidObjectId(postId) || !mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid postId or userId");
    }

    // Check if the user has already liked the post
    const existingLike = await Like.findOne({ post: postId, "likedBy.userId": userId });

    if (existingLike) {
        // If the user already liked the post, remove the like
        await existingLike.deleteOne();
        const likeCount = await calculatePostLikeCount(postId); // Recalculate like count
        return res.status(200).json(new ApiResponse(200, { likeCount }, "Post unliked successfully."));
    } else {
        // If the user hasn't liked the post, add the like
        await Like.create({ post: postId, likedBy: { userId, userType } });
        const likeCount = await calculatePostLikeCount(postId); // Recalculate like count
        return res.status(201).json(new ApiResponse(201, { likeCount }, "Post liked successfully."));
    }
});


// Toggle like for a comment
const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { userId, userType } = req.body;

    if (!mongoose.isValidObjectId(commentId) || !mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid commentId or userId");
    }

    // Check if the user has already liked the comment
    const existingLike = await Like.findOne({ comment: commentId, "likedBy.userId": userId });

    if (existingLike) {
        // If the user already liked the comment, remove the like
        await existingLike.deleteOne();
        const likeCount = await calculateCommentLikeCount(commentId); // Recalculate like count
        return res.status(200).json(new ApiResponse(200, { likeCount }, "Comment unliked successfully."));
    } else {
        // If the user hasn't liked the comment, add the like
        await Like.create({ comment: commentId, likedBy: { userId, userType } });
        const likeCount = await calculateCommentLikeCount(commentId); // Recalculate like count
        return res.status(201).json(new ApiResponse(201, { likeCount }, "Comment liked successfully."));
    }
});

// Toggle like for a tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { userId, userType } = req.body;

    if (!mongoose.isValidObjectId(tweetId) || !mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid tweetId or userId");
    }

    // Check if the user has already liked the tweet
    const existingLike = await Like.findOne({ tweet: tweetId, "likedBy.userId": userId });

    if (existingLike) {
        // If the user already liked the tweet, remove the like
        await existingLike.deleteOne();
        const likeCount = await calculateTweetLikeCount(tweetId); // Recalculate like count
        return res.status(200).json(new ApiResponse(200, { likeCount }, "Tweet unliked successfully."));
    } else {
        // If the user hasn't liked the tweet, add the like
        await Like.create({ tweet: tweetId, likedBy: { userId, userType } });
        const likeCount = await calculateTweetLikeCount(tweetId); // Recalculate like count
        return res.status(201).json(new ApiResponse(201, { likeCount }, "Tweet liked successfully."));
    }
});

// Get all liked posts by a user
const getLikedPost = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    // Aggregate to find posts liked by the user
    const likedPosts = await Like.aggregate([
        {
            $match: {
                "likedBy.userId": mongoose.Types.ObjectId(userId),
                post: { $exists: true }
            }
        },
        {
            $lookup: {
                from: "posts",
                localField: "post",
                foreignField: "_id",
                as: "postDetails"
            }
        },
        {
            $unwind: "$postDetails"
        },
        {
            $project: {
                _id: 0,
                postId: "$post",
                caption: "$postDetails.caption",
                likeCount: { $size: "$likedBy.userId" }
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, likedPosts, "Liked posts fetched successfully."));
});

// Toggle like for a package
const togglePackageLike = asyncHandler(async (req, res) => {
    const { packageId } = req.params;
    const { userId, userType } = req.body;

    if (!mongoose.isValidObjectId(packageId) || !mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid packageId or userId");
    }

    // Check if the user has already liked the package
    const existingLike = await Like.findOne({ package: packageId, "likedBy.userId": userId });

    if (existingLike) {
        // If the user already liked the package, remove the like
        await existingLike.deleteOne();
        const likeCount = await calculatePackageLikeCount(packageId); // Recalculate like count
        return res.status(200).json(new ApiResponse(200, { likeCount }, "Package unliked successfully."));
    } else {
        // If the user hasn't liked the package, add the like
        await Like.create({ package: packageId, likedBy: { userId, userType } });
        const likeCount = await calculatePackageLikeCount(packageId); // Recalculate like count
        return res.status(201).json(new ApiResponse(201, { likeCount }, "Package liked successfully."));
    }
});


// Get all liked packages by a user
const getLikedPackage = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    // Aggregate to find packages liked by the user
    const likedPackages = await Like.aggregate([
        {
            $match: {
                "likedBy.userId": mongoose.Types.ObjectId(userId),
                package: { $exists: true }
            }
        },
        {
            $lookup: {
                from: "packages",
                localField: "package",
                foreignField: "_id",
                as: "packageDetails"
            }
        },
        {
            $unwind: "$packageDetails"
        },
        {
            $project: {
                _id: 0,
                packageId: "$package",
                name: "$packageDetails.name",
                likeCount: { $size: "$likedBy.userId" }
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, likedPackages, "Liked packages fetched successfully."));
});



export {
    togglePostLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedPost,
    togglePackageLike,
    getLikedPackage
};
