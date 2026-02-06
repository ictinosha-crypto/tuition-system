import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import Note from "../models/note.js"; // adjust path if needed

const router = express.Router();

// Ensure uploads directory
const UPLOAD_DIR = path.join(process.cwd(), "public", "notes"); // -> served as /notes
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // create unique filename: timestamp-originalname
    const safe = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  }
});

// Serve static files in main server file (example):
// app.use('/notes', express.static(path.join(process.cwd(), 'public', 'notes')));

// POST /api/notes/upload
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { title, description, topic } = req.body;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    if (!title || title.trim() === "") {
      // optional: delete uploaded file if metadata invalid
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Title is required" });
    }

    const fileUrl = `/notes/${req.file.filename}`; // served via static middleware

    const note = new Note({
      title: title.trim(),
      description: description ? description.trim() : "",
      topic: topic ? topic.trim() : "",
      filename: req.file.filename,
      fileUrl
    });

    await note.save();
    res.json({ message: "Uploaded", note });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message || err });
  }
});

// GET /api/notes/all
router.get("/all", async (req, res) => {
  try {
    const notes = await Note.find().sort({ uploadedAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load notes" });
  }
});

// DELETE /api/notes/delete/:id
router.delete("/delete/:id", async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    // delete file from disk
    const filePath = path.join(UPLOAD_DIR, note.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await note.deleteOne();
    res.json({ message: "Deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed", error: err.message || err });
  }
});

export default router;
