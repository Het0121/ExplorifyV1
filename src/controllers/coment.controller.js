import mongoose, {isValidObjectId} from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

    
// Get all comments for a specific post, with pagination and owner population
const getPostComments = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ApiError(400, "Invalid Post ID");
    }

    const skip = (page - 1) * limit;

    const comments = await Comment.aggregate([
        { $match: { post: new mongoose.Types.ObjectId(postId) } },
        {
            $lookup: {
                from: "travelers",
                localField: "owner.userId",
                foreignField: "_id",
                as: "travelerDetails",
            },
        },
        {
            $lookup: {
                from: "agencies",
                localField: "owner.userId",
                foreignField: "_id",
                as: "agencyDetails",
            },
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                ownerDetails: {
                    $cond: [
                        { $eq: ["$owner.userType", "Traveler"] },
                        { $arrayElemAt: ["$travelerDetails", 0] },
                        { $arrayElemAt: ["$agencyDetails", 0] },
                    ],
                },
            },
        },
        { $skip: skip },
        { $limit: parseInt(limit) },
    ]);

    const totalComments = await Comment.countDocuments({ post: new mongoose.Types.ObjectId(postId) });

    res.status(200).json(new ApiResponse(comments, totalComments, page, limit));
});


// Add a comment to a post
const addComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { postId } = req.params;

    if (!content) throw new ApiError(400, "Comment content is required.");

    const newComment = await Comment.create({
        content,
        post: postId,
        owner: {
            userType: req.userType,
            userId: req.user._id,
        },
    });

    res.status(201).json(new ApiResponse(newComment));
});

// Update a comment
const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content) throw new ApiError(400, "Comment content is required.");

    const comment = await Comment.findById(commentId);

    if (!comment) throw new ApiError(404, "Comment not found.");

    if (comment.owner.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment.");
    }

    comment.content = content;
    await comment.save();

    res.status(200).json(new ApiResponse(comment));
});

// Delete a comment

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if (!comment) throw new ApiError(404, "Comment not found.");

    if (comment.owner.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment.");
    }

    await comment.remove();

    res.status(200).json(new ApiResponse(null, "Comment deleted successfully."));
});

export {
    getPostComments,
    addComment,
    updateComment,
    deleteComment,
}