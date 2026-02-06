import express from "express";

export default function createAIGRRoute({ Student, Attendance, Payment, ClassModel }) {
  const router = express.Router();

  // 1️⃣ Attendance data for ML
  router.get("/attendance-12weeks", async (req, res) => {
    try {
      const students = await Student.find().lean();
      const result = [];

      for (let s of students) {
        const records = await Attendance.find({ studentId: s._id })
          .sort({ date: 1 })
          .limit(12);

        result.push({
          studentId: s._id,
          fullName: s.fullName,
          grade: s.grade,
          attendanceHistory: records.map(r => (r.present ? 1 : 0)),
        });
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2️⃣ Payment data for ML
  router.get("/payment-3months", async (req, res) => {
    try {
      const students = await Student.find().lean();
      const result = [];

      for (let s of students) {
        const payHistory = await Payment.find({ studentId: s._id })
          .sort({ date: 1 })
          .limit(3);

        result.push({
          studentId: s._id,
          fullName: s.fullName,
          grade: s.grade,
          paymentHistory: payHistory.map(p => {
            const d = new Date(p.date);
            return d.getDate() <= 10 ? 1 : 0; // late or not
          }),
        });
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3️⃣ Grade list
  router.get("/grades", async (req, res) => {
    const classes = await ClassModel.find({}, "_id className");
    res.json(classes);
  });

  return router;
}
