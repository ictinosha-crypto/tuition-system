import express from "express";
import QuizQuestion from "../models/quiz_question.js";
import QuizMark from "../models/QuizMarks.js";

export default function quizRoute(Student1) {
const router = express.Router();

// ADD QUESTION
router.post("/add", async (req, res) => {
  try {
    const { question, options, correctAnswer, topic } = req.body;

    const newQ = new QuizQuestion({
      question,
      options,
      correctAnswer,
      topic
    });

    await newQ.save();
    res.json({ message: "Question added successfully!" });

  } catch (err) {
    res.status(500).json({ message: "Failed to add question", error: err });
  }
});

// GET ALL QUESTIONS
router.get("/all", async (req, res) => {
  try {
    const questions = await QuizQuestion.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: "Failed to load questions" });
  }
});
//Delete questions
// DELETE QUESTION
router.delete("/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await QuizQuestion.findByIdAndDelete(id);
    res.json({ message: "Question deleted successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete question", error: err });
  }
});
//quiz
/* =============================
   4. SUBMIT QUIZ (NO SAVE)
============================= */
router.post("/submit", async (req, res) => {
  try {
    const { answers } = req.body;

    const questions = await QuizQuestion.find();
    let score = 0;
    let maxScore = questions.length;

    let correctList = [];
    let wrongList = [];

    questions.forEach(q => {
      const userAnswer = answers[q._id];

      if (userAnswer === q.correctAnswer) {
        score++;
        correctList.push({
          question: q.question,
          yourAnswer: userAnswer,
          correctAnswer: q.correctAnswer
        });
      } else {
        wrongList.push({
          question: q.question,
          yourAnswer: userAnswer || "No answer",
          correctAnswer: q.correctAnswer
        });
      }
    });

    return res.json({
      score,
      maxScore,
      correctList,
      wrongList
    });

  } catch (err) {
    res.status(500).json({ message: "Quiz submit failed", error: err });
  }
});


//random
// GET 3 RANDOM QUESTIONS
router.get("/random3", async (req, res) => {
  try {
    const questions = await QuizQuestion.aggregate([
      { $sample: { size: 3 } }
    ]);

    res.json(questions);

  } catch (err) {
    res.status(500).json({ message: "Failed to load random questions", error: err });
  }
});
//submit
// =============================
// SUBMIT QUIZ (NO SAVE)
// =============================
router.post("/submit1", async (req, res) => {
  try {
    const { answers, quizData } = req.body;

    let score = 0;
    let maxScore = quizData.length;

    let correctList = [];
    let wrongList = [];

    quizData.forEach(q => {
      const userAnswer = answers[q._id];

      if (userAnswer === q.correctAnswer) {
        score++;
        correctList.push({
          question: q.question,
          yourAnswer: userAnswer,
          correctAnswer: q.correctAnswer
        });
      } else {
        wrongList.push({
          question: q.question,
          yourAnswer: userAnswer || "No Answer",
          correctAnswer: q.correctAnswer
        });
      }
    });

    res.json({
      score,
      maxScore,
      correctList,
      wrongList
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Quiz submission failed", error: err });
  }
});
//******************** */
router.post("/submit2", async (req, res) => {
  try {
    const { answers, quizData, studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: "studentId missing" });
    }

    let realStudentId = studentId;

    // 🔥 If studentId is NOT a MongoDB _id -> convert STD code to ObjectId
    if (!String(studentId).match(/^[0-9a-fA-F]{24}$/)) {
      const student = await Student1.findOne({ studentId }).lean();
      if (!student) {
        return res.status(404).json({ error: "Student not found with studentId" });
      }
      realStudentId = student._id; 
    }

    let score = 0;
    let correctList = [];
    let wrongList = [];

    quizData.forEach(q => {
      const ans = answers[q._id];

      if (ans === q.correctAnswer) {
        score++;
        correctList.push({ question: q.question, yourAnswer: ans });
      } else {
        wrongList.push({
          question: q.question,
          yourAnswer: ans || "No Answer",
          correctAnswer: q.correctAnswer
        });
      }
    });

    // SAVE QUIZ MARK
    await QuizMark.create({
      studentId: realStudentId,
      quizDate: new Date().toISOString().slice(0, 10),
      score,
      maxScore: quizData.length
    });

    return res.json({ score, maxScore: quizData.length, correctList, wrongList });

  } catch (err) {
    console.error("Quiz Submit Error:", err);
    return res.status(500).json({ error: err.message });
  }
});








//*********************** */
return router;
}
