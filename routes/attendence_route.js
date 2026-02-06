// routes/attendencecancel.js
import express from "express";
import ExcelJS from "exceljs";

export default function attendencecancel({ Student1, Attendence_new, Class }) {
  const router = express.Router();

  //  Check attendance for a specific student and date (string match)
  router.get("/check/:studentId/:date", async (req, res) => {
    try {
      const { studentId, date } = req.params;

      // Find student by custom studentId
      const student = await Student1.findOne({ studentId });
      if (!student) return res.status(404).json({ message: "Student not found" });

      // Find attendance record by string date
      const record = await Attendence_new.findOne({
        studentId: student._id,
        date: date // match the exact string
      });

      if (!record) return res.json({ exists: false });

      res.json({
        exists: true,
        studentId: student.studentId,
        studentName: student.fullName || student.name,
        date: record.date,
        present: record.present
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });

  //  Cancel (delete) attendance for a specific student and date
  router.delete("/cancel/:studentId/:date", async (req, res) => {
    try {
      const { studentId, date } = req.params;

      // Find student ObjectId
      const student = await Student1.findOne({ studentId });
      if (!student) return res.status(404).json({ message: "Student not found" });

      // Delete the attendance record
      const deleted = await Attendence_new.findOneAndDelete({
        studentId: student._id,
        date: date // match string
      });

      if (!deleted)
        return res.status(404).json({ message: "No attendance record found for this date." });

      res.json({ message: "Attendance successfully cancelled." });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });


  //attendace_report
  function buildDateQuery(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  end.setHours(23,59,59,999);

  return {
    $or: [
      // case 1: date stored as "YYYY-MM-DD" string
      { date: { $gte: startDateStr, $lte: endDateStr } },
      // case 2: date stored as Date
      { date: { $gte: start, $lte: end } }
    ]
  };
}

/**
 * GET /api/attendance/report_gradewise?grade=<classId>&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Returns JSON array of attendance rows for the selected class between dates.
 */
router.get("/report_gradewise", async (req, res) => {
  try {
    const { grade, startDate, endDate } = req.query;
    if (!grade || !startDate || !endDate) {
      return res.status(400).json({ message: "grade, startDate and endDate are required" });
    }

    const dateQuery = buildDateQuery(startDate, endDate);

    // Find attendance records in date range and populate studentId
    const records = await Attendence_new.find(dateQuery).populate("studentId");

    const output = [];

    for (const rec of records) {
      if (!rec.studentId) continue; // defensive

      // Load student with populated class info
      const student = await Student1.findById(rec.studentId._id).populate({
        path: "grade",       // field in student that stores class id
        model: Class,
        select: "className grade subject monthlyFee"
      });

      if (!student) continue;
      if (!student.grade) continue;

      // compare class _id (stored in student.grade) with requested 'grade' (classId)
      if (String(student.grade._id) !== String(grade)) continue;

      // Format date as YYYY-MM-DD regardless of original type
      let dateOut;
      if (rec.date instanceof Date) dateOut = rec.date.toISOString().split("T")[0];
      else dateOut = String(rec.date).slice(0,10); // assuming "YYYY-MM-DD"

      output.push({
        studentNo: student.studentId,
        name: student.fullName,
        grade: student.grade.grade,
        className: student.grade.className,
        subject: student.grade.subject,
        date: dateOut,
        present: Boolean(rec.present)
      });
    }

    res.json(output);
  } catch (err) {
    console.error("Attendance report error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/attendance/report_gradewise/excel?grade=...&startDate=...&endDate=...
 * Returns an Excel file of the same report.
 */
router.get("/report_gradewise/excel", async (req, res) => {
  try {
    const { grade, startDate, endDate } = req.query;
    if (!grade || !startDate || !endDate) {
      return res.status(400).send("grade, startDate and endDate are required");
    }

    const dateQuery = buildDateQuery(startDate, endDate);
    const records = await Attendence_new.find(dateQuery).populate("studentId");

    // prepare rows same as JSON route
    const rows = [];
    for (const rec of records) {
      if (!rec.studentId) continue;
      const student = await Student1.findById(rec.studentId._id).populate({
        path: "grade",
        model: Class,
        select: "className grade subject"
      });
      if (!student || !student.grade) continue;
      if (String(student.grade._id) !== String(grade)) continue;

      let dateOut;
      if (rec.date instanceof Date) dateOut = rec.date.toISOString().split("T")[0];
      else dateOut = String(rec.date).slice(0,10);

      rows.push({
        studentNo: student.studentId,
        name: student.fullName,
        grade: student.grade.grade,
        className: student.grade.className,
        subject: student.grade.subject,
        date: dateOut,
        status: rec.present ? "Present" : "Absent"
      });
    }

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Attendance");

    sheet.columns = [
      { header: "Student No", key: "studentNo", width: 15 },
      { header: "Name", key: "name", width: 25 },
      { header: "Grade", key: "grade", width: 12 },
      { header: "Class", key: "className", width: 12 },
      { header: "Subject", key: "subject", width: 12 },
      { header: "Date", key: "date", width: 14 },
      { header: "Status", key: "status", width: 10 }
    ];

    rows.forEach(r => sheet.addRow({
      studentNo: r.studentNo,
      name: r.name,
      grade: r.grade,
      className: r.className,
      subject: r.subject,
      date: r.date,
      status: r.status
    }));

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=attendance_${startDate}_to_${endDate}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel export error:", err);
    res.status(500).send("Error generating Excel");
  }
});

//


  return router;
}
