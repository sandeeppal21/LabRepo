const mongoose = require("mongoose");
const Test = require("../models/testModel");
const VendorTestPrice = require("../models/vendorTestPriceModel");


exports.getAllTests = async (req, res) => {
  try {
    const tests = await Test.find({ isActive: true }).sort({ name: 1 });

    if (req.user.role === "vendor") {
      const vendorId = new mongoose.Types.ObjectId(req.user.id);
      const vendorDoc = await VendorTestPrice.findOne({ vendorId });
      const priceMap = {};
      (vendorDoc?.prices || []).forEach(p => {
        priceMap[p.testId.toString()] = p;
      });

      const testsWithPrice = tests.map(t => ({
        ...t.toObject(),
        vendorPrice: priceMap[t._id.toString()]?.price ?? null,
        vendorIsActive: priceMap[t._id.toString()]?.isActive ?? false,
        priceSet: !!priceMap[t._id.toString()],
      }));

      return res.status(200).json({ tests: testsWithPrice });
    }

    return res.status(200).json({ tests });
  } catch (err) {
    console.error("getAllTests error:", err);
    res.status(500).json({ message: "Server error." });
  }
};


exports.createTest = async (req, res) => {
  try {
    const { name, code, department, sampleType, tat, description } = req.body;
    const errors = {};

    if (!name?.trim()) errors.name = "Test name is required.";
    if (!code?.trim()) errors.code = "Test code is required.";
    if (!department?.trim()) errors.department = "Department is required.";

    if (Object.keys(errors).length > 0)
      return res.status(422).json({ message: "Validation failed.", errors });

    const exists = await Test.findOne({ code: code.trim().toUpperCase() });
    if (exists)
      return res.status(409).json({
        message: "Validation failed.",
        errors: { code: "A test with this code already exists." },
      });

    const test = await Test.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      department: department.trim(),
      sampleType: sampleType?.trim() || "",
      tat: tat?.trim() || "",
      description: description?.trim() || "",
      createdBy: req.user.id,
      createdByRole: req.user.role,
    });

    return res.status(201).json({ message: "Test added to library.", test });
  } catch (err) {
    console.error("createTest error:", err);
    res.status(500).json({ message: "Server error." });
  }
};


exports.setVendorPrice = async (req, res) => {
  try {
    if (req.user.role !== "vendor")
      return res.status(403).json({ message: "Only vendors can set prices." });

    const { price } = req.body;

    if (price === undefined || price === null || isNaN(price) || Number(price) < 0)
      return res.status(422).json({
        message: "Validation failed.",
        errors: { price: "Valid price is required." },
      });

    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found." });

    const vendorId = new mongoose.Types.ObjectId(req.user.id);
    const vendorDoc = await VendorTestPrice.findOne({ vendorId });

    if (vendorDoc) {
      const existingPrice = vendorDoc.prices.find(
        p => p.testId.toString() === req.params.id
      );

      if (existingPrice) {
        await VendorTestPrice.findOneAndUpdate(
          { vendorId, "prices.testId": req.params.id },
          { $set: { "prices.$.price": Number(price), "prices.$.isActive": true } },
          { new: true }
        );
      } else {
        await VendorTestPrice.findOneAndUpdate(
          { vendorId },
          { $push: { prices: { testId: req.params.id, price: Number(price), isActive: true } } },
          { new: true }
        );
      }
    } else {
      await VendorTestPrice.create({
        vendorId,
        prices: [{ testId: req.params.id, price: Number(price), isActive: true }],
      });
    }

    return res.status(200).json({ message: "Price set successfully." });
  } catch (err) {
    console.error("setVendorPrice error:", err);
    res.status(500).json({ message: "Server error." });
  }
};


exports.toggleVendorTest = async (req, res) => {
  try {
    if (req.user.role !== "vendor")
      return res.status(403).json({ message: "Only vendors can toggle tests." });

    const vendorId = new mongoose.Types.ObjectId(req.user.id);
    const vendorDoc = await VendorTestPrice.findOne({ vendorId });
    const priceEntry = vendorDoc?.prices.find(
      p => p.testId.toString() === req.params.id
    );

    if (!priceEntry)
      return res.status(404).json({ message: "Set a price for this test first." });

    const newStatus = !priceEntry.isActive;

    await VendorTestPrice.findOneAndUpdate(
      { vendorId, "prices.testId": req.params.id },
      { $set: { "prices.$.isActive": newStatus } }
    );

    return res.status(200).json({
      message: `Test ${newStatus ? "enabled" : "disabled"}.`,
      isActive: newStatus,
    });
  } catch (err) {
    console.error("toggleVendorTest error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

exports.updateTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found." });

    const isAdmin = req.user.role === "admin";
    const isCreator = test.createdBy.toString() === req.user.id;

    if (!isAdmin && !isCreator)
      return res.status(403).json({ message: "Only the test creator or admin can edit this test." });

    const { name, code, department, sampleType, tat,
      description, gender, parameters, interpretation } = req.body;

    if (name) test.name = name.trim();
    if (department) test.department = department.trim();
    if (sampleType != null) test.sampleType = sampleType.trim();
    if (tat != null) test.tat = tat.trim();
    if (description != null) test.description = description.trim();
    if (gender) test.gender = gender;
    if (interpretation != null) test.interpretation = interpretation.trim();

    if (code && code.toUpperCase() !== test.code) {
      const exists = await Test.findOne({ code: code.toUpperCase(), _id: { $ne: test._id } });
      if (exists)
        return res.status(409).json({
          message: "Validation failed.",
          errors: { code: "Code already in use." },
        });
      test.code = code.toUpperCase();
    }

    if (Array.isArray(parameters)) {
      test.parameters = parameters.map((p, i) => ({ ...p, order: i }));
    }

    await test.save();
    return res.status(200).json({ message: "Test updated.", test });
  } catch (err) {
    console.error("updateTest error:", err);
    res.status(500).json({ message: "Server error." });
  }
};


exports.deleteTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found." });

    const isAdmin = req.user.role === "admin";
    const isCreator = test.createdBy.toString() === req.user.id;

    if (!isAdmin && !isCreator)
      return res.status(403).json({ message: "Only the test creator or admin can delete this test." });

    await Test.findByIdAndDelete(req.params.id);

    await VendorTestPrice.updateMany(
      {},
      { $pull: { prices: { testId: req.params.id } } }
    );

    return res.status(200).json({ message: "Test deleted from library." });
  } catch (err) {
    console.error("deleteTest error:", err);
    res.status(500).json({ message: "Server error." });
  }
};