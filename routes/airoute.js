import express from "express";

const router = express.Router();

export default function createairoute({ Student1, Payment, Attendence_new, Class }) {
  // Attendance Prediction 
  router.get("/attendance-prediction", async (req, res) => {
    try {
      const students = await Student1.find();
      const predictions = [];

      for (let student of students) {
        const recent = await Attendence_new.find({ studentId: student._id })
          .sort({ date: -1 })
          .limit(4);

        const presentCount = recent.filter(r => r.present).length;
        const probability = (presentCount / 4) * 100;
        const class_data = await Class.findById(student.grade);

        predictions.push({
          name: student.fullName,
          grade: class_data.grade,
          predictedAttendance: probability.toFixed(0) + "%",
          status:
            probability < 50
              ? "🔴 Likely to be Absent"
              : probability < 75
              ? "🟠 Moderate"
              : "🟢 Likely to be Present",
        });
      }

      res.json(predictions);
    } catch (err) {
      console.error("AI attendance prediction error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  //  Payment Risk //
  router.get("/payment-alerts", async (req, res) => {
    try {
      const students = await Student1.find();
      const results = [];

      for (let s of students) {
        const payHistory = await Payment.find({ studentId: s._id })
          .sort({ date: -1 })
          .limit(3);

        const delayed = payHistory.filter(p => {
          const paidDate = new Date(p.date);
          const day = paidDate.getDate();
          return day > 10; // assume payment after 10th = late
        });
        const class_data = await Class.findById(s.grade);

        results.push({
          name: s.fullName,
          grade: class_data.grade,
          paymentRisk:
            delayed.length >= 2 ? "🔴 High risk of late payment" : "🟢 Low risk",
        });
      }

      res.json(results);
    } catch (err) {
      console.error("AI payment alert error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ===================== 3️⃣ Learning Recommendations ===================== //
  router.get("/recommendations", async (req, res) => {
    try {
    const students = await Student1.find();
      //const students = await Student1.find().populate("grade"); 
      const recs = [];

      for (let s of students) {
        const total = await Attendence_new.countDocuments({ studentId: s._id });
        const present = await Attendence_new.countDocuments({
          studentId: s._id,
          present: true,
        });
        const attendanceRate = total ? (present / total) * 100 : 0;
        //const gradeName = s.grade?.name || s.grade?.className || "N/A";
        const class_data = await Class.findById(s.grade);

        let recommendation;
        if (attendanceRate < 60)
          recommendation =
            "📘 Revise missed ICT lessons and review video recordings.";
        else if (attendanceRate < 80)
          recommendation = " Continue practicing previous ICT exercises.";
        else
          recommendation = " Proceed to advanced ICT quizzes and projects.";

        recs.push({
          name: s.fullName,
          grade: class_data.grade,
          attendanceRate: attendanceRate.toFixed(0) + "%",
          recommendation,
        });
      }

      res.json(recs);
    } catch (err) {
      console.error("AI recommendation error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  //load classes
  // ===================== 5️⃣ Get All Classes (for dropdown) ===================== //
router.get("/classes", async (req, res) => {
  try {
    const classes = await Class.find({}, "_id className name");
    const formatted = classes.map(c => ({
      _id: c._id,
      name: c.className || c.name
    }));
    res.json(formatted);
  } catch (err) {
    console.error("Error fetching classes:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

//************ attendence_insight************* */
 router.get("/attendance-insights", async (req, res) => {
    try {
      const { grade } = req.query;

      // Get students, filter by grade if provided
      let students = await Student1.find();
      if (grade && grade !== "all") {
        students = students.filter(s => s.grade === grade);
      }

      const data = [];
      for (let s of students) {
        const classInfo = await Class.findById(s.grade);
        const className = classInfo ? classInfo.className : "N/A";

        const total = await Attendence_new.countDocuments({ studentId: s._id });
        const present = await Attendence_new.countDocuments({ studentId: s._id, present: true });
        const rate = total ? (present / total) * 100 : 0;

        data.push({
          name: s.fullName,
          grade: className,
          attendanceRate: rate.toFixed(0) + "%",
          remark: rate < 60 ? "⚠️ Needs improvement" : rate < 80 ? "🙂 Average" : "✅ Excellent",
        });
      }

      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
