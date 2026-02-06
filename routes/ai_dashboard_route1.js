// routes/ai_dashboard_route1.js
import QuizMark from "../models/QuizMarks.js"; 
import express from "express";

export default function createAiRoutes_dash({ Student1, Payment, Attendence_new, Class }) {
  const router = express.Router();

  // helper: month string "YYYY-MM"
  const monthStr = (d = new Date()) => d.toISOString().slice(0,7);

  // ---- utility functions ----
  // attendance % (all time) for a student
  async function getAttendancePercentage(studentId) {
    const total = await Attendence_new.countDocuments({ studentId });
    if (!total) return 0;
    const present = await Attendence_new.countDocuments({ studentId, present: true });
    return Math.round((present / total) * 100);
  }

  // count present days in a month for a student (schema: date is "YYYY-MM-DD" string)
  async function getMonthlyPresentCount(studentId, monthYYYYMM) {
    // match strings that start with YYYY-MM
    const docs = await Attendence_new.countDocuments({
      studentId,
      date: { $regex: `^${monthYYYYMM}` },
      present: true
    });
    return docs;
  }

  // whether payment exists for a student for a month (assumes Payment.month is "YYYY-MM")
 async function hasPaymentForMonth(studentId, monthYYYYMM) {
  const p = await Payment.findOne({ studentId, month: monthYYYYMM }).lean();
  return !!(p && p.amount > 0);
}


  // ---------------------------
  // SUMMARY endpoint
  // GET /api/ai_dash/summary
  // ---------------------------
  router.get("/summary", async (req, res) => {
    try {
      const totalStudents = await Student1.countDocuments();

      // today's present count (date stored as string "YYYY-MM-DD")
      const todayStr = new Date().toISOString().slice(0,10);
      const presentToday = await Attendence_new.countDocuments({
        date: { $regex: `^${todayStr}` },
        present: true
      });

      const currentMonth = monthStr();
      // overdue payments simple list
      const studentsAll = await Student1.find({}).lean();
      const overduePayments = [];
      for (const s of studentsAll) {
        const paid = await hasPaymentForMonth(s._id, currentMonth);
        if (!paid) {
          overduePayments.push({
            studentId: s._id,
            studentName: s.fullName,
            month: currentMonth
          });
        }
      }

      // build atRisk list (attendance < 60 or avgScore < 40 or payment missing / attended but not paid)
      const atRisk = [];
      for (const s of studentsAll) {
        const attendancePercent = await getAttendancePercentage(s._id);
        //const avgScore = s.avgScore ?? null;//
        // fetch all quiz marks for this student
// --- Get Quiz Average Score ---
const quizMarks = await QuizMark.find({ studentId: s._id }).lean();

let avgScore = null;
if (quizMarks.length > 0) {
  const totalScore = quizMarks.reduce((sum, q) => sum + q.score, 0);
  const totalMax = quizMarks.reduce((sum, q) => sum + q.maxScore, 0);
  avgScore = Math.round((totalScore / totalMax) * 100);
}



        //
        const flags = [];

        if (attendancePercent < 60) flags.push("Low attendance");
        if (avgScore !== null && avgScore < 40) flags.push("Low performance");

        const paid = await hasPaymentForMonth(s._id, currentMonth);
        const presentCountThisMonth = await getMonthlyPresentCount(s._id, currentMonth);
        if (!paid) {
          flags.push("Payment missing");
          if (presentCountThisMonth >= 1) flags.push("Attended but not paid");
        }

        if (flags.length) {
          atRisk.push({
            studentId: s._id,
            name: s.fullName,
            attendancePercent,
            avgScore,
            flags
          });
        }
      }

      res.json({
        stats: {
          totalStudents,
          presentToday,
          overduePayments: overduePayments.length
        },
        atRisk,
        payments: overduePayments
      });

    } catch (err) {
      console.error("AI DASH - summary error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------
  // RULES endpoint
  // GET /api/ai_dash/rules
  // ---------------------------
  router.get("/rules", (req, res) => {
    res.json({
      rules: [
        "Attendance < 60% => Low attendance",
        "AvgScore < 40 => Low performance",
        "No payment record for current month => Payment missing",
        "If present_in_month >= 1 AND no payment => Attended but not paid (must pay)"
      ]
    });
  });

  // ---------------------------
  // GRADE-RISK (existing logic) - improved and safe
  // GET /api/ai_dash/grade-risk
  // returns object keyed by classId
  // ---------------------------
  // ---------------------------
// UPDATED GRADE-RISK ROUTE
// Attendance is calculated based on:
// Expected classes per month = 4
// Attendance % = (presentThisMonth / 4) * 100
// ---------------------------
router.get("/grade-risk", async (req, res) => {
  try {
    const classes = await Class.find({}).lean();
    const classMap = {};

    classes.forEach(c => {
      classMap[c._id.toString()] = {
        fullName: `${c.grade} — ${c.className} (${c.subject || ""})`.trim(),
        grade: c.grade,
        className: c.className
      };
    });

    const currentMonth = monthStr();
    const students = await Student1.find({}).lean();

    const EXPECTED_DAYS_PER_MONTH = 4;

    const gradeSummary = {};

    for (const s of students) {
      const classId = (s.grade ?? "unknown").toString();

      if (!gradeSummary[classId]) {
        gradeSummary[classId] = {
          classId,
          label: classMap[classId]?.fullName || `Class ${classId}`,
          attendanceRisk: 0,
          paymentRisk: 0,
          attendanceStudents: [],
          paymentStudents: []
        };
      }

      // ------------ ATTENDANCE (NEW LOGIC) ------------
   const presentThisMonth = await Attendence_new.countDocuments({
  studentId: s._id,
  date: { $regex: `^${currentMonth}` },
  present: true
});

// keep % ONLY for display
const attendancePercent = EXPECTED_DAYS_PER_MONTH
  ? Math.round((presentThisMonth / EXPECTED_DAYS_PER_MONTH) * 100)
  : 0;


let attendanceCategory = "Critical";

if (presentThisMonth >= EXPECTED_DAYS_PER_MONTH * 0.75) {
  attendanceCategory = "Excellent";
} else if (presentThisMonth >= EXPECTED_DAYS_PER_MONTH * 0.5) {
  attendanceCategory = "Good";
} else if (presentThisMonth >= 1) {
  attendanceCategory = "Moderate";
}

// count only REAL critical students
if (attendanceCategory === "Critical") {
  gradeSummary[classId].attendanceRisk++;
}

// push student with category
gradeSummary[classId].attendanceStudents.push({
  studentId: s._id,
  sid:s.studentId,
  name: s.fullName,
  presentThisMonth,
  attendancePercent,
  category: attendanceCategory
});


      // ------------ PAYMENT STATUS ------------
      const paidThisMonth = await Payment.findOne({
        studentId: s._id,
        month: currentMonth
      }).lean();

     const isPaid = paidThisMonth && paidThisMonth.amount > 0;

      if (!isPaid) {
        gradeSummary[classId].paymentRisk++;

        // check if attended but not paid
        let reason = "Not Paid";
        if (presentThisMonth >= 1) {
          reason = "Attended but not paid";
        }

        gradeSummary[classId].paymentStudents.push({
          studentId: s._id,
          name: s.fullName,
          month: paidThisMonth?.amount ?? 0,
          reason
        });
      }
    }

    res.json(gradeSummary);

  } catch (err) {
    console.error("AI DASH - grade-risk error:", err);
    res.status(500).json({ error: err.message });
  }
});


  // ---------------------------
  // GRADE-STATS: LAST 3 MONTHS attendance & payments for a given class
  // GET /api/ai_dash/grade-stats/:classId
  // T
  // and Stu
  // ---------------------------
  router.get("/grade-stats/:classId", async (req, res) => {
    try {
      const classId = req.params.classId;

      // 1) get class record
      const cls = await Class.findOne({ _id: classId }).lean();
      const label = cls ? `${cls.grade} - ${cls.className}` : `Class ${classId}`;

      // 2) get students for this class
      // student.grade stores class _id as string in your DB, so use String(classId)
      const students = await Student1.find({ grade: String(classId) }).lean();
      const studentIds = students.map(s => s._id.toString());
      const totalStudents = studentIds.length;

      // build last 3 months list (current and previous two)
      const now = new Date();
      const months = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toISOString().slice(0, 7)); // YYYY-MM
      }

      const monthStats = [];
      // collect distinct class-day strings across all months (for attendance percent calc)
      const distinctDatesSet = new Set();
      let classPresentDays = 0;

      for (const m of months) {
        // attendance docs for students of this class in this month (date is string)
        const docs = await Attendence_new.find({
          studentId: { $in: studentIds },
          date: { $regex: `^${m}` },
          present: true
        }).lean();

        // unique students who attended at least 1 day
        const uniqueStudentSet = new Set(docs.map(d => d.studentId.toString()));
        const uniqueStudentsAttended = uniqueStudentSet.size;

        // total present docs = total attendance days
        const totalAttendanceDays = docs.length;
        classPresentDays += totalAttendanceDays;

        // collect distinct date strings for possible days calculation
        docs.forEach(d => {
          if (d.date && typeof d.date === "string") {
            distinctDatesSet.add(d.date); // e.g. "2025-10-22"
          }
        });

        // payments in that month for students in this class
        const payments = await Payment.find({
          studentId: { $in: studentIds },
          month: m
        }).lean();

        const paidPayments = payments.filter(p => p.amount > 0);
const paidSet = new Set(paidPayments.map(p => p.studentId.toString()));
const paidCount = paidSet.size;
const missingCount = totalStudents - paidCount;


        monthStats.push({
          month: m,
          uniqueStudentsAttended,
          totalAttendanceDays,
          paidCount,
          missingCount
        });
      }

      // compute class attendance percent:
      // if we can compute number of distinct class-days from attendance data, use that,
      // else fallback to approxPossibleDaysPerMonth (20)
      const distinctDaysCount = distinctDatesSet.size;
      let classAttendancePercent = 0;
      if (distinctDaysCount > 0 && totalStudents > 0) {
        const totalPossibleDays = distinctDaysCount * totalStudents; // each distinct date is one class day for all students
        classAttendancePercent = Math.round((classPresentDays / totalPossibleDays) * 100);
      } else {
        // fallback approx
        const approxPossibleDaysPerMonth = 20;
        const totalPossibleDays = approxPossibleDaysPerMonth * months.length * Math.max(1, totalStudents);
        classAttendancePercent = totalPossibleDays ? Math.round((classPresentDays / totalPossibleDays) * 100) : 0;
      }

      // compute simple trends for payments & attendance (oldest -> newest)
      const payPercents = monthStats.map(m => totalStudents ? Math.round((m.paidCount / totalStudents) * 100) : 0).reverse();
      const attendCounts = monthStats.map(m => m.uniqueStudentsAttended).reverse();

      function simpleTrend(arr) {
        if (arr.length < 3) return "stable";
        if (arr[2] > arr[1] && arr[1] > arr[0]) return "improving";
        if (arr[2] < arr[1] && arr[1] < arr[0]) return "declining";
        return "stable";
      }

      const paymentTrend = simpleTrend(payPercents);
      const attendanceTrend = simpleTrend(attendCounts);

      res.json({
        classId,
        label,
        totalStudents,
        months: monthStats,
        classPresentDays,
        classAttendancePercent,
        paymentTrend,
        attendanceTrend
      });

    } catch (err) {
      console.error("AI DASH - grade-stats error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------
  // Student-level analytics (unchanged)
  // GET /api/ai_dash/student/:id
  // ---------------------------
  router.get("/student/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const s = await Student1.findById(id).lean();
      if (!s) return res.status(404).json({ error: "Student not found" });

      const attendancePercent = await getAttendancePercentage(s._id);
      const now = new Date();
      const recentMonthly = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.toISOString().slice(0, 7);
        const daysPresent = await getMonthlyPresentCount(s._id, m);
        recentMonthly.push({ month: m, daysPresent });
      }

      res.json({
        student: s,
        attendancePercent,
        recentMonthly
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  //**************************** */
router.get("/student1/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let student = null;

    // If ID is a valid MongoDB ObjectId → search using _id
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      student = await Student1.findById(id).lean();
    }

    // If not found → search using studentId (STD001)
    if (!student) {
      student = await Student1.findOne({ studentId: id }).lean();
    }

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Attendance %
    const attendancePercent = await getAttendancePercentage(student._id);

    // Monthly attendance (last 6 months)
    const now = new Date();
    const recentMonthly = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.toISOString().slice(0, 7);
      const daysPresent = await getMonthlyPresentCount(student._id, m);
      recentMonthly.push({ month: m, daysPresent });
    }

    // Last class attended (latest date)
    const lastClass = await Attendence_new.findOne({
      studentId: student._id,
      present: true
    })
    .sort({ date: -1 })
    .lean();

    // Payment history
    const payments = await Payment.find({ studentId: student._id }).sort({ month: -1 }).lean();

    res.json({
      student,
      attendancePercent,
      recentMonthly,
      lastClassAttended: lastClass?.date || null,
      paymentHistory: payments
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

  //****************************** */

  return router;
}
