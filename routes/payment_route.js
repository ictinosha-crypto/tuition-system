import express from "express";

export default function createPendingPaymentsRoutes({ Student1, Payment, Class }) {
  const router = express.Router();

  // Get all students with total payments
  router.get("/pending-summary", async (req, res) => {
    try {
      const students = await Student11.find();
      const summary = [];

      for (let s of students) {
        const payments = await Payment.find({ studentId: s._id });
        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        summary.push({
          studentNo: s.studentNo,
          name: s.name,
          grade: s.grade,
          totalPaid
        });
      }

      res.json(summary);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });


  // edit stdpayment page
router.get("/by-date/:date", async (req, res) => {
  try {
    const dateParam = req.params.date; // e.g. "2025-10-05"

    // Convert to Date objects for range query
    const start = new Date(dateParam);
    start.setHours(0, 0, 0, 0);

    const end = new Date(dateParam);
    end.setHours(23, 59, 59, 999);

    const payments = await Payment.find({
      date: { $gte: start, $lte: end }
    }).populate("studentId", "studentId fullName grade");

    res.json(payments);
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ message: "Error fetching payments" });
  }
});




//update payment
 router.put("/edit/:id", async (req, res) => { 
    try {
      const { amount, date } = req.body;

      const updateFields = {};
      if (amount !== undefined) updateFields.amount = amount;
      if (date) updateFields.date = date;

      const updated = await Payment.findByIdAndUpdate(
        req.params.id,
        updateFields,
        { new: true }
      );

      if (!updated)
        return res.status(404).json({ message: "Payment not found" });

      res.json({
        message: "Payment updated successfully",
        payment: updated,
      });
    } catch (err) {
      console.error("Error updating payment:", err);
      res.status(500).json({ message: "Error updating payment" });
    }
  });

  //monthly income chart for dashboard
  router.get("/monthly-summary", async (req, res) => {
  try {
    const result = await Payment.aggregate([
      {
        $group: {
          _id: { $substr: ["$date", 0, 7] }, // extract YYYY-MM
          totalAmount: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const formatted = result.map(r => ({
      month: r._id,
      total: r.totalAmount
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching monthly summary:", err);
    res.status(500).json({ message: "Server Error" });
  }
});
//

  return router;
}
