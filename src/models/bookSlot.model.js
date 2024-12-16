import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema(
    {
        traveler: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        package: {
            type: Schema.Types.ObjectId,
            ref: "Package",
            required: true,
        },
        slotsBooked: {
            type: Number,
            required: true,
            min: 1,
        },
        bookingDate: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ["Pending", "Confirmed", "Cancelled"],
            default: "Pending",
        },
    },
    { timestamps: true }
);

// Middleware to update available slots upon booking
bookingSchema.pre("save", async function (next) {
    const booking = this;
    const packageDoc = await mongoose.model("Package").findById(booking.package);

    if (!packageDoc) {
        return next(new Error("Package not found"));
    }

    if (packageDoc.availableSlots < booking.slotsBooked) {
        return next(new Error("Not enough available slots"));
    }

    packageDoc.availableSlots -= booking.slotsBooked;
    await packageDoc.save();
    next();
});

export const Package = mongoose.model("Package", packageSchema);
export const Booking = mongoose.model("Booking", bookingSchema);