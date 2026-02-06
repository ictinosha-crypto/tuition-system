// ai_route.js
import express from "express";
import axios from "axios";
import dayjs from "dayjs";

export default function airoutes({ Student1, Payment, Attendence_new, Class }) {
  const router = express.Router();

  // -----------------------------
  // AI attendance insights (last 2 weeks)
  // -----------------------------
  router.get("/insights", async (req, res) => {
    try {
      const today = dayjs();
      const twoWeeksAgo = today.subtract(14, "day");

      const records = await Attendence_new.find({}).lean();

      const filteredRecords = records.filter(r => {
        const recordDate = dayjs(r.date);
        return recordDate.isAfter(twoWeeksAgo) && recordDate.isBefore(today.add(1, "day"));
      });

      if (!filteredRecords.length) {
        return res.json({ message: "No recent attendance found", records: [] });
      }

      const attendanceByStudent = {};
      filteredRecords.forEach(r => {
        const id = r.studentId?.toString();
        if (!attendanceByStudent[id]) attendanceByStudent[id] = [];
        attendanceByStudent[id].push(r);
      });

      const aiResults = [];
      for (const [studentId, recs] of Object.entries(attendanceByStudent)) {
        const total = recs.length;
        const presentCount = recs.filter(r => r.present).length;
        const presentRatio = (presentCount / total) * 100;

        let prediction = "Poor attendance, at risk of drop";
        if (presentRatio > 90) prediction = "Excellent attendance trend";
        else if (presentRatio > 70) prediction = "Good but can improve";
        else if (presentRatio > 50) prediction = "Irregular attendance";

        //aiResults.push({ studentId, total, presentCount, presentRatio, prediction });


        aiResults.push({
  studentId,
  totalDays: total,           // total classes
  attendedDays: presentCount, // total attended days
  presentRatio,
  prediction
});
      }

      const populatedResults = await Promise.all(
        aiResults.map(async (item) => {
          const student = await Student1.findById(item.studentId).lean();
          return {
            ...item,
            studentName: student ? student.fullName : "Unknown",
            studentNo: student ? student.studentId : "N/A",
          };
        })
      );

      res.json({
        message: "AI attendance insights generated",
        totalStudents: populatedResults.length,
        insights: populatedResults,
      });
    } catch (err) {
      console.error("AI prediction error:", err);
      res.status(500).json({ error: "AI prediction failed" });
    }
  });

  // -----------------------------
  // Next-week attendance prediction
  // -----------------------------
  router.get("/ai-predict-next-week", async (req, res) => {
    try {
      const response = await axios.get("http://localhost:5001/predict_next_week_students");
      res.json(response.data);
    } catch (err) {
      console.error("Next-week prediction error:", err);
      res.status(500).json({ error: "AI prediction failed" });
    }
  });

  // -----------------------------
  // Grade-wise attendance for last 12 weeks
  // -----------------------------
  router.get("/grade-wise-12weeks", async (req, res) => {
    try {
      const records = await Attendence_new.find({}).lean();
      const data = {};

      for (const record of records) {
        const student = await Student1.findById(record.studentId).lean();
        if (!student) continue;

        const weekNumber = Math.floor(dayjs().diff(dayjs(record.date), "week"));
        if (weekNumber >= 12) continue;

        const grade = student.grade.toString();
        if (!data[grade]) data[grade] = [];

        let studentData = data[grade].find(s => s.studentId === student.studentId);
        if (!studentData) {
          studentData = { studentId: student.studentId, fullName: student.fullName, weeks: [] };
          data[grade].push(studentData);
        }

        studentData.weeks.push({
          week: 12 - weekNumber,
          attendanceRate: record.present ? 100 : 0,
        });
      }

      res.json(data);
    } catch (err) {
      console.error("Grade-wise 12 weeks error:", err);
      res.status(500).json({ error: "Failed to fetch grade-wise attendance" });
    }
  });

  // -----------------------------
  // Fetch all grades (for dropdown)
  // -----------------------------
  router.get("/grades", async (req, res) => {
    try {
      const classes = await Class.find({}).lean();
      const grades = classes.map(c => ({
        _id: c._id.toString(),  // Important for frontend select value
        grade: c.grade,
        className: c.className,
      }));
      res.json(grades);
    } catch (err) {
      console.error("Fetch grades error:", err);
      res.status(500).json({ error: "Failed to fetch grades" });
    }
  });

  return router;
}
