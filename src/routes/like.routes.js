import { Router } from 'express';
import {
  togglePostLike,
  toggleCommentLike,
  toggleTweetLike,
  getLikedPost,
  togglePackageLike,
  getLikedPackage,
} from '../controllers/like.controller.js';

import { verifyUser } from '../middleware/auth.middleware.js';

const router = Router();

// req.body
// {
//     "userId": "your_user_id",
//     "userType": "Traveler" // or "Agency"
// }


// Route to toggle like for a post
router.route('/posts/:postId/like').post(verifyUser, togglePostLike);

// Route to toggle like for a comment
router.route('/comments/:commentId/like').post(verifyUser, toggleCommentLike);

// Route to toggle like for a tweet
router.route('/tweets/:tweetId/like').post(verifyUser, toggleTweetLike);

// Route to get all liked posts of a user
router.route('/posts/liked').get(verifyUser, getLikedPost);

// Route to toggle like for a package
router.route('/packages/:packageId/like').post(verifyUser, togglePackageLike);

// Route to get all liked packages of a user
router.route('/packages/liked').get(verifyUser, getLikedPackage);

export default router;
