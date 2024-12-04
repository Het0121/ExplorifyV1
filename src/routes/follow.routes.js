import { Router } from "express";
import { 
  toggleFollow, 
  getUserFollower, 
  getUserFollowing 
} from "../controllers/follow.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyAgencyJWT } from "../middlewares/agencyAuth.middleware.js";

const router = Router()

// Middleware to handle user type (Traveler or Agency)
const verifyUser = (req, res, next) => {
  const userType = req.headers["user-type"]; 
  if (userType === "Traveler") {
    return verifyJWT(req, res, next);
  } else if (userType === "Agency") {
    return verifyAgencyJWT(req, res, next);
  }
  return res.status(400).json({ error: "Invalid user type." });
};

// Toggle follow/unfollow a user
router.route("/:userName/togglefollow").post(verifyUser, toggleFollow);

// Get followers list for a user
router.route("/:userName/followers").get(verifyUser, getUserFollower);

// Get followings list for a user
router.route("/:userName/followings").get(verifyUser, getUserFollowing);

export default router;
