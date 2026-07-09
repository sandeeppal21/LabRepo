const express    = require("express");
const router     = express.Router();
const  protect  = require("../middleware/authMiddleware");
const {
  getAllTests, createTest,
  setVendorPrice, toggleVendorTest, deleteTest, updateTest
} = require("../controllers/testController");

router.use(protect); // all routes need JWT

router.get  ("/",                  getAllTests);      // admin + vendor
router.post ("/",                  createTest);      // admin + vendor
router.put("/:id", updateTest); // edit full test
router.put  ("/:id/price",         setVendorPrice);  // vendor only
router.patch("/:id/toggle-vendor", toggleVendorTest); // vendor only
router.delete("/:id",             deleteTest);       // admin only

module.exports = router;