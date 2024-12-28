import mongoose, { isValidObjectId } from "mongoose";
import { Package } from "../models/package.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { Agency } from "../models/agency.model.js"; // Import the Agency model


// Middleware to check if the agency is active
const checkAgencyActiveStatus = asyncHandler(async (agencyId) => {
    const agency = await Agency.findById(agencyId);
    if (!agency || !agency.isActive) {
        throw new ApiError(403, "The agency is deactivated. Operation not allowed.");
    }
});


// Create a new package
const createPackage = asyncHandler(async (req, res, next) => {
    const { agencyId } = req.user; // Agency ID from JWT

    if (!isValidObjectId(agencyId)) {
        return next(new ApiError(400, "Invalid agency ID."));
    }

    await checkAgencyActiveStatus(agencyId);

    const {
        title,
        mainLocation,
        fromLocation,
        toLocation,
        startDate,
        endDate,
        description,
        servicesAndFacilities,
        activities,
        itinerary,
        price,
        maxSlots,
    } = req.body;

    if (!title || !mainLocation || !fromLocation || !toLocation || !startDate || !endDate || !description || !price || !maxSlots) {
        return next(new ApiError(400, "All required fields must be provided."));
    }

    let photos = [];
    if (req.files && req.files.photos) {
        photos = await Promise.all(
            req.files.photos.map((file) => uploadOnCloudinary(file.path, "packages"))
        );
    }

    const newPackage = new Package({
        title,
        agency: agencyId,
        mainLocation,
        fromLocation,
        toLocation,
        startDate,
        endDate,
        description,
        servicesAndFacilities,
        activities,
        itinerary,
        price,
        maxSlots,
        availableSlots: maxSlots,
        photos,
    });

    await newPackage.save();

    res.status(201).json(new ApiResponse(201, "Package created successfully.", newPackage));
});


// Update an existing package
const updatePackage = asyncHandler(async (req, res, next) => {
    const { packageId } = req.params;
    if (!isValidObjectId(packageId)) {
        return next(new ApiError(400, "Invalid package ID."));
    }

    const packageDoc = await Package.findById(packageId);
    if (!packageDoc) {
        return next(new ApiError(404, "Package not found."));
    }

    await checkAgencyActiveStatus(packageDoc.agency);

    const updateData = { ...req.body };

    if (req.files && req.files.photos) {
        if (packageDoc.photos.length) {
            await Promise.all(packageDoc.photos.map((photo) => deleteFromCloudinary(photo)));
        }

        updateData.photos = await Promise.all(
            req.files.photos.map((file) => uploadOnCloudinary(file.path, "packages"))
        );
    }

    const updatedPackage = await Package.findByIdAndUpdate(packageId, updateData, {
        new: true,
        runValidators: true,
    });

    res.status(200).json(new ApiResponse(200, "Package updated successfully.", updatedPackage));
});


// Delete a package
const deletePackage = asyncHandler(async (req, res, next) => {
    const { packageId } = req.params;
    if (!isValidObjectId(packageId)) {
        return next(new ApiError(400, "Invalid package ID."));
    }

    const packageDoc = await Package.findById(packageId);
    if (!packageDoc) {
        return next(new ApiError(404, "Package not found."));
    }

    if (packageDoc.photos.length) {
        await Promise.all(packageDoc.photos.map((photo) => deleteFromCloudinary(photo)));
    }

    await packageDoc.remove();
    res.status(200).json(new ApiResponse(200, "Package deleted successfully."));
});


// Get a single package by ID with aggregation
const getPackage = asyncHandler(async (req, res, next) => {
    const { packageId } = req.params;
    if (!isValidObjectId(packageId)) {
        return next(new ApiError(400, "Invalid package ID."));
    }

    const packageDoc = await Package.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(packageId) } },
        {
            $lookup: {
                from: "agencies", // Collection name for agencies
                localField: "agency",
                foreignField: "_id",
                as: "agencyDetails",
            },
        },
        { $unwind: "$agencyDetails" },
        { $match: { "agencyDetails.isActive": true } }, // Ensure the agency is active
    ]);

    if (!packageDoc.length) {
        return next(new ApiError(404, "Package not found or agency is inactive."));
    }

    res.status(200).json(new ApiResponse(200, "Package fetched successfully.", packageDoc[0]));
});


// Get all packages with optional filters and aggregation
const getPackages = asyncHandler(async (req, res, next) => {
    const { agencyId, location, startDate, endDate, minPrice, maxPrice } = req.query;

    const matchFilter = { "agencyDetails.isActive": true };
    if (agencyId && isValidObjectId(agencyId)) matchFilter.agency = mongoose.Types.ObjectId(agencyId);
    if (location) matchFilter.mainLocation = { $regex: location, $options: "i" };
    if (startDate || endDate) {
        matchFilter.startDate = { ...(startDate && { $gte: new Date(startDate) }) };
        if (endDate) matchFilter.startDate.$lte = new Date(endDate);
    }
    if (minPrice || maxPrice) {
        matchFilter.price = { ...(minPrice && { $gte: Number(minPrice) }), ...(maxPrice && { $lte: Number(maxPrice) }) };
    }

    const packages = await Package.aggregate([
        {
            $lookup: {
                from: "agencies", // Collection name for agencies
                localField: "agency",
                foreignField: "_id",
                as: "agencyDetails",
            },
        },
        { $unwind: "$agencyDetails" },
        { $match: matchFilter },
        { $sort: { createdAt: -1 } }, // Sort by newest packages
    ]);

    res.status(200).json(new ApiResponse(200, "Packages fetched successfully.", packages));
});

export {
    createPackage,
    updatePackage,
    deletePackage,
    getPackage,
    getPackages
};
