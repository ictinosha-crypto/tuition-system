import express from "express";
import ExcelJS from "exceljs";

export default function createAttendanceRoutes({ Attendance, Student, Class }) {
  const router = express.Router();

  // GET: Attendance report JSON
  router.get("/report", async (req, res) => {
    try {
      const { date, month, grade } = req.query;
      const query = {};

      if (date) query.date = date; // assume date stored as string "YYYY-MM-DD"
      if (month) query.month = month; // "YYYY-MM"
      if (grade) query.grade = grade;

      const records = await Attendance.find(query).populate("studentId");

      // Map to frontend-friendly array
      const result = records.map(a => ({
        studentNo: a.studentId.studentId,
        name: a.studentId.fullName,
        grade: a.studentId.grade,
        date: a.date,
        status: a.present ? "Present" : "Absent"
      }));

      res.json(result);
    } catch (err) {
      console.error("Error fetching attendance report:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET: Export Excel
  router.get("/report/excel", async (req, res) => {
    try {
      const { date, month, grade } = req.query;
      const query = {};

      if (date) query.date = date;
      if (month) query.month = month;
      if (grade) query.grade = grade;

      const records = await Attendance.find(query).populate("studentId");

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Attendance Report");

      sheet.columns = [
        { header: "Student No", key: "studentNo", width: 15 },
        { header: "Name", key: "name", width: 25 },
        { header: "Grade", key: "grade", width: 10 },
        { header: "Date", key: "date", width: 15 },
        { header: "Status", key: "status", width: 10 },
      ];

      records.forEach(a => {
        sheet.addRow({
          studentNo: a.studentId.studentId,
          name: a.studentId.fullName,
          grade: a.studentId.grade,
          date: a.date,
          status: a.present ? "Present" : "Absent"
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=attendance_report.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error("Error exporting attendance:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
