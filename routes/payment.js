import express from "express";

export default function createPendingPaymentsRoutes({ Student, Payment, Class }) {
  const router = express.Router();

  // Get pending payments grade-wise
  router.get("/gradewise", async (req, res) => {
  try {
    const students = await Student.find().populate("grade"); // grade = Class document

    const pendingByGrade = {};

    for (const s of students) {
      const classInfo = s.grade; // populated Class
      if (!classInfo) continue;

      const gradeName = classInfo.grade; // e.g., "A/L"
      const monthlyFee = classInfo.monthlyFee;

      const payments = await Payment.find({ studentId: s._id });
      const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      const pending = Math.max(monthlyFee - totalPaid, 0);

      if (!pendingByGrade[gradeName]) pendingByGrade[gradeName] = 0;
      pendingByGrade[gradeName] += pending;
    }

    const result = Object.entries(pendingByGrade).map(([grade, totalPending]) => ({
      grade,
      totalPending
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



  return router;
}
