import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema(
    {
        traveler: {
            type: Schema.Types.ObjectId,
            ref: "Traveler",
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
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true
    }
);

// Middleware to update available slots upon booking
bookingSchema.pre("save", async function (next) {
    if (!this.isNew) return next(); // Only execute on new bookings

    const booking = this;
    const Package = mongoose.model("Package");

    try {
        const packageDoc = await Package.findById(booking.package);

        if (!packageDoc) {
            return next(new Error("Package not found"));
        }

        if (packageDoc.availableSlots < booking.slotsBooked) {
            return next(new Error("Not enough available slots"));
        }

        packageDoc.availableSlots -= booking.slotsBooked;
        await packageDoc.save();
        next();
    } catch (err) {
        next(err);
    }
});

// Middleware to restore slots on booking cancellation
bookingSchema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate();
    if (update.status !== "Cancelled") return next();

    try {
        const booking = await this.model.findOne(this.getQuery());
        if (!booking) return next(new Error("Booking not found"));

        const Package = mongoose.model("Package");
        const packageDoc = await Package.findById(booking.package);

        if (!packageDoc) {
            return next(new Error("Package not found"));
        }

        packageDoc.availableSlots += booking.slotsBooked;
        await packageDoc.save();
        next();
    } catch (err) {
        next(err);
    }
});

export const Booking = mongoose.model("Booking", bookingSchema);
