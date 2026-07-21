const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { createPatient, getPatients, getPatient } = require("../controllers/patientController");

router.use(protect);
router.post("/", createPatient);
router.get("/", getPatients);
router.get("/:id", getPatient);

module.exports = router;



