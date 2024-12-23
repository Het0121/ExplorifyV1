import mongoose, { Schema } from 'mongoose';

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            userType: {
                type: String,
                enum: ['Traveler', 'Agency'],
                required: true,
            },
            userId: {
                type: Schema.Types.ObjectId,
                refPath: 'recipient.userType',
                required: true,
            },
        },
        sender: {
            userType: {
                type: String,
                enum: ['Traveler', 'Agency'],
                required: true,
            },
            userId: {
                type: Schema.Types.ObjectId,
                refPath: 'sender.userType',
                required: true,
            },
        },
        type: {
            type: String,
            enum: ['LIKE', 'COMMENT', 'FOLLOW', 'TWEET', 'BOOKING', 'NEW_PACKAGE'],
            required: true,
        },
        relatedEntity: {
            type: Schema.Types.ObjectId,
            refPath: 'relatedEntityType',
            required: true
        },
        relatedEntityType: {
            type: String,
            enum: ['Post', 'Comment', 'Tweet', 'Package'],
        },
        message: {
            type: String,
            required: true, // The message is required to describe the notification
        },
        isRead: {
            type: Boolean,
            default: false, // Notification is unread by default
        },
    },
    {
        timestamps: true, // Automatically adds `createdAt` and `updatedAt`
        versionKey: false, // Optionally disable the versioning field (_v)
    }
);

export const Notification = mongoose.model('Notification', notificationSchema);