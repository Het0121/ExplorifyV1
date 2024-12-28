import mongoose, { isValidObjectId } from "mongoose";
import { Package } from "../models/package.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { Agency } from "../models/agency.model.js";

// Middleware to ensure the requester is an Agency
const ensureAgency = (req, res, next) => {
    if (!req.agency) {
        throw new ApiError(403, "Only agencies are authorized to perform this action");
    }
    next();
};

// Create a new package
const createPackage = async (req, res, next) => {
    try {
        const agencyId = req.agency?._id; // Extract agency ID from the JWT or req object

        if (!isValidObjectId(agencyId)) {
            throw new ApiError(400, "Invalid agency ID.");
        }

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
            isActivated, // Added isActivated in the request body
        } = req.body;

        if (!title || !mainLocation || !fromLocation || !toLocation || !startDate || !endDate || !description || !price || !maxSlots) {
            throw new ApiError(400, "All required fields must be provided.");
        }

        // Ensure dates are valid
        if (new Date(startDate) >= new Date(endDate)) {
            throw new ApiError(400, "End date must be after start date.");
        }

        const photos = req.file ? await uploadOnCloudinary(req.file.path) : [];

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
            itinerary: Array.isArray(itinerary) ? itinerary : [],
            price,
            maxSlots,
            availableSlots: maxSlots,
            photos,
            isActivated: isActivated !== undefined ? isActivated : true, // Default to true if not provided
        });

        await newPackage.save();

        res.status(201).json(new ApiResponse(201, "Package created successfully.", newPackage));
    } catch (error) {
        next(error); // Pass the error to the global error handler
    }
};

// Update an existing package
const updatePackage = async (req, res, next) => {
    try {
        const { packageId } = req.params;
        if (!isValidObjectId(packageId)) {
            throw new ApiError(400, "Invalid package ID.");
        }

        const packageDoc = await Package.findById(packageId);
        if (!packageDoc) {
            throw new ApiError(404, "Package not found.");
        }

        const updateData = { ...req.body };

        // Handle photos update
        if (req.files?.photos) {
            // Delete old photos if they exist
            if (packageDoc.photos.length) {
                await Promise.all(packageDoc.photos.map((photo) => deleteFromCloudinary(photo)));
            }

            // Upload new photos
            updateData.photos = await Promise.all(
                req.files.photos.map((file) => uploadOnCloudinary(file.path, "packages"))
            );
        }

        // Validate dates
        if (updateData.startDate && updateData.endDate && new Date(updateData.startDate) >= new Date(updateData.endDate)) {
            throw new ApiError(400, "End date must be after start date.");
        }

        // If isActivated is provided, update it
        if (updateData.hasOwnProperty('isActivated')) {
            updateData.isActivated = updateData.isActivated === undefined ? true : updateData.isActivated;
        }

        const updatedPackage = await Package.findByIdAndUpdate(packageId, updateData, {
            new: true,
            runValidators: true,
        });

        res.status(200).json(new ApiResponse(200, "Package updated successfully.", updatedPackage));
    } catch (error) {
        next(error);
    }
};

// Delete a package
const deletePackage = async (req, res, next) => {
    try {
        const { packageId } = req.params;
        if (!isValidObjectId(packageId)) {
            throw new ApiError(400, "Invalid package ID.");
        }

        const packageDoc = await Package.findById(packageId);
        if (!packageDoc) {
            throw new ApiError(404, "Package not found.");
        }

        // Delete associated photos from Cloudinary
        if (packageDoc.photos.length) {
            await Promise.all(packageDoc.photos.map((photo) => deleteFromCloudinary(photo)));
        }

        await packageDoc.remove();

        res.status(200).json(new ApiResponse(200, "Package deleted successfully."));
    } catch (error) {
        next(error);
    }
};

// Get a single package by ID
const getPackage = async (req, res, next) => {
    try {
        const { packageId } = req.params;

        // Validate the packageId
        if (!mongoose.Types.ObjectId.isValid(packageId)) {
            throw new ApiError(400, "Invalid package ID.");
        }

        const packageDoc = await Package.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(packageId) } },
            {
                $lookup: {
                    from: "agencies",
                    localField: "agency",
                    foreignField: "_id",
                    as: "agencyDetails",
                },
            },
            { $unwind: "$agencyDetails" },
            // Removed the line that checks "agencyDetails.isActive"
        ]);

        if (!packageDoc.length) {
            throw new ApiError(404, "Package not found.");
        }

        res.status(200).json(new ApiResponse(200, "Package fetched successfully.", packageDoc[0]));
    } catch (error) {
        next(error);
    }
};

// Get all packages with optional filters
const getPackages = async (req, res, next) => {
    try {
        const { agencyId, location, startDate, endDate, minPrice, maxPrice, isActivated } = req.query;

        const matchFilter = {};
        if (agencyId && isValidObjectId(agencyId)) matchFilter.agency = mongoose.Types.ObjectId(agencyId);
        if (location) matchFilter.mainLocation = { $regex: location, $options: "i" };
        if (startDate || endDate) {
            matchFilter.startDate = { ...(startDate && { $gte: new Date(startDate) }) };
            if (endDate) matchFilter.startDate.$lte = new Date(endDate);
        }
        if (minPrice || maxPrice) {
            matchFilter.price = { ...(minPrice && { $gte: Number(minPrice) }), ...(maxPrice && { $lte: Number(maxPrice) }) };
        }
        if (isActivated !== undefined) matchFilter.isActivated = isActivated === "true"; // Filter by activation status

        const packages = await Package.aggregate([
            {
                $lookup: {
                    from: "agencies",
                    localField: "agency",
                    foreignField: "_id",
                    as: "agencyDetails",
                },
            },
            { $unwind: "$agencyDetails" },
            { $match: matchFilter },
            { $sort: { createdAt: -1 } },
        ]);

        res.status(200).json(new ApiResponse(200, "Packages fetched successfully.", packages));
    } catch (error) {
        next(error);
    }
};

// Toggle package activation status
const togglePackageActivation = async (req, res, next) => {
    try {
        const { packageId } = req.params;
        if (!isValidObjectId(packageId)) {
            throw new ApiError(400, "Invalid package ID.");
        }

        const packageDoc = await Package.findById(packageId);
        if (!packageDoc) {
            throw new ApiError(404, "Package not found.");
        }

        // Toggle isActivated field
        packageDoc.isActive = !packageDoc.isActive;
        await packageDoc.save();

        res.status(200).json(new ApiResponse(200, "Package activation status updated.", packageDoc));
    } catch (error) {
        next(error);
    }
};

export {
    ensureAgency,
    createPackage,
    updatePackage,
    deletePackage,
    getPackage,
    getPackages,
    togglePackageActivation,
};
