import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { Traveler } from "../models/traveler.model.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// Generate Access And Refresh Token
const generateAccessAndRefreshTokens = async (travelerId) => {
  try {
    const traveler = await Traveler.findById(travelerId)
    const accessToken = traveler.generateAccessToken()
    const refreshToken = traveler.generateRefreshToken()

    traveler.refreshToken = refreshToken
    await traveler.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }


  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access token")
  }
}


// Register Traveler
const registerTraveler = asyncHandler(async (req, res) => {

  const { fullName, userName, email, phoneNo, password } = req.body
  // console.log(fullName, userName, phoneNo, password);

  if (
    [fullName, userName, email, phoneNo, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required")
  }

  const existedTraveler = await Traveler.findOne({
    $or: [{ userName }, { phoneNo }, { email }]
  })

  if (existedTraveler) {
    throw new ApiError(409, "Traveler with Phone No or username already exists")
  }


  const traveler = await Traveler.create({
    fullName,
    email: email.toLowerCase(),
    userName: userName.toLowerCase(),
    phoneNo,
    password
  })

  const createdTraveler = await Traveler.findById(traveler._id).select(
    "-password -refreshToken"
  )

  if (!createdTraveler) {
    throw new ApiError(500, "Something went wrong while registering the Traveler")
  }

  return res.status(201).json(
    new ApiResponse(200, createdTraveler, "Traveler registered Successfully")
  )

})


// Login Traveler
const loginTraveler = asyncHandler(async (req, res) => {

  const { userName, phoneNo, password } = req.body
  // console.log(userName, phoneNo, password);

  if (!userName && !phoneNo) {
    throw new ApiError(400, "username or phone No is required")
  }


  const traveler = await Traveler.findOne({
    $or: [{ userName }, { phoneNo }]
  })

  if (!traveler) {
    throw new ApiError(404, "Traveler does not exist")
  }

  const isPasswordValid = await traveler.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Traveler Password")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(traveler._id)

  const loggedInTraveler = await Traveler.findById(traveler._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          traveler: loggedInTraveler, accessToken, refreshToken
        },
        "Traveler logged In Successfully"
      )
    )
})


// Logout Traveler
const logoutTraveler = asyncHandler(async (req, res) => {
  await Traveler.findByIdAndUpdate(
    req.traveler._id,
    {
      $unset: {
        refreshToken: 1 // this removes the field from document
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Traveler logged Out"))
})


// Refresh Access Token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )

    const traveler = await Traveler.findById(decodedToken?._id)

    if (!traveler) {
      throw new ApiError(401, "Invalid refresh token")
    }

    if (incomingRefreshToken !== traveler?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used")

    }

    const options = {
      httpOnly: true,
      secure: true
    }

    const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(traveler._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})


// Change Traveler Password
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body



  const traveler = await Traveler.findById(req.traveler?._id)
  const isPasswordCorrect = await traveler.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password")
  }

  traveler.password = newPassword
  await traveler.save({ validateBeforeSave: false })

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})


// Get Traveler Profile
const curruntTravelerProfile = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(
      200,
      req.traveler,
      "Traveler fetched successfully"
    ))
})


// Update Traveler Profile Details
const updateProfileDetails = asyncHandler(async (req, res) => {
  const { fullName, userName, email, phoneNo, dob, gender, city, state, bio, website } = req.body;

  // Collect only fields that are provided and have changes
  const updateData = {};

  if (fullName) updateData.fullName = fullName;
  if (userName) updateData.userName = userName;
  if (phoneNo) updateData.phoneNo = phoneNo;
  if (email) {
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "Invalid email format");
    }
    updateData.email = email;
  }
  if (bio) updateData.bio = bio;
  if (city) updateData.city = city;
  if (state) updateData.state = state;
  if (website) updateData.website = website;
  if (dob) updateData.dob = dob;
  if (gender) updateData.gender = gender;

  // Check if there are any fields to update
  if (Object.keys(updateData).length === 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "No updates provided"));
  }

  // Check for duplicate phoneNo or email among other travelers
  if (updateData.phoneNo || updateData.email) {
    const existingTraveler = await Traveler.findOne({
      $or: [
        { phoneNo: updateData.phoneNo },
        { email: updateData.email },
      ],
      _id: { $ne: req.traveler._id }, // Exclude the current traveler
    });

    if (existingTraveler) {
      throw new ApiError(
        409,
        "Phone number or email already in use by another traveler"
      );
    }
  }

  // Update traveler details
  const traveler = await Traveler.findByIdAndUpdate(
    req.traveler?._id,
    {
      $set: updateData
    },
    { new: true, runValidators: true } // schema validation
  ).select("-password -refreshToken");

  if (!traveler) {
    throw new ApiError(404, "Traveler not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, traveler, "Profile updated successfully"));
});


// Upload & Update Avatar
const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // Fetch traveler data
  const traveler = await Traveler.findById(req.traveler?._id);

  // Check if traveler has an existing avatar
  if (traveler?.avatar) {
    // Delete the old avatar from Cloudinary
    const publicId = traveler.avatar.split("/").pop().split(".")[0]; // Extract public ID from URL
    await deleteFromCloudinary(publicId); // Delete the old avatar
  }

  // Upload the new avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar?.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  // Update the traveler avatar URL in the database
  const updatedTraveler = await Traveler.findByIdAndUpdate(
    req.traveler?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTraveler, "Avatar updated successfully"));
});


// Delete Avatar
const deleteAvatar = asyncHandler(async (req, res) => {
  // Fetch the traveler data
  const traveler = await Traveler.findById(req.traveler?._id);

  if (!traveler || !traveler.avatar) {
    throw new ApiError(404, "No cover image to delete");
  }

  try {
    // Extract Cloudinary public ID from the URL (improved extraction)
    const avatarUrl = traveler.avatar;
    const parts = avatarUrl.split('/');

    if (parts.length < 8) {
      throw new ApiError(400, "Invalid avatar URL format");
    }

    const publicId = parts[7].split('.')[0]; // Extract the public ID (this works for Cloudinary URLs)

    // Delete the avatar from Cloudinary
    const result = await deleteFromCloudinary(publicId);

    // Check if deletion was successful
    if (!result || result.result !== 'ok') {
      throw new ApiError(400, "Error while deleting Avatar from Cloudinary");
    }

    // Set the avatar field to an empty string
    traveler.avatar = "";
    await traveler.save();

    return res
      .status(200)
      .json(new ApiResponse(200, traveler, "Avatar deleted successfully"));
  } catch (error) {
    console.error("Error deleting avatar:", error);  // Log the error for debugging
    throw new ApiError(400, "Error while deleting Avatar from Cloudinary");
  }
});


// Update Cover Image
const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  // Fetch traveler data
  const traveler = await Traveler.findById(req.traveler?._id);

  // Check if traveler has an existing cover image
  if (traveler?.coverImage) {
    // Delete the old cover image from Cloudinary
    const publicId = traveler.coverImage.split("/").pop().split(".")[0]; // Extract public ID from URL
    await deleteFromCloudinary(publicId); // Delete the old cover image
  }

  // Upload the new cover image
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage?.url) {
    throw new ApiError(400, "Error while uploading cover image");
  }

  // Update the traveler cover image URL in the database
  const updatedTraveler = await Traveler.findByIdAndUpdate(
    req.traveler?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTraveler, "Cover image updated successfully"));
});


// Delete Cover Image
const deleteCoverImage = asyncHandler(async (req, res) => {
  // Fetch the traveler data
  const traveler = await Traveler.findById(req.traveler?._id);

  if (!traveler || !traveler.coverImage) {
    throw new ApiError(404, "No cover image to delete");
  }

  try {
    // Extract Cloudinary public ID from the URL (improved extraction)
    const coverImageUrl = traveler.coverImage;
    const parts = coverImageUrl.split('/');

    if (parts.length < 8) {
      throw new ApiError(400, "Invalid avatar URL format");
    }

    const publicId = parts[7].split('.')[0]; // Extract the public ID (this works for Cloudinary URLs)

    // Delete the avatar from Cloudinary
    const result = await deleteFromCloudinary(publicId);

    // Check if deletion was successful
    if (!result || result.result !== 'ok') {
      throw new ApiError(400, "Error while deleting Avatar from Cloudinary");
    }

    // Set the avatar field to an empty string
    traveler.coverImage = "";
    await traveler.save();

    return res
      .status(200)
      .json(new ApiResponse(200, traveler, "Avatar deleted successfully"));
  } catch (error) {
    console.error("Error deleting avatar:", error);  // Log the error for debugging
    throw new ApiError(400, "Error while deleting Avatar from Cloudinary");
  }
});


// Toggle Privacy for Traveler
const togglePrivacy = asyncHandler(async (req, res) => {
  const traveler = await Traveler.findById(req.traveler?._id);

  if (!traveler) {
    throw new ApiError(404, "Traveler not found");
  }

  // Toggle the `private` field
  traveler.private = !traveler.private;
  await traveler.save();

  const message = traveler.private
    ? "Profile is now private"
    : "Profile is now public";

  return res
    .status(200)
    .json(new ApiResponse(200, { private: traveler.private }, message));
});


export {

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

}
