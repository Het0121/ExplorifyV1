import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js"; 
import { ApiError } from "../utils/ApiError.js"; 
import { ApiResponse } from "../utils/ApiResponse.js"; 
import { asyncHandler } from "../utils/asyncHandler.js"; 

// Helper function to calculate unique like count for a given target (e.g., post, comment, etc.)
const calculateLikeCount = async (targetId, targetType) => {
    // Aggregate query to calculate unique likes
    const result = await Like.aggregate([
        {
            $match: {
                [targetType]: new mongoose.Types.ObjectId(targetId), // Convert targetId to ObjectId for matching
            },
        },
        {
            $group: {
                _id: `$${targetType}`, // Group by the target (e.g., postId, commentId, etc.)
                uniqueLikes: { $addToSet: "$likedBy.userId" }, // Add unique userId to avoid duplicates
            },
        },
        {
            $project: {
                likeCount: { $size: "$uniqueLikes" }, // Count the unique userIds to get like count
            },
        },
    ]);
    return result[0]?.likeCount || 0; // Return the like count (0 if no likes)
};

// Generalized function to toggle likes on various target types (post, comment, tweet, package, etc.)
const toggleLike = async (req, res, targetType) => {
    const targetId = req.params[`${targetType}Id`]; // Get the targetId from the URL parameter
    const { userId, userType } = req.body; // Get userId and userType from request body

    // Validate the targetId and userId to ensure they are valid ObjectIds
    if (!isValidObjectId(targetId) || !isValidObjectId(userId)) {
        throw new ApiError(400, `Invalid ${targetType}Id or userId`); // Return error if invalid
    }

    const likeQuery = { [targetType]: targetId, "likedBy.userId": userId }; // Query to check if the user already liked this target
    const existingLike = await Like.findOne(likeQuery); // Find if like already exists

    // If like exists, delete it and update the like count
    if (existingLike) {
        await existingLike.deleteOne(); // Remove the like
        const likeCount = await calculateLikeCount(targetId, targetType); // Recalculate the like count
        return res
            .status(200)
            .json(new ApiResponse(200, { likeCount }, `${targetType} unliked successfully.`)); // Send response
    } else {
        // If like doesn't exist, create a new like and update the like count
        await Like.create({ [targetType]: targetId, likedBy: { userId, userType } }); // Add a new like record
        const likeCount = await calculateLikeCount(targetId, targetType); // Recalculate the like count
        return res
            .status(201)
            .json(new ApiResponse(201, { likeCount }, `${targetType} liked successfully.`)); // Send response
    }
};

// Specific handler functions for different target types
const togglePostLike = asyncHandler(async (req, res) => toggleLike(req, res, "post"));
const toggleCommentLike = asyncHandler(async (req, res) => toggleLike(req, res, "comment"));
const toggleTweetLike = asyncHandler(async (req, res) => toggleLike(req, res, "tweet"));
const togglePackageLike = asyncHandler(async (req, res) => toggleLike(req, res, "package"));

// Generalized function to get the liked items for a user
const getLikedItems = async (req, res, targetType, collectionName) => {
    const { userId } = req.body; // Get userId from the request body

    // Validate the userId
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId"); // Return error if invalid
    }

    // Aggregate query to find liked items by the user
    const likedItems = await Like.aggregate([
        {
            $match: {
                "likedBy.userId": new mongoose.Types.ObjectId(userId), // Match likedBy userId
                [targetType]: { $exists: true }, // Ensure the targetType field exists
            },
        },
        {
            $lookup: {
                from: collectionName, // Join with the corresponding collection (e.g., posts, packages)
                localField: targetType, // The targetType field (e.g., postId, packageId)
                foreignField: "_id", // Match by _id field in the target collection
                as: "details", // Include target collection details in the result
            },
        },
        { $unwind: "$details" }, // Flatten the details array to get individual items
        {
            $project: {
                _id: 0, // Exclude the default _id field from the result
                id: `$${targetType}`, // Include targetId (e.g., postId, packageId)
                details: 1, // Include the details from the target collection
            },
        },
    ]);

    // Return the liked items with the target details
    return res
        .status(200)
        .json(new ApiResponse(200, likedItems, `Liked ${targetType}s fetched successfully.`));
};

// Specific handler functions to get liked posts and liked packages for a user
const getLikedPost = asyncHandler(async (req, res) => getLikedItems(req, res, "post", "posts"));
const getLikedPackage = asyncHandler(async (req, res) => getLikedItems(req, res, "package", "packages"));

export {
    togglePostLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedPost,
    togglePackageLike,
    getLikedPackage,
};
