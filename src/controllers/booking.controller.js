import mongoose, { isValidObjectId } from "mongoose";
import { Booking } from "../models/booking.model.js";
import { Package } from "../models/package.model.js";
import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Create a Booking
const createBooking = async (req, res, next) => {
    try {
        const { travelerId, packageId, slotsBooked } = req.body;

        if (!isValidObjectId(travelerId) || !isValidObjectId(packageId)) {
            throw new ApiError(400, "Invalid traveler or package ID.");
        }

        const packageDoc = await Package.findById(packageId);
        if (!packageDoc) {
            throw new ApiError(404, "Package not found.");
        }

        if (packageDoc.availableSlots < slotsBooked) {
            throw new ApiError(400, "Not enough available slots.");
        }

        const newBooking = new Booking({
            traveler: travelerId,
            package: packageId,
            slotsBooked,
            status: "Pending",
        });
        await newBooking.save();

        await Notification.create({
            recipient: { userType: "Agency", userId: packageDoc.agency },
            sender: { userType: "Traveler", userId: travelerId },
            type: "BOOKING_REQUEST",
            relatedEntity: newBooking._id,
            relatedEntityType: "booking",
            message: `Traveler requested ${slotsBooked} slot(s) for package: ${packageDoc.title}.`,
        });

        res.status(201).json(new ApiResponse(201, "Booking request sent successfully.", newBooking));
    } catch (error) {
        next(error);
    }
};

// Handle Booking Request (Accept/Reject)
const handleBookingRequest = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const { action } = req.body; // Accept or Reject

        if (!isValidObjectId(bookingId)) {
            throw new ApiError(400, "Invalid booking ID.");
        }

        const booking = await Booking.findById(bookingId).populate("package");
        if (!booking) {
            throw new ApiError(404, "Booking not found.");
        }

        const packageDoc = booking.package;
        if (!packageDoc.agency.equals(req.agency._id)) {
            throw new ApiError(403, "You are not authorized to handle this booking.");
        }

        if (action === "accept") {
            if (packageDoc.availableSlots < booking.slotsBooked) {
                throw new ApiError(400, "Not enough available slots.");
            }

            // Deduct available slots on acceptance
            packageDoc.availableSlots -= booking.slotsBooked;
            booking.status = "Confirmed";
            await packageDoc.save();
        } else if (action === "reject") {
            // If booking was previously confirmed, restore the available slots
            if (booking.status === "Confirmed") {
                packageDoc.availableSlots += booking.slotsBooked;
                await packageDoc.save();
            }

            booking.status = "Cancelled";
        } else {
            throw new ApiError(400, "Invalid action. Use 'accept' or 'reject'.");
        }

        await booking.save();

        // Notify traveler
        await Notification.create({
            recipient: { userType: "Traveler", userId: booking.traveler },
            sender: { userType: "Agency", userId: req.agency._id },
            type: action === "accept" ? "BOOKING_CONFIRMED" : "BOOKING_REJECTED",
            relatedEntity: booking._id,
            relatedEntityType: "booking",
            message: `Your booking for package: ${packageDoc.title} has been ${action}ed.`,
        });

        res.status(200).json(new ApiResponse(200, `Booking ${action}ed successfully.`, booking));
    } catch (error) {
        next(error);
    }
};


// Get Booking by ID
const getBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;

        if (!isValidObjectId(bookingId)) {
            throw new ApiError(400, "Invalid booking ID.");
        }

        const booking = await Booking.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(bookingId) } },
            {
                $lookup: {
                    from: "packages",
                    localField: "package",
                    foreignField: "_id",
                    as: "packageDetails",
                },
            },
            { $unwind: "$packageDetails" },
            {
                $lookup: {
                    from: "users",
                    localField: "traveler",
                    foreignField: "_id",
                    as: "travelerDetails",
                },
            },
            { $unwind: "$travelerDetails" },
        ]);

        if (!booking.length) {
            throw new ApiError(404, "Booking not found.");
        }

        res.status(200).json(new ApiResponse(200, "Booking fetched successfully.", booking[0]));
    } catch (error) {
        next(error);
    }
};

// Get All Bookings
const getBookings = async (req, res, next) => {
    try {
        const { travelerId, packageId, status } = req.query;

        const matchFilter = {};
        if (travelerId && isValidObjectId(travelerId)) matchFilter.traveler = new mongoose.Types.ObjectId(travelerId);
        if (packageId && isValidObjectId(packageId)) matchFilter.package = new mongoose.Types.ObjectId(packageId);
        if (status) matchFilter.status = status;

        const bookings = await Booking.aggregate([
            { $match: matchFilter },
            {
                $lookup: {
                    from: "packages",
                    localField: "package",
                    foreignField: "_id",
                    as: "packageDetails",
                },
            },
            { $unwind: "$packageDetails" },
            {
                $lookup: {
                    from: "users",
                    localField: "traveler",
                    foreignField: "_id",
                    as: "travelerDetails",
                },
            },
            { $unwind: "$travelerDetails" },
        ]);

        res.status(200).json(new ApiResponse(200, "Bookings fetched successfully.", bookings));
    } catch (error) {
        next(error);
    }
};

// Delete a Booking
const deleteBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;

        if (!isValidObjectId(bookingId)) {
            throw new ApiError(400, "Invalid booking ID.");
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            throw new ApiError(404, "Booking not found.");
        }

        if (booking.status === "Confirmed") {
            const packageDoc = await Package.findById(booking.package);
            if (packageDoc) {
                packageDoc.availableSlots += booking.slotsBooked;
                await packageDoc.save();
            }
        }

        await booking.remove();

        res.status(200).json(new ApiResponse(200, "Booking deleted successfully."));
    } catch (error) {
        next(error);
    }
};

export {
    createBooking,
    handleBookingRequest,
    getBooking,
    getBookings,
    deleteBooking,
};
