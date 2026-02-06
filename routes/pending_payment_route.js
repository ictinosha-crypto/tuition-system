import express from "express";

export default function pendingPaymentRoute({ Student1, Attendence_new, Payment, Class }) {

  const router = express.Router();

  //  GRADE-WISE PENDING PAYMENT ROUTE

  router.get("/gradewise", async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const attended = await Attendence_new.aggregate([
      { $addFields: { month: { $substr: ["$date", 0, 7] } } },
      { $match: { month: currentMonth } },
      { $group: { _id: "$studentId" } }
    ]);

    const attendedIds = attended.map(s => s._id.toString());

    const paid = await Payment.aggregate([
      { $match: { month: currentMonth } },
      { $group: { _id: "$studentId" } }
    ]);

    const paidIds = paid.map(s => s._id.toString());

    const pendingIds = attendedIds.filter(id => !paidIds.includes(id));

    const pendingStudents = await Student1.find({
      _id: { $in: pendingIds }
    }).populate({
      path: "grade",
      model: Class,
      select: "className grade subject monthlyFee"
    });

    const gradeSummary = {};

    pendingStudents.forEach(student => {
      const cls = student.grade;

      const gradeName = cls
        ? `${cls.grade} - ${cls.subject}`
        : "Unknown";

      const monthlyFee = cls?.monthlyFee || 0;

      if (!gradeSummary[gradeName]) {
        gradeSummary[gradeName] = {
          pendingCount: 0,
          monthlyFee: monthlyFee,
          totalPending: 0
        };
      }

      gradeSummary[gradeName].pendingCount++;

      gradeSummary[gradeName].totalPending =
        gradeSummary[gradeName].pendingCount * monthlyFee;
    });

    res.json({
      month: currentMonth,
      gradeWisePending: gradeSummary
    });

  } catch (err) {
    console.error("Error fetching grade-wise pending payments:", err);
    res.status(500).json({ message: "Server error" });
  }
});




 
  //   RETURN ROUTER

  return router;
}
