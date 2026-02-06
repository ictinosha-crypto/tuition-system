import express from "express";
import ActivityLog from "../models/activityLogModel.js";

const router = express.Router();

// GET last 10 activities
router.get("/recent", async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .sort({ timestamp: -1 })
      .limit(10);

    res.json(logs);
  } catch (err) {
    console.error("Activity log fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
