import mongoose, { Schema } from "mongoose";

const followerFollowingSchema = new Schema({
    follower: {
        userType: {
            type: String,
            enum: ['Traveler', 'Agency'],
            required: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            refPath: 'follower.userType'
        }
    },
    following: {
        userType: {
            type: String,
            enum: ['Traveler', 'Agency'],
            required: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            refPath: 'following.userType'
        }
    }
}, { timestamps: true });

export const FollowerFollowing = mongoose.model("FollowerFollowing", followerFollowingSchema);

// Custom validation to prevent users from following themselves
followerFollowingSchema.pre('save', function (next) {
    if (this.follower.userId.equals(this.following.userId)) {
        return next(new Error("User cannot follow themselves"));
    }
    next();
});