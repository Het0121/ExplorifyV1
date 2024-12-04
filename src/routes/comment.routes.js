import { Router } from 'express';
import {
     getPostComments, 
     addComment, 
     updateComment,
      deleteComment
     } from '../controllers/commentController.js';
import { verifyUser } from "../middlewares/verifyUser.middleware.js"

const router = express.Router();

// Route to get comments for a specific post
router.get('/:postId', verifyUser, getPostComments);  // Fetch comments for a post, requires authentication

// Route to add a comment to a post
router.post('/:postId', verifyUser, addComment);  // Add a comment to a post, requires authentication

// Route to update a comment
router.put('/:commentId', verifyUser, updateComment);  // Update a comment, requires authentication

// Route to delete a comment
router.delete('/:commentId', verifyUser, deleteComment);  // Delete a comment, requires authentication

export default router;
