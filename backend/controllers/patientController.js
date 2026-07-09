// backend/controllers/patientController.js

const Patient = require("../models/patientModel");

// ═══════════════════════════════════════════════
// POST /api/patients  — Register new patient
// ═══════════════════════════════════════════════
exports.createPatient = async (req, res) => {
  try {
    const { designation, firstName, lastName, gender, age, ageType,
      phone, email, address, referringDoctor, referringDoctorId, ownerName } = req.body;

    const errors = {};
    if (!firstName?.trim()) errors.firstName = "First name is required.";
    if (!gender) errors.gender = "Gender is required.";
    if (!age || isNaN(age) || age < 0) errors.age = "Valid age is required.";

    if (Object.keys(errors).length > 0)
      return res.status(422).json({ message: "Validation failed.", errors });

    const patient = await Patient.create({
      vendorId: req.user.vendorId,
      designation: designation || "MR.",
      firstName: firstName.trim(),
      lastName: lastName?.trim() || "",
      gender,
      age: Number(age),
      ageType: ageType || "year",
      phone: phone?.trim() || "",
      email: email?.trim() || "",
      address: address?.trim() || "",
      referringDoctor: referringDoctor?.trim() || "",
      referringDoctorId: referringDoctorId
    });

    return res.status(201).json({ message: "Patient registered.", patient });
  } catch (err) {
    console.error("createPatient error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ═══════════════════════════════════════════════
// GET /api/patients  — Search patients for this vendor
// ═══════════════════════════════════════════════
exports.getPatients = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const filter = { vendorId: req.user.vendorId };

    if (q) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [
        { patientId: regex },
        { firstName: regex },
        { lastName: regex },
        { phone: regex },
      ];
    }

    const patients = await Patient.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Patient.countDocuments(filter);

    return res.status(200).json({ patients, total, page: Number(page) });
  } catch (err) {
    console.error("getPatients error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// ═══════════════════════════════════════════════
// GET /api/patients/:id  — Single patient
// ═══════════════════════════════════════════════
exports.getPatient = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      _id: req.params.id,
      vendorId: req.user.vendorId,
    });
    if (!patient) return res.status(404).json({ message: "Patient not found." });
    return res.status(200).json({ patient });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
};