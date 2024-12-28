import mongoose from 'mongoose';
import { Booking } from '../models/booking.model.js';
import { Package } from '../models/package.model.js';
import { Notification } from '../models/notification.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

// Create a Booking Request
const requestBooking = async (req, res, next) => {
    try {
        const { traveler, package: packageId, slotsBooked } = req.body;

        // Check for required fields
        if (!traveler || !packageId || !slotsBooked) {
            throw new ApiError(400, "Traveler, package, and slotsBooked are required");
        }

        // Find the package by ID
        const packageDoc = await Package.findById(packageId).populate("agency");

        if (!packageDoc) {
            throw new ApiError(404, "Package not found");
        }

        // Check if the package is active
        if (!packageDoc.isActive) {
            throw new ApiError(400, "This package is no longer active");
        }

        // Check if there are enough available slots
        if (packageDoc.availableSlots < slotsBooked) {
            throw new ApiError(400, "Not enough available slots");
        }

        // Create a notification for the agency
        const notification = await Notification.create({
            recipient: {
                userType: "Agency",
                userId: packageDoc.agency._id,
            },
            sender: {
                userType: "Traveler",
                userId: traveler,
            },
            type: "BOOKING",
            relatedEntity: packageId,
            relatedEntityType: "package",
            message: `${req.user.name} has requested to book ${slotsBooked} slot(s) in your package '${packageDoc.name}'`,
        });

        // Return a response indicating that the request was sent successfully
        res.status(200).json(new ApiResponse(200, notification, "Booking request sent successfully"));
    } catch (error) {
        next(error);
    }
};

// Accept a Booking Request
const acceptBookingRequest = async (req, res, next) => {
    try {
        const { notificationId } = req.params;
        const { slotsBooked } = req.body;

        // Find the notification by ID
        const notification = await Notification.findById(notificationId);

        if (!notification) {
            throw new ApiError(404, "Notification not found");
        }

        // Ensure the notification is a booking request
        if (notification.type !== "BOOKING" || notification.relatedEntityType !== "package") {
            throw new ApiError(400, "Invalid notification type for booking");
        }

        // Find the package that the booking is associated with
        const packageDoc = await Package.findById(notification.relatedEntity);

        if (!packageDoc) {
            throw new ApiError(404, "Package not found");
        }

        // Check if there are enough available slots to accept the booking
        if (packageDoc.availableSlots < slotsBooked) {
            throw new ApiError(400, "Not enough available slots to accept the booking");
        }

        // Deduct slots from the package and save it
        packageDoc.availableSlots -= slotsBooked;
        await packageDoc.save();

        // Create a new booking entry
        const booking = await Booking.create({
            traveler: notification.sender.userId,
            package: packageDoc._id,
            slotsBooked,
        });

        // Mark the notification as read
        notification.isRead = true;
        await notification.save();

        // Return a response indicating the booking was accepted successfully
        res.status(200).json(new ApiResponse(200, booking, "Booking request accepted and slot booked"));
    } catch (error) {
        next(error);
    }
};

// Get All Bookings
const getBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.aggregate([
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
                    from: "travelers",
                    localField: "traveler",
                    foreignField: "_id",
                    as: "travelerDetails",
                },
            },
            { $unwind: "$travelerDetails" },
            { $sort: { createdAt: -1 } },
        ]);

        res.status(200).json(new ApiResponse(200, bookings, "Bookings fetched successfully"));
    } catch (error) {
        next(error);
    }
};

// Get a Booking by ID
const getBookingById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate the booking ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new ApiError(400, "Invalid booking ID");
        }

        const booking = await Booking.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(id) } },
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
                    from: "travelers",
                    localField: "traveler",
                    foreignField: "_id",
                    as: "travelerDetails",
                },
            },
            { $unwind: "$travelerDetails" },
        ]);

        if (!booking.length) {
            throw new ApiError(404, "Booking not found");
        }

        res.status(200).json(new ApiResponse(200, booking[0], "Booking fetched successfully"));
    } catch (error) {
        next(error);
    }
};

// Update Booking Status
const updateBookingStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate booking ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new ApiError(400, "Invalid booking ID");
        }

        // Ensure valid status
        if (!["Pending", "Confirmed", "Cancelled"].includes(status)) {
            throw new ApiError(400, "Invalid status");
        }

        const updatedBooking = await Booking.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true }
        ).populate("traveler package");

        if (!updatedBooking) {
            throw new ApiError(404, "Booking not found");
        }

        res.status(200).json(new ApiResponse(200, updatedBooking, "Booking status updated successfully"));
    } catch (error) {
        next(error);
    }
};

// Cancel a Booking
const cancelBooking = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate booking ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new ApiError(400, "Invalid booking ID");
        }

        const booking = await Booking.findById(id);

        if (!booking) {
            throw new ApiError(404, "Booking not found");
        }

        // If already cancelled, return error
        if (booking.status === "Cancelled") {
            throw new ApiError(400, "Booking is already cancelled");
        }

        booking.status = "Cancelled";
        await booking.save();

        // Restore the available slots in the associated package
        const packageDoc = await Package.findById(booking.package);
        if (packageDoc) {
            packageDoc.availableSlots += booking.slotsBooked;
            await packageDoc.save();
        }

        res.status(200).json(new ApiResponse(200, booking, "Booking cancelled successfully"));
    } catch (error) {
        next(error);
    }
};

export {
    requestBooking,
    acceptBookingRequest,
    getBookings,
    getBookingById,
    updateBookingStatus,
    cancelBooking,
};
