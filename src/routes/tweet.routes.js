import { Router } from "express";
import {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet,
  retweet,
} from "../controllers/tweet.controller.js";
import { verifyUser } from "../middlewares/verifyUser.middleware.js";

const router = Router()

// Create a new tweet
router.route("/createTweet").post(verifyUser, createTweet);

// Get all tweets for a specific user
router.route("/tweets").get(verifyUser, getUserTweets);
// GET /api/tweets?userId=63f2bfc8e317b45a8d99db8b&userType=Traveler
// Authorization: Bearer <token>

// Update a tweet
router.route("/:tweetId").patch(verifyUser, updateTweet);

// Delete a tweet
router.route("/:tweetId").delete(verifyUser, deleteTweet);

// Retweet a tweet
router.route("/retweet/:tweetId").post(verifyUser, retweet);

export default router;
