import { Router } from 'express';
import {
    requestBooking,
    acceptBookingRequest,
    getBookings,
    getBookingById,
    updateBookingStatus,
    cancelBooking,
} from '../controllers/booking.controller.js';
import { verifyAgencyJWT } from '../middlewares/agencyAuth.middleware.js';

const router = Router();

// Route to request a booking 
router.route('/request').post(requestBooking);

// Route to accept a booking request
router.route('/accept/:notificationId').patch(verifyAgencyJWT, acceptBookingRequest);

// Route to get all bookings 
router.route('/all').get(verifyAgencyJWT, getBookings);

// Route to get a booking by ID 
router.route('/:id').get(verifyAgencyJWT, getBookingById);

// Route to update the booking status
router.route('/status/:id').patch(verifyAgencyJWT, updateBookingStatus);

// Route to cancel a booking
router.route('/cancel/:id').delete(verifyAgencyJWT, cancelBooking);

export default router;
