
import { verifyJWT } from "./auth.middleware.js";
import { verifyAgencyJWT } from "./agencyAuth.middleware.js";


export const verifyUser = (req, res, next) => {
    const userType = req.headers["user-type"]; 
    if (userType === "Traveler") {
      return verifyJWT(req, res, next);
    } else if (userType === "Agency") {
      return verifyAgencyJWT(req, res, next);
    }
    return res.status(400).json({ error: "Invalid user type." });
  };