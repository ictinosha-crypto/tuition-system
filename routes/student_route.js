import express from "express";
import ExcelJS from "exceljs";

export default function createStudentRoutes({ Student, Payment, Class }) {
  const router = express.Router();

  //  Get all students / filter by grade
  router.get("/report", async (req, res) => {
  try {
    const { grade } = req.query;
    const query = grade ? { grade: { $regex: new RegExp(`^${grade}$`, "i") } } : {};
    const students = await Student.find(query);

    const result = [];

    for (let s of students) {
      const payments = await Payment.find({ studentId: s._id });
      const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Find class info for student's grade
      const classInfo = await Class.findOne({ _id: s.grade });
      result.push({
        studentNo: s.studentId,
        name: s.fullName,
        address: s.address,
        phone: s.phone,
        email: s.email,
        totalPaid,
        monthlyFee: classInfo ? classInfo.monthlyFee : 0, // example extra info
        className: classInfo ? classInfo.className : ""
      });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


  //  Export Excel
  router.get("/report/excel", async (req, res) => {
    try {
      const { grade } = req.query;
      const query = grade ? { grade: { $regex: new RegExp(`^${grade}$`, "i") } } : {};
      const students = await Student.find(query);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Students Report");

      sheet.columns = [
        { header: "Student No", key: "studentNo", width: 15 },
        { header: "Name", key: "name", width: 25 },
        { header: "Address", key: "address", width: 15 },  
        { header: "Phone", key: "phone", width: 15 },
        { header: "Email", key: "email", width: 15 },      
        { header: "Total Paid", key: "totalPaid", width: 15 }
            ];

      for (let s of students) {
        const payments = await Payment.find({ studentId: s._id });
        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        sheet.addRow({
          studentNo: s.studentId,
          name: s.fullName,
          address: s.address,
          phone: s.phone,
          email: s.email,
          totalPaid
        });
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=student_report.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  //  Get all grades
  router.get("/grades", async (req, res) => {
    try {
      const classes = await Class.find({}, { _id: 1, grade: 1 });
      const grades = classes.map(c => ({ id: c._id, name: c.grade }));
      res.json(grades);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
