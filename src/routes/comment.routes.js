import { Router } from 'express';
import {
     getPostComments, 
     addComment, 
     updateComment,
      deleteComment
     } from '../controllers/coment.controller.js';
import { verifyUser } from "../middlewares/verifyUser.middleware.js"

const router = Router();

// Route to get comments for a specific post
router.route('/:postId').get(verifyUser, getPostComments);  // Fetch comments for a post, requires authentication

// Route to add a comment to a post
router.route('/:postId').post(verifyUser, addComment);  // Add a comment to a post, requires authentication

// Route to update a comment
router.route('/:commentId').patch(verifyUser, updateComment);  // Update a comment, requires authentication

// Route to delete a comment
router.route('/:commentId').delete(verifyUser, deleteComment);  // Delete a comment, requires authentication

export default router;
