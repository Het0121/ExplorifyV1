import mongoose, { Schema } from "mongoose";

const packageSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        agency: {
            type: Schema.Types.ObjectId,
            ref: "Agency",
            required: true,
        },
        mainLocation: {
            type: String,
            required: true,
        },
        fromLocation: {
            type: String,
            required: true,
        },
        toLocation: {
            type: String,
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        servicesAndFacilities: {
            type: [String],
            default: [],
        },
        activities: {
            type: [String],
            default: [],
        },
        itinerary: [
            {
                day: {
                    type: String,
                    required: true
                },
                description: {
                    type: String,
                    required: true
                },
            },
        ],
        photos: {
            type: [String],
            validate: [arrayLimit, "{PATH} exceeds the limit of 4"],
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        maxSlots: {
            type: Number,
            required: true,
        },
        availableSlots: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);

// Helper function to validate photo array limit
function arrayLimit(val) {
    return val.length <= 4;
}

// Middleware to ensure `availableSlots` does not exceed `maxSlots`
packageSchema.pre("save", function (next) {
    if (this.availableSlots > this.maxSlots) {
        this.availableSlots = this.maxSlots;
    }
    next();
});

export const Package = mongoose.model("Package", packageSchema);