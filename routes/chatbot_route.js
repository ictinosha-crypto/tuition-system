import express from "express";
import OpenAI from "openai";

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST: /api/chatbot
router.post("/", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant for a tuition management system. Answer clearly and help students/teachers.",
        },
        { role: "user", content: userMessage }
      ],
    });

    let reply = "No response";

    if (
      completion &&
      completion.choices &&
      completion.choices[0] &&
      completion.choices[0].message &&
      completion.choices[0].message.content
    ) {
      reply = completion.choices[0].message.content;
    }

    res.json({ reply });

  } catch (err) {
    console.error("Chatbot Error:", err);
    res.status(500).json({ error: "Chatbot failed" });
  }
});

export default router;
