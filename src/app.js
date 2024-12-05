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
import followRoutes from "./routes/follow.routes.js";
import postRoutes from "./routes/post.routes.js";

//routes declaration
app.use("/api/v1/traveler", travelerRouter)
app.use("/api/v1/agency", agencyRouter)
app.use("/api/v1/follow", followRoutes);
app.use("/api/v1/posts", postRoutes);


export { app }

// Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzRlYmIwNTEyYzJlNzdlZTQxYWY2NTAiLCJwaG9uZU5vIjoiNzgwMTk5NzcyOSIsInVzZXJOYW1lIjoicGFyYW1fMjEwNiIsImZ1bGxOYW1lIjoicGFyYW0gcGF0ZWwiLCJpYXQiOjE3MzMzMzQzMDAsImV4cCI6MTczMzQyMDcwMH0.vAQhKRXofbEaeYDye9c7z0Tqn1d7IYc9aDUY_ElZmwo
// user-type: Traveler 