const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const User = require("../models/userModel");

// ── Allowed text fields a vendor can update ───────────────
const VENDOR_UPDATABLE = [
  "name", "phone", "address", "city", "state", "businessName",
];

const PHONE_RE = /^[+]?[\d\s\-().]{7,20}$/;
const NAME_RE = /^[a-zA-Z\s.'-]{2,60}$/;
const STAFF_NAME_RE = /^[a-zA-Z\s.'-]{2,60}$/;

// ═════════════════════════════════════════════════════════
// GET /api/profile/me
// ═════════════════════════════════════════════════════════
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -__v -rejectionReason"
    );
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.status(200).json({ user: user.toJSON() });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      // If multer saved a file but user not found, delete it
      if (req.file) fs.unlink(req.file.path, () => { });
      return res.status(404).json({ message: "User not found." });
    }

    const body = req.body;
    const updates = {};
    const errors = {};

    // ── Validate and collect text field updates ───────────
    for (const key of VENDOR_UPDATABLE) {
      if (body[key] === undefined) continue;

      const val = String(body[key]).trim();

      switch (key) {
        case "name":
          if (!NAME_RE.test(val))
            errors.name = "Name must be 2–60 alphabetical characters.";
          else
            updates.name = val;
          break;

        case "businessName":
          if (val.length < 2 || val.length > 80)
            errors.businessName = "Business name must be 2–80 characters.";
          else
            updates.businessName = val;
          break;

        case "phone":
          if (val && !PHONE_RE.test(val))
            errors.phone = "Invalid phone number format.";
          else
            updates.phone = val;
          break;

        case "city":
        case "state":
        case "address":
          if (val.length > 120)
            errors[key] = `${key} must be under 120 characters.`;
          else
            updates[key] = val;
          break;

        default:
          break;
      }
    }

    // ── Return validation errors (also delete uploaded file) ─
    if (Object.keys(errors).length > 0) {
      if (req.file) fs.unlink(req.file.path, () => { });
      return res.status(422).json({ message: "Validation failed.", errors });
    }


    // ── Handle logo upload ────────────────────────────────
    if (req.file) {
      const newLogoPath = `logos/${req.file.filename}`;
      // Delete old logo file from disk only if it's a different file
      if (user.logo?.path && user.logo.path !== newLogoPath) {
        const oldPath = path.join(__dirname, "..", "uploads", user.logo.path);
        fs.unlink(oldPath, () => { }); // silent fail if not found
      }

      updates["logo.path"] = newLogoPath;
      updates["logo.originalName"] = req.file.originalname;
      updates["logo.mimeType"] = req.file.mimetype;
    }

    // ── Nothing to update ─────────────────────────────────
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided." });
    }

    // ── Apply and save ────────────────────────────────────
    // Use dot-notation keys for nested logo fields
    for (const [key, val] of Object.entries(updates)) {
      if (key.includes(".")) {
        const [parent, child] = key.split(".");
        user[parent][child] = val;
      } else {
        user[key] = val;
      }
    }
    await user.save();

    // ── Return updated user (no password) ────────────────
    const updated = await User.findById(user._id).select(
      "-password -__v -rejectionReason"
    );

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: updated.toJSON(),
    });
  } catch (err) {
    console.error("updateProfile error:", err);
    if (req.file) fs.unlink(req.file.path, () => { });
    return res.status(500).json({ message: "Server error." });
  }
};

// ═════════════════════════════════════════════════════════
// PUT /api/profile/me/password
// ═════════════════════════════════════════════════════════
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const errors = {};

    if (!currentPassword)
      errors.currentPassword = "Current password is required.";
    if (!newPassword)
      errors.newPassword = "New password is required.";
    else if (newPassword.length < 8)
      errors.newPassword = "New password must be at least 8 characters.";
    else if (!/[A-Z]/.test(newPassword))
      errors.newPassword = "Must contain at least one uppercase letter.";
    else if (!/[0-9]/.test(newPassword))
      errors.newPassword = "Must contain at least one number.";
    if (newPassword !== confirmPassword)
      errors.confirmPassword = "Passwords do not match.";

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ message: "Validation failed.", errors });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found." });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({
        message: "Validation failed.",
        errors: { currentPassword: "Current password is incorrect." },
      });
    }

    const sameAsOld = await bcrypt.compare(newPassword, user.password);
    if (sameAsOld) {
      return res.status(422).json({
        message: "Validation failed.",
        errors: { newPassword: "New password cannot be the same as the current one." },
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};


exports.addStaffMember = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      if (req.file) fs.unlink(req.file.path, () => { });
      return res.status(404).json({ message: "User not found." });
    }

    const { name, degree, role, notes } = req.body;
    const errors = {};

    const trimmedName = String(name || "").trim();
    if (!trimmedName) errors.name = "Name is required.";
    else if (!STAFF_NAME_RE.test(trimmedName))
      errors.name = "Name must be 2–60 alphabetical characters.";

    const staffRole = ["doctor", "technician"].includes(role) ? role : "doctor";

    const trimmedDegree = String(degree || "").trim();
    if (trimmedDegree.length > 100) errors.degree = "Degree must be under 100 characters.";

    const trimmedNotes = String(notes || "").trim();
    if (trimmedNotes.length > 150) errors.notes = "Notes must be under 150 characters.";

    if (Object.keys(errors).length > 0) {
      if (req.file) fs.unlink(req.file.path, () => { });
      return res.status(422).json({ message: "Validation failed.", errors });
    }

    user.staff.push({
      _id: req.staffId,
      name: trimmedName,
      degree: trimmedDegree,
      role: staffRole,
      notes: trimmedNotes,
      signature: req.file
        ? {
          path: `staff-signatures/${req.file.filename}`,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
        }
        : undefined,
    });

    await user.save();

    const updated = await User.findById(user._id).select("-password -__v -rejectionReason");
    return res.status(201).json({ message: "Staff member added.", user: updated.toJSON() });
  } catch (err) {
    console.error("addStaffMember error:", err);
    if (req.file) fs.unlink(req.file.path, () => { });
    return res.status(500).json({ message: "Server error." });
  }
};

// ═════════════════════════════════════════════════════════
// PUT /api/profile/me/staff/:staffId
// ═════════════════════════════════════════════════════════
exports.updateStaffMember = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      if (req.file) fs.unlink(req.file.path, () => { });
      return res.status(404).json({ message: "User not found." });
    }

    const member = user.staff.id(req.params.staffId);
    if (!member) {
      if (req.file) fs.unlink(req.file.path, () => { });
      return res.status(404).json({ message: "Staff member not found." });
    }

    const { name, degree, role, notes } = req.body;
    const errors = {};

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) errors.name = "Name is required.";
      else if (!STAFF_NAME_RE.test(trimmedName))
        errors.name = "Name must be 2–60 alphabetical characters.";
      else member.name = trimmedName;
    }

    if (role !== undefined && ["doctor", "technician"].includes(role)) {
      member.role = role;
    }

    if (degree !== undefined) {
      const trimmedDegree = String(degree).trim();
      if (trimmedDegree.length > 100) errors.degree = "Degree must be under 100 characters.";
      else member.degree = trimmedDegree;
    }

    if (notes !== undefined) {
      const trimmedNotes = String(notes).trim();
      if (trimmedNotes.length > 150) errors.notes = "Notes must be under 150 characters.";
      else member.notes = trimmedNotes;
    }

    if (Object.keys(errors).length > 0) {
      if (req.file) fs.unlink(req.file.path, () => { });
      return res.status(422).json({ message: "Validation failed.", errors });
    }

    // ── Handle signature replacement ───────────────────────
    if (req.file) {
      const newSigPath = `staff-signatures/${req.file.filename}`;
      if (member.signature?.path && member.signature.path !== newSigPath) {
        const oldPath = path.join(__dirname, "..", "uploads", member.signature.path);
        fs.unlink(oldPath, () => { });
      }
      member.signature = {
        path: newSigPath,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      };
    }

    await user.save();

    const updated = await User.findById(user._id).select("-password -__v -rejectionReason");
    return res.status(200).json({ message: "Staff member updated.", user: updated.toJSON() });
  } catch (err) {
    console.error("updateStaffMember error:", err);
    if (req.file) fs.unlink(req.file.path, () => { });
    return res.status(500).json({ message: "Server error." });
  }
};

// ═════════════════════════════════════════════════════════
// DELETE /api/profile/me/staff/:staffId
// ═════════════════════════════════════════════════════════
exports.deleteStaffMember = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const member = user.staff.id(req.params.staffId);
    if (!member) return res.status(404).json({ message: "Staff member not found." });

    if (member.signature?.path) {
      const oldPath = path.join(__dirname, "..", "uploads", member.signature.path);
      fs.unlink(oldPath, () => { });
    }

    member.deleteOne();
    await user.save();

    const updated = await User.findById(user._id).select("-password -__v -rejectionReason");
    return res.status(200).json({ message: "Staff member removed.", user: updated.toJSON() });
  } catch (err) {
    console.error("deleteStaffMember error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};