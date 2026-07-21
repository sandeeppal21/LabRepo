const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  getAllTests, createTest,
  setVendorPrice, toggleVendorTest, deleteTest, updateTest
} = require("../controllers/testController");

router.use(protect); // all routes need JWT

router.get("/", getAllTests);
router.post("/", createTest);
router.put("/:id", updateTest); // edit full test
router.put("/:id/price", setVendorPrice);
router.patch("/:id/toggle-vendor", toggleVendorTest);
router.delete("/:id", deleteTest);

module.exports = router;