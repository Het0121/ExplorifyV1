import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

//routes import
import travelerRouter from './routes/traveler.routes.js';
import agencyRouter from './routes/agency.routes.js';
import followRouter from "./routes/follow.routes.js";
import postRouter from "./routes/post.routes.js";
import ownerRouter from "./routes/owner.routes.js";
import tweetRoutes from "./routes/tweet.routes.js";
import likeRoutes from "./routes/like.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

//routes declaration
app.use("/api/v1/traveler", travelerRouter);
app.use("/api/v1/agency", agencyRouter);
app.use("/api/v1/follow", followRouter);
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/agency/owner", ownerRouter);
app.use("/api/v1/tweets", tweetRoutes);
app.use("/api/v1/likes", likeRoutes);
app.use("/api/v1/comment", commentRoutes);
app.use("/api/v1/notifications", notificationRoutes);

export { app }