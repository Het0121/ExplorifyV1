import { Router } from "express";
import {

    registerTraveler,
    loginTraveler,
    logoutTraveler,
    refreshAccessToken,
    changePassword,
    curruntTravelerProfile,
    updateProfileDetails,
    updateAvatar,
    deleteAvatar,
    updateCoverImage,
    deleteCoverImage,
    togglePrivacy

} from "../controllers/traveler.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()

// Register Traveler
router.route("/register").post(registerTraveler)

// Login Traveler
router.route("/login").post(loginTraveler)

// Logout Traveler
router.route("/logout").post(verifyJWT, logoutTraveler)

// Refresh Token API
router.route("/refresh-token").post(refreshAccessToken)

// Get Traveler Profile
router.route("/current-Traveler").get(verifyJWT, curruntTravelerProfile)

// Update Traveler Profile
router.route("/update-profile").patch(verifyJWT, updateProfileDetails)

// Change Password
router.route("/change-password").post(verifyJWT, changePassword)

// Update Avatar
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);

// Delete Avatar
router.route("/delete-avatar").delete(verifyJWT, deleteAvatar);

// Update Cover Image
router.route("/update-coverImage").patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

// Delete Cover Image
router.route("/delete-coverImage").delete(verifyJWT, deleteCoverImage);

// Privacy Tonggle For Make Public & Private profile 
router.route("/toggle-privacy").patch(verifyJWT, togglePrivacy)

export default router