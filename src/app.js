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

//routes declaration
app.use("/api/v1/traveler", travelerRouter)
app.use("/api/v1/agency", agencyRouter)

export { app }