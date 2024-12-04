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
  togglePrivacy,
  getUserProfile

} from "../controllers/traveler.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()

// Register Traveler
// http://localhost:8000/api/v1/traveler/register
router.route("/register").post(registerTraveler)

// Login Traveler
// http://localhost:8000/api/v1/traveler/login
router.route("/login").post(loginTraveler)

// Logout Traveler
// http://localhost:8000/api/v1/traveler/logout
// headers : Authorization bearer <access token>
// content-type : application/json
router.route("/logout").post(verifyJWT, logoutTraveler)

// Refresh Token API
// http://localhost:8000/api/v1/traveler/refreshToken
router.route("/refreshToken").post(refreshAccessToken)

// Get Traveler Profile
// http://localhost:8000/api/v1/traveler/currentTraveler
// headers : Authorization bearer <access token>
// content-type : application/json
router.route("/currentTraveler").get(verifyJWT, curruntTravelerProfile)

// Update Traveler Profile
// http://localhost:8000/api/v1/traveler/updateProfile
// headers : Authorization bearer <access token>
// content-type : application/json
router.route("/updateProfile").patch(verifyJWT, updateProfileDetails)

// Change Password
// http://localhost:8000/api/v1/traveler/changePassword
// headers : Authorization bearer <access token>
// content-type : application/json
router.route("/changePassword").post(verifyJWT, changePassword)

// Update Avatar
// http://localhost:8000/api/v1/traveler/updateAvatar
// headers : Authorization bearer <access token>
// content-type : application/json
// req.body : form data not raw
router.route("/updateAvatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);

// Delete Avatar
// http://localhost:8000/api/v1/traveler/deleteAvatar
// headers : Authorization bearer <access token>
// content-type : application/json
router.route("/deleteAvatar").delete(verifyJWT, deleteAvatar);

// Update Cover Image
// http://localhost:8000/api/v1/traveler/updateCoverImage
// headers : Authorization bearer <access token>
// content-type : application/json
// req.body : form data not raw
router.route("/updateCoverImage").patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

// Delete Cover Image
// http://localhost:8000/api/v1/traveler/deleteCoverImage
// headers : Authorization bearer <access token>
// content-type : application/json
router.route("/deleteCoverImage").delete(verifyJWT, deleteCoverImage);

// Privacy Tonggle For Make Public & Private profile 
// http://localhost:8000/api/v1/traveler/toggle-privacy// headers : Authorization bearer <access token>
// content-type : application/json
router.route("/toggle-privacy").patch(verifyJWT, togglePrivacy)

// Get User Profile by Search
// http://localhost:8000/api/v1/traveler/profile/username(like : h_e_t_21)
// headers : Authorization bearer <access token>
// content-type : application/json
router.route("/profile/:userName").get(verifyJWT, getUserProfile);

export default router