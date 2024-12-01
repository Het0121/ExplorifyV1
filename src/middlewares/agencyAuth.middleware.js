import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { Agency } from "../models/agency.model.js";

export const verifyAgencyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Check if the user is an Agency
        if (decodedToken.userType !== "Agency") {
            throw new ApiError(401, "Invalid Access Token for Agency");
        }

        const agency = await Agency.findById(decodedToken?._id).select("-password -refreshToken");

        if (!agency) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.agency = agency;  // Attach the agency to the request object
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});
