import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get all comments for a specific post, with pagination and owner population
const getPostComments = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Calculate the number of items to skip for pagination
    const skip = (page - 1) * limit;

    // Use aggregation pipeline to fetch the comments
    const comments = await Comment.aggregate([
        {
            $match: { post: mongoose.Types.ObjectId(postId) },  // Match comments for the specific post
        },
        {
            $lookup: {
                from: "travelers",  // Assuming `Traveler` model name is 'travelers'
                localField: "owner.userId",
                foreignField: "_id",
                as: "ownerDetails",
            },
        },
        {
            $unwind: {
                path: "$ownerDetails",
                preserveNullAndEmptyArrays: true,  // In case the owner is an Agency, for example
            },
        },
        {
            $lookup: {
                from: "agencies",  // Assuming `Agency` model name is 'agencies'
                localField: "owner.userId",
                foreignField: "_id",
                as: "agencyDetails",
            },
        },
        {
            $unwind: {
                path: "$agencyDetails",
                preserveNullAndEmptyArrays: true,  // In case the owner is a Traveler, for example
            },
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                "ownerDetails._id": 1,
                "ownerDetails.userName": 1,
                "ownerDetails.avatar": 1,
                "agencyDetails._id": 1,
                "agencyDetails.agencyName": 1,
                "agencyDetails.avatar": 1, // Include avatar from Agency
                "agencyDetails.userName": 1, // Include userName from Agency
            },
        },
        {
            $skip: skip,  // Implement pagination
        },
        {
            $limit: limit,  // Limit results per page
        },
    ]);

    // Count the total comments for the post to handle pagination in the response
    const totalComments = await Comment.countDocuments({ post: mongoose.Types.ObjectId(postId) });

    // Send the response with the comments and pagination data
    res.status(200).json(new ApiResponse(comments, totalComments, page, limit));
});


// Add a comment to a post
const addComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { postId } = req.params;

    if (!content) {
        throw new ApiError(400, "Comment content is required.");
    }

    const newComment = new Comment({
        content,
        post: postId,
        owner: {
            userType: req.user.userType, // assuming req.user contains user data (Traveler/Agency)
            userId: req.user._id,
        },
    });

    await newComment.save();

    res.status(201).json(new ApiResponse(newComment));
});

// Update a comment
const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "Comment content is required.");
    }

    // Fetch the comment by ID
    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found.");
    }

    // Ensure the user is the owner of the comment
    if (comment.owner.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment.");
    }

    // Update the content of the comment
    comment.content = content;
    await comment.save();

    res.status(200).json(new ApiResponse(comment));
});

// Delete a comment
const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    // Fetch the comment by ID
    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found.");
    }

    // Ensure the user is the owner of the comment
    if (comment.owner.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment.");
    }

    // Delete the comment
    await comment.remove();

    res.status(200).json(new ApiResponse(null, "Comment deleted successfully."));
});

export {
    getPostComments,
    addComment,
    updateComment,
    deleteComment,
};
