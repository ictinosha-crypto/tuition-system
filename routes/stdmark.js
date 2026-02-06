// routes/studentDetailsRoute.js
import express from "express";

export default function markstd({ Student1, Payment , Class, Attendence_new}) {
  const router = express.Router();

// Get student details + payment + attendance summary
router.get("/payment-history/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student1.findOne({ studentId });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const studentClass = await Class.findById(student.grade);
    const monthlyFee = studentClass ? studentClass.monthlyFee : 0;

    // Get attendance records
    const attendanceRecords = await Attendence_new.find({ studentId: student._id }).sort({ date: 1 });

    // Attendance summary per month
const attendanceSummary = {};
let allPresentDates = [];

attendanceRecords.forEach(rec => {
  if (rec.present) {
    const dateStr = rec.date; // e.g., "2025-10-09"
    const monthKey = dateStr.slice(0, 7); // e.g., "2025-10"

    if (!attendanceSummary[monthKey]) {
      attendanceSummary[monthKey] = { present: 0, presentDates: [] };
    }

    attendanceSummary[monthKey].present += 1;
    attendanceSummary[monthKey].presentDates.push(dateStr);
    allPresentDates.push(dateStr);
  }
});


    // Payments
    const payments = await Payment.find({ studentId: student._id });
    const pending = {};
    const paid = {};
    for (const month in attendanceSummary) {
      const monthPaid = payments
        .filter(p => p.month === month)
        .reduce((sum, p) => sum + p.amount, 0);

      pending[month] = Math.max(monthlyFee - monthPaid, 0);
      paid[month] = monthPaid;
    }

    const totalPending = Object.values(pending).reduce((a, b) => a + b, 0);
    const totalPaid = Object.values(paid).reduce((a, b) => a + b, 0);

    // Check if attendance is already marked today
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const existingToday = await Attendence_new.findOne({
      studentId: student._id,
      date: { $gte: startOfDay }
    });

    res.json({
      student,
      registeredDate: student.registeredDate || student.createdAt || null,
      monthlyFee,
      attendanceSummary,
      totalPresentDays: allPresentDates.length,
      payments,
      pending,
      paid,
      totalPending,
      totalPaid,
      alreadyMarkedToday: !!existingToday
    });
  } catch (error) {
    console.error(error);
        res.status(500).json({ message: "Error fetching student data", error: error.message });
  }
});


//  Mark today's attendance
router.post("/:id/mark-today", async (req, res) => {
  try {
    const studentId = req.params.id;

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0"); // months are 0-based
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Check if already marked today
    const already = await Attendence_new.findOne({
      studentId,
      date: todayStr
    });

    if (already) {
      return res.json({ message: "Already marked attendance for today" });
    }

    // Save attendance with date as string YYYY-MM-DD
    const newAttendance = new Attendence_new({
      studentId,
      date: todayStr,
      present: true
    });

    await newAttendance.save();

    res.json({ message: "Attendance marked successfully" });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ message: "Error marking attendance", error: error.message });
  }
});


//cancel attendence





  return router;
}
