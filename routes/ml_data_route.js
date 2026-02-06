// ml_data_route.js
import express from "express";

export default function createAIGRRoute({ Student, Attendance }) {
  const router = express.Router();

  // -------------------------------
  // Attendance 12 weeks (by student)
  // -------------------------------
  router.get("/attendance-12weeks", async (req, res) => {
    try {
      const students = await Student.find().lean();
      const result = [];

      for (let s of students) {
        // Attendance matches Student._id (ObjectId)
        const records = await Attendance.find({ studentId: s._id })
          .sort({ date: -1 })
          .limit(12)
          .lean();

        result.push({
          studentId: s.studentId, // "STD002"
          fullName: s.fullName,
          grade: s.grade,         // "Grade 7"
          attendanceHistory: records.reverse().map(r =>
            r.present ? 100 : 0
          )
        });
      }

      res.json(result);
    } catch (err) {
      console.error("attendance-12weeks error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------
  // Grade-wise 12 weeks (for ML)
  // -------------------------------
  router.get("/grade-wise-12weeks", async (req, res) => {
    try {
      const students = await Student.find().lean();
      const grades = {};

      for (let s of students) {
        const gradeName = s.grade || "Unknown Grade";

        const records = await Attendance.find({ studentId: s._id })
          .sort({ date: -1 })
          .limit(12)
          .lean();

        const weeks = records.reverse().map((r, i) => ({
          week: i + 1,
          attendanceRate: r.present ? 100 : 0
        }));

        if (!grades[gradeName]) grades[gradeName] = [];

        grades[gradeName].push({
          studentId: s.studentId,
          fullName: s.fullName,
          weeks
        });
      }

      res.json(grades);
    } catch (err) {
      console.error("grade-wise-12weeks error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------
  // Grades list for dropdown
  // -------------------------------
  router.get("/grades", async (req, res) => {
    try {
      const students = await Student.find().lean();
      const set = new Set();

      students.forEach(s => set.add(s.grade));

      const result = [...set].map(g => ({
        _id: g,
        className: "" // optional
      }));

      res.json(result);
    } catch (err) {
      console.error("grades error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
