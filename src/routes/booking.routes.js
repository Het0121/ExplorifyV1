import { Router } from "express";
import {

    createBooking,
    handleBookingRequest,
    getBooking,
    getBookings,
    deleteBooking,

} from "../controllers/booking.controller.js";
import { verifyAgencyJWT } from "../middlewares/agencyAuth.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Create a Booking
router.route("/book").post(verifyJWT, createBooking);

// Handle Booking Request (Accept/Reject)
router.route("/:bookingId/action").patch(verifyAgencyJWT, handleBookingRequest);

// Get Booking by ID
router.route("/:bookingId").get(verifyJWT, getBooking);

// Get All Bookings
router.route("/bookings").get(verifyJWT, getBookings);

// Delete a Booking
router.route("/delete/:bookingId").delete(verifyJWT, deleteBooking);

export default router;
