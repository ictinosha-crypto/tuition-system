import express from "express";

const router = express.Router();

export default function createAIDashboardRoutes({ Student1, Payment, Attendence_new, Class }) {

  // 1️⃣ Weak Students
  router.get("/weak-students", async (req, res) => {
    try {
      const students = await Student1.find();
      let output = [];

      for (let s of students) {
        const total = await Attendence_new.countDocuments({ studentId: s._id });
        const present = await Attendence_new.countDocuments({
          studentId: s._id,
          present: true
        });

        const rate = total ? (present / total) * 100 : 0;
        const c = await Class.findById(s.grade);

        if (rate < 60) {
          output.push({
            name: s.fullName,
            grade: c?.className || "N/A",
            attendanceRate: rate.toFixed(1) + "%",
            status: "🔴 Weak / At Risk",
          });
        }
      }

      res.json(output);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2️⃣ Payment Defaulters
  router.get("/payment-defaulters", async (req, res) => {
    try {
      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();
      const result = [];

      const students = await Student1.find();

      for (let s of students) {
        const last = await Payment.findOne({ studentId: s._id }).sort({ date: -1 });

        const c = await Class.findById(s.grade);

        if (!last || new Date(last.date).getMonth() !== month) {
          result.push({
            name: s.fullName,
            grade: c?.className,
            lastPayment: last ? last.date.toISOString().split("T")[0] : "Never",
            status: "⚠️ Not Paid"
          });
        }
      }

      res.json(result);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3️⃣ Attendance Trends
  router.get("/attendance-trends", async (req, res) => {
    try {
      const days = await Attendence_new.find()
        .sort({ date: -1 })
        .limit(60);

      const grouped = {};

      for (let a of days) {
        const d = a.date.toISOString().split("T")[0];
        grouped[d] = grouped[d] || { total: 0, present: 0 };
        grouped[d].total++;
        if (a.present) grouped[d].present++;
      }

      const final = Object.keys(grouped).slice(0, 7).map(d => ({
        date: d,
        attendanceRate: (grouped[d].present / grouped[d].total * 100).toFixed(1),
      })).reverse();

      res.json(final);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4️⃣ Class Progress
  router.get("/class-progress", async (req, res) => {
    try {
      const classes = await Class.find();
      const out = [];

      for (let c of classes) {
        const students = await Student1.find({ grade: c._id });

        let totalRate = 0;
        let count = 0;

        for (let s of students) {
          const total = await Attendence_new.countDocuments({ studentId: s._id });
          const present = await Attendence_new.countDocuments({
            studentId: s._id,
            present: true
          });
          const rate = total ? (present / total) * 100 : 0;
          totalRate += rate;
          count++;
        }

        out.push({
          className: c.className,
          avgAttendance: count ? (totalRate / count).toFixed(1) : "0"
        });
      }

      res.json(out);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
