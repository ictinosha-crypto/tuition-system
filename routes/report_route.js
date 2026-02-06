// routes/reportRoutes.js
import express from "express";
const router = express.Router();

export default function createReportRoutes({ Student1, Payment , Class, Attendence_new}) {
  // Monthly Income Report
  router.get("/monthly-income", async (req, res) => {
    try {
      const { year } = req.query;

      if (!year) {
        return res.status(400).json({ error: "Year is required" });
      }

      // Group payments by month of selected year
      const incomeData = await Payment.aggregate([
        {
          $match: {
            date: {
              $gte: new Date(`${year}-01-01`),
              $lt: new Date(`${Number(year) + 1}-01-01`)
            }
          }
        },
        {
          $group: {
            _id: { $month: "$date" },
            totalIncome: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id": 1 } }
      ]);

      // Format result for frontend
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      const formatted = months.map((m, i) => {
        const monthData = incomeData.find(d => d._id === i + 1);
        return {
          month: m,
          income: monthData ? monthData.totalIncome : 0,
          transactions: monthData ? monthData.count : 0
        };
      });

      const total = formatted.reduce((sum, m) => sum + m.income, 0);

      res.json({ year, total, data: formatted });
    } catch (err) {
      console.error("Error generating monthly income report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });



  // daily payment report
   router.get("/daily", async (req, res) => {
    try {
      const { date } = req.query;
      if (!date) return res.status(400).json({ error: "Date is required" });

      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      // Fetch payments for the given date
     const payments = await Payment.find({
  date: { $gte: start, $lte: end }
}).populate({
  path: "studentId",
  select: "studentId fullName grade",
  populate: { path: "grade", select: "grade className" } // populate Class
});


      res.json(payments);
    } catch (err) {
      console.error("Error fetching daily payments:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // all payment date wise
  


  //  DAILY PAYMENT REPORT
  router.get("/daily-payments", async (req, res) => {
  try {
    const { date, gradeId } = req.query;
    if (!date) return res.status(400).json({ error: "Date is required" });

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    // Populate student + class info
    const payments = await Payment.find({ date: { $gte: start, $lte: end } })
      .populate({
        path: "studentId",
        select: "studentId fullName grade",
        populate: {
          path: "grade",
          model: "Class",
          select: "grade className"
        }
      })
      .sort({ "studentId.studentId": 1 });

    // Optional grade filter
    const filteredPayments =
      gradeId && gradeId !== "all"
        ? payments.filter(
            (p) => p.studentId?.grade?._id?.toString() === gradeId
          )
        : payments;

    // Flatten report data
    const report = [];
    let grandTotal = 0;

    filteredPayments.forEach((p) => {
      report.push({
        studentNo: p.studentId?.studentId || "-",
        fullName: p.studentId?.fullName || "-",
        grade:
          p.studentId?.grade?.grade && p.studentId?.grade?.className
            ? `${p.studentId.grade.grade} - ${p.studentId.grade.className}`
            : "No Grade",
        amount: p.amount || 0,
        date: p.date
      });

      grandTotal += p.amount || 0;
    });

    res.json({ date, grandTotal, report });
  } catch (err) {
    console.error("Error fetching daily payments:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// LOAD GRADES FOR DROPDOWN
router.get("/grades", async (req, res) => {
  try {
    const grades = await Class.find({}, "_id grade className");
    res.json(grades);
  } catch (err) {
    console.error("Error loading grades:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// pending_payment report
router.get("/monthly-pending", async (req, res) => {
  try {
    const { month, year, gradeId } = req.query;
    if (!month || !year)
      return res.status(400).json({ error: "Month and year are required" });

    // Convert to YYYY-MM-DD strings
    const startStr = `${year}-${month.toString().padStart(2,'0')}-01`;
    const endStr = `${year}-${month.toString().padStart(2,'0')}-${new Date(year, month, 0).getDate()}`;

    // 1️⃣ Get attendances with present: true
    const attendances = await Attendence_new.find({
      date: { $gte: startStr, $lte: endStr },
      present: true
    }).populate({
      path: "studentId",
      select: "studentId fullName grade",
      populate: {
        path: "grade",
        model: "Class",
        select: "grade className monthlyFee"
      }
    });

    if (!attendances.length)
      return res.json({ month, year, netPending: 0, report: [] });

    // 2️⃣ Filter by grade
    const filteredAttendance = gradeId && gradeId !== "all"
      ? attendances.filter(a => a.studentId.grade && a.studentId.grade._id.toString() === gradeId)
      : attendances;

    if (!filteredAttendance.length)
      return res.json({ month, year, netPending: 0, report: [] });

    // 3️⃣ Build unique student map
    const studentMap = {};
    filteredAttendance.forEach(a => {
      const sid = a.studentId._id.toString();
      if (!studentMap[sid]) {
        studentMap[sid] = {
          studentNo: a.studentId.studentId,
          fullName: a.studentId.fullName,
          grade: a.studentId.grade
            ? `${a.studentId.grade.grade} - ${a.studentId.grade.className}`
            : "No Grade",
          monthlyFee: a.studentId.grade?.monthlyFee || 0,
          paidAmount: 0
        };
      }
    });

    const studentIds = Object.keys(studentMap);

    // 4️⃣ Sum payments for these students in the month
    const payments = await Payment.find({
      studentId: { $in: studentIds },
      date: { $gte: startStr, $lte: endStr }
    });

    payments.forEach(p => {
      const sid = p.studentId.toString();
      if (studentMap[sid]) studentMap[sid].paidAmount += p.amount;
    });

    // 5️⃣ Calculate pending
    let netPending = 0;
    const report = [];

    Object.values(studentMap).forEach(s => {
      const pending = s.monthlyFee - s.paidAmount;
      if (pending > 0) {
        netPending += pending;
        report.push({
          studentNo: s.studentNo,
          fullName: s.fullName,
          grade: s.grade,
          monthlyFee: s.monthlyFee,
          paidAmount: s.paidAmount,
          pendingAmount: pending
        });
      }
    });

    res.json({ month, year, netPending, report });

  } catch (err) {
    console.error("Error fetching monthly pending:", err);
    res.status(500).json({ error: "Server error" });
  }
});



 



  return router;
}
