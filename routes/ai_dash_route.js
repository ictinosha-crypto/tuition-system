// routes/ai_dash_route.js
import express from "express";
import axios from "axios";

export default function aiRoutesdash({ Student1, Attendence_new }) {
  const router = express.Router();

  // Helper: build rows and call ML server
  async function buildAndCallML() {
    const students = await Student1.find();
    if (!students || students.length === 0) {
      // Return same structure as ML endpoint would
      return { predicted_absent_count: 0, results: [] };
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const dayOfWeek = today.getDay();

    const date30 = new Date(today);
    date30.setDate(today.getDate() - 30);

    const date60 = new Date(today);
    date60.setDate(today.getDate() - 60);

    const date90 = new Date(today);
    date90.setDate(today.getDate() - 90);

    // Build feature rows for each student
    const rows = await Promise.all(
      students.map(async (s) => {
        // yesterday
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const y_str = yesterday.toISOString().slice(0, 10);

        const prev1 = await Attendence_new.findOne({
          studentId: s._id,
          date: y_str
        });

        // counts (present records) in last 30/60/90 days
        const count30 = await Attendence_new.countDocuments({
          studentId: s._id,
          date: { $gte: date30.toISOString().slice(0, 10) }
        });

        const count60 = await Attendence_new.countDocuments({
          studentId: s._id,
          date: { $gte: date60.toISOString().slice(0, 10) }
        });

        const count90 = await Attendence_new.countDocuments({
          studentId: s._id,
          date: { $gte: date90.toISOString().slice(0, 10) }
        });

        const avgRate90 = Number((count90 / 90).toFixed(4));

        return {
          student_id: s.studentId,
          day_of_week: dayOfWeek,
          prev_1_day_att: prev1 ? (prev1.present ? 1 : 0) : 0,
          last_30_days_att: count30,
          last_60_days_att: count60,
          last_90_days_att: count90,
          avg_90_days_att_rate: avgRate90
        };
      })
    );

    // Call Flask ML server (bulk endpoint)
    const mlUrl = "http://127.0.0.1:5002/predict_bulk";

    const mlResponse = await axios.post(mlUrl, { rows }, { timeout: 15000 });

    // mlResponse.data expected: { predicted_absent_count, results: [{student_id, prob_absent, predicted_absent}, ...] }
    return mlResponse.data;
  }

  // Route: predict-attendance (older name)
  router.get("/predict-attendance", async (req, res) => {
    try {
      const mlData = await buildAndCallML();

      // Ensure response shape always present
      const predicted_absent_count = mlData.predicted_absent_count ?? 0;
      const results = mlData.results ?? [];

      res.json({ predicted_absent_count, results });
    } catch (err) {
      console.error("AI Error (predict-attendance):", err.message || err);
      res.status(500).json({ error: "AI prediction failed" });
    }
  });

  // Alias route: predict-today (frontend expects this name)
  router.get("/predict-today", async (req, res) => {
    try {
      const mlData = await buildAndCallML();
      const predicted_absent_count = mlData.predicted_absent_count ?? 0;
      const results = mlData.results ?? [];
      res.json({ predicted_absent_count, results });
    } catch (err) {
      console.error("AI Error (predict-today):", err.message || err);
      res.status(500).json({ error: "AI prediction failed" });
    }
  });

  return router;
}
