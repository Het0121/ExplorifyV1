import mongoose, { Schema } from "mongoose";

const ownerSchema = new mongoose.Schema(
    {
        ownerName: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        phoneNo: {
            type: [String],
            required: true,
        },
        gender: {
            type: String,
            enum: ["male", "female", "other"],
            default: "other", // Set a default value
        },
        dob: {
            type: Date,
        },
        avatar: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

export const Owner = mongoose.model("Owner", ownerSchema);