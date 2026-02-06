import express from "express";

const router = express.Router();

export default function chatbotR({ Student1, Attendence_new, Payment, Class }) {

// ---------------- HELPER: Get Student Profile ----------------
async function getStudentProfile(studentId) {
  const student = await Student1.findOne({ studentId });
  if (!student) return null;

  const classInfo = await Class.findById(student.grade);

  const attendance = await Attendence_new.find({ studentId: student._id });
  const payments = await Payment.find({ studentId: student._id });

  const presentDays = attendance.filter(a => a.present).length;
  const totalDays = attendance.length;
  const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : "0";

  const lastPayment = payments.sort((a, b) => b.date - a.date)[0];

  return {
    student,
    classInfo,
    presentDays,
    totalDays,
    attendanceRate,
    lastPayment
  };
}

// ---------------- RULE-BASED ENGINE ----------------
async function processMessage(studentId, msg) {
  msg = msg.toLowerCase();
  const profile = await getStudentProfile(studentId);

  if (!profile) return "Sorry, I couldn't find your profile.";

  const { student, classInfo, attendanceRate, lastPayment } = profile;

  // RULE 1: Attendance
  if (msg.includes("attendance") || msg.includes("present")) {
    return `Your attendance rate is ${attendanceRate}%.`;
  }

  // RULE 2: Payment
  if (msg.includes("payment") || msg.includes("fee")) {
    if (!lastPayment)
      return "You have no previous payments recorded.";
    return `Your last payment was Rs.${lastPayment.amount} on ${lastPayment.date.toISOString().slice(0,10)}.`;
  }

  // RULE 3: Grade/Class Info
  if (msg.includes("grade") || msg.includes("class")) {
    return `You are registered in class: ${classInfo.className}.`;
  }

  // RULE 4: Study Recommendation
  if (msg.includes("what should i study") || msg.includes("study")) {
    return "Based on your performance, you should revise Binary Numbers and HTML Basics.";
  }

  // RULE 5: Greetings
  if (msg.includes("hello") || msg.includes("hi")) {
    return `Hello ${student.fullName}! How can I help you today?`;
  }

  // RULE: Last 3 days attended
if (msg.includes("last 3") || msg.includes("recent days") || msg.includes("last three")) {

    const last3 = await Attendence_new.find({
        studentId: student._id,
        present: true
    })
    .sort({ date: -1 })   // latest first
    .limit(3);

    if (!last3.length)
        return "You have no attendance records for the last few days.";

    const days = last3
        .map(r => new Date(r.date).toISOString().slice(0,10))
        .join(", ");

    return `You attended on: ${days}`;
}
//**************** */

if (msg.includes("id") || msg.includes("student id") || msg.includes("my id")) {
    return `Your student ID is: ${student.studentId}`;
}




  return "I’m not sure about that. Try asking about attendance, payments, class, or studying.";
}

// ---------------- API ENDPOINT ----------------
router.post("/ask", async (req, res) => {
  try {
    const { studentId, message } = req.body;

    if (!studentId || !message)
      return res.status(400).json({ reply: "Missing inputs." });

    const reply = await processMessage(studentId, message);

    res.json({ reply });

  } catch (err) {
    console.log("Chatbot error:", err);
    res.status(500).json({ reply: "Error processing your request." });
  }
});

return router;
}
