import express from 'express';
import {
    requestBooking,
    acceptBookingRequest,
    getBookings,
    getBookingById,
    updateBookingStatus,
    cancelBooking
} from '../controllers/booking.controller.js';
import { ensureAgency } from '../controllers/package.controller.js'; 
import { verifyJWT } from '../middlewares/auth.middleware.js'; 

const router = express.Router();

// Route for creating a booking request (Traveler)
router.post('/request', verifyJWT, requestBooking);

// Route for accepting a booking request (Agency/Administrator)
router.patch('/accept/:bookingId', ensureAgency, acceptBookingRequest);

// Route for getting all bookings (Admin or Agency)
router.get('/', ensureAgency, getBookings);

// Route for getting a specific booking by ID (Admin, Agency or Traveler)
router.get('/:bookingId', ensureAgency, getBookingById);

// Route for updating the booking status (Admin or Agency)
router.patch('/:bookingId/status', ensureAgency, updateBookingStatus);

// Route for canceling a booking (Traveler or Admin)
router.delete('/:bookingId', verifyJWT, cancelBooking);

export default router;
