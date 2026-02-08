import express from 'express';
import cors from "cors";
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
//************************ 

dotenv.config();



import paymentRoutes from "./routes/payment_route.js";
import createPendingPaymentsRoutes from "./routes/payment_route.js";
import createStudentRoutes from "./routes/student_route.js";
import markstd from "./routes/stdmark.js";
import attendencecancel from "./routes/attendence_route.js";
import createAttendanceRoutes from "./routes/attendencereport_route.js";
import createReportRoutes from "./routes/report_route.js";
import createairoute from "./routes/airoute.js";
import airoutes from "./routes/ai_route.js";
import userRoutes from './routes/user_route.js';
import createdashboardroute from "./routes/aidashboard_route.js";
import createMLDataRoute from "./routes/ml_data_route.js";
import createAIGRRoute from "./routes/ai_grade_data.js";
import pendingPaymentRoute from "./routes/pending_payment_route.js";
//import activityRoutes from "./routes/activity_route.js";

//ai dash
import aiRoutesdash from "./routes/ai_dash_route.js";

import createAiRoutes_dash from './routes/ai_dashboard_route1.js';

import chatbotR from "./routes/chatbot_route_new.js";

import quizRoute from "./routes/quiz_route.js";

//import notesRoute from './routes/notes_route.js';













// Then use Student and Attendance in routes or logic


dotenv.config();

// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;




app.use(cors({
  origin: "*",   // later you can restrict to Netlify URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Middleware to parse form data and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Atlas connected"))
  .catch(err => console.error("MongoDB connection error:", err));


const db = mongoose.connection;
db.once('open', () => {
  console.log('MongoDB connected successfully');
});



//**************************** */
//app.use(express.static('frontend'));

//class schema
const classSchema = new mongoose.Schema({
  className: { type: String, required: true },
  grade: { type: String, required: true },
  subject: { type: String },
  teacher: { type: String },
  monthlyFee: { type: Number, required: true },
  description: { type: String }
});

const Class = mongoose.model('Class', classSchema, 'classes');




///
//insert data in to the class scema
app.post('/api/classes', async (req, res) => {
  try {
    const { className, grade, subject, teacher, monthlyFee, description } = req.body;

    const newClass = new Class({
      className,
      grade,
      subject,
      teacher,
      monthlyFee,
      description
    });

    await newClass.save();

    res.status(201).json({ message: 'Class created successfully', class: newClass });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create class' });
  }
});

//end create class

//class List
// Get all classes
app.get('/api/classes', async (req, res) => {
  try {
    const classes = await Class.find();
    res.json(classes);
  } catch (error) {
    console.error('Failed to fetch classes:', error);
    res.status(500).json({ message: 'Failed to fetch classes' });
  }
});

//end class list

//add - edit routes for class
// Get a class by ID (to pre-fill edit form)
app.get('/api/classes/:id', async (req, res) => {
  try {
    const classId = req.params.id;
    const foundClass = await Class.findById(classId);
    if (!foundClass) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json(foundClass);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a class by ID
app.put('/api/classes/:id', async (req, res) => {
  try {
    const classId = req.params.id;
    const updateData = req.body;

    const updatedClass = await Class.findByIdAndUpdate(classId, updateData, { new: true });

    if (!updatedClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json({ message: 'Class updated successfully', class: updatedClass });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update class' });
  }
});

// end add-edit class

// GET all class details to the  forms
app.get('/api/classes', async (req, res) => {
  try {
    const classes = await Class.find().sort({ grade: 1, className: 1 }); // Optional: sort for better UI
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch classes' });
  }
});






// Define User schema and model for "users" collection
//const userSchema = new mongoose.Schema({
  //name: String,
  //pass: String
//});
//const User = mongoose.model('User', userSchema, 'users');

const attendanceSchema = new mongoose.Schema({
  classDate: String,
  grade: String,
  records: [
    {
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
      },
      status: String
    }
  ]
});

const Attendance = mongoose.model('Attendance', attendanceSchema, 'attendance');


// Define  schema and model for "students" collection

const studentSchema = new mongoose.Schema({
  fullName: String,
  dob: String,
  gender: String,
  email: String,
  phone: String,
  grade: String,
  address: String
});


const Student = mongoose.model('Student', studentSchema, 'students');

app.post('/register-student', async (req, res) => {
  try {
    const newStudent = new Student(req.body);
    await newStudent.save();
    res.send('Student registered successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to register student');
  }
});

// define second student schema

// Define Student schema
const studentNewSchema = new mongoose.Schema({
  studentId: { type: String, unique: true },
  fullName: String,
  dob: String,
  gender: String,
  email: String,
  phone: String,
  grade: String,
  address: String,
});

studentNewSchema.pre('save', async function (next) {
  try {
    if (this.studentId) return next();

    const lastStudent = await this.constructor.findOne().sort({ _id: -1 }).exec();

    let nextIdNum = 1;

    if (lastStudent && lastStudent.studentId) {
      const lastNum = parseInt(lastStudent.studentId.replace('STD', ''), 10);
      if (!isNaN(lastNum)) {
        nextIdNum = lastNum + 1;
      }
    }

    this.studentId = 'STD' + nextIdNum.toString().padStart(3, '0');

    next();
  } catch (err) {
    next(err);
  }
});

const StudentNew = mongoose.models.StudentNew || mongoose.model('StudentNew', studentNewSchema, 'students_new');

//export default StudentNew;
//*************************************************** */


//student reg 2nd
const studentSchema1 = new mongoose.Schema({
  studentId: { type: String, unique: true },
  fullName: String,
  dob: String,
  gender: String,
  email: String,
  phone: String,
  grade: String,
  address: String,
});

// Auto-generate student ID before saving
studentSchema1.pre('save', async function (next) {
  if (this.studentId) return next();

  const lastStudent = await this.constructor.findOne().sort({ _id: -1 });
  let nextId = 1;

  if (lastStudent && lastStudent.studentId) {
    const lastNum = parseInt(lastStudent.studentId.replace('STD', ''));
    nextId = lastNum + 1;
  }

  this.studentId = 'STD' + String(nextId).padStart(3, '0');
  next();
});

const Student1 = mongoose.model('Student11', studentSchema1);



app.post('/register-student-new1', async (req, res) => {
  try {
    const newStudent = new Student1(req.body);
    await newStudent.save();

    res.json({
      message: 'Student registered successfully!',
      studentNumber: newStudent.studentId  // This must be sent!
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to register student' });
  }
});



//end student reg 2nd
//******************************************** */
// search student 
// Assuming you have a Mongoose model called Student1 or similar (adjust as needed)
app.get('/api/student/:studentId', async (req, res) => {
  const studentId = req.params.studentId;

  try {
    const student = await Student1.findOne({ studentId: studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (err) {
    console.error('Error fetching student:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

//end serach student

//************************************************************* */

//make student table


const attendanceSchema2 = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student11', 
    required: true 
  },
  date: { 
    type: String, 
    required: true, 
    default: () => new Date().toISOString().slice(0, 10) // auto set YYYY-MM-DD
  },
  present: { 
    type: Boolean, 
    required: true 
  }
});


const Attendence_new = mongoose.model('Attendence_new', attendanceSchema2);
//attendece new


app.get('/api/students1', async (req, res) => {
  const grade = req.query.grade;
  const students = await Student1.find({ grade });
  res.json(students);
});



app.post('/api/attendance_new1', async (req, res) => {
  try {
    const { date, attendance } = req.body;  // fix variable name here

    if (!date || !Array.isArray(attendance)) {
      return res.status(400).json({ error: 'Invalid attendance data' });
    }

    await Promise.all(attendance.map(async ({ studentId, present }) => {
      await Attendence_new.findOneAndUpdate(
        { studentId, date },
        { studentId, date, present },
        { upsert: true, new: true }
      );
    }));

    res.json({ message: 'Attendance saved successfully' });
  } catch (err) {
    console.error('Attendance save error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


//end attendence new
//************************************************************ */
//start attendence_insert/update new
// 1. Get all students by grade
app.get('/api/students2', async (req, res) => {
  const { grade } = req.query;
  try {
    const students = await Student1.find({ grade });
    res.json(students);
  } catch (err) {
    console.error('Error fetching /api/students2:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});
app.get('/api/attendance_new2', async (req, res) => {
  const { grade, date } = req.query;
  try {
    // Use Student1, not Student
    const students = await Student1.find({ grade });
    const studentIds = students.map(s => s._id);

    // Query from Attendence_new (not Attendance)
    const records = await Attendence_new.find({
      studentId: { $in: studentIds },
      date
    });

    res.json(records);
  } catch (err) {
    console.error('Error loading attendance:', err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});




// 3. Save or update attendance
app.post('/api/attendance_new5', async (req, res) => {
  const { date, grade, attendance } = req.body;

  try {
    // Remove existing records for this grade + date
    const students = await Student.find({ grade });
    const studentIds = students.map(s => s._id.toString());
    await Attendance.deleteMany({ grade, date, studentId: { $in: studentIds } });

    // Insert new records
    const newRecords = attendance.map(entry => ({
      studentId: entry.studentId,
      date,
      grade,
      present: entry.present
    }));

    await Attendance.insertMany(newRecords);

    res.json({ message: 'Attendance saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save attendance' });
  }
});


//correct insert and upsate atten
app.post('/api/attendance_new6', async (req, res) => {
  const { date, grade, attendance } = req.body;

  try {
    
    const students = await Student1.find({ grade });
    const studentIds = students.map(s => s._id.toString());
    
    await Attendence_new.deleteMany({
      studentId: { $in: studentIds },
      date
    });
    
    const newRecords = attendance.map(entry => ({
      studentId: entry.studentId,
      date,
      present: entry.present
    }));

    await Attendence_new.insertMany(newRecords);

    res.json({ message: 'Attendance saved successfully' });
  } catch (err) {
    console.error('Attendance save error:', err);
    res.status(500).json({ error: 'Failed to save attendance' });
  }
});



//end attendence_insert/update new
//************************************************************ */
//dashboard attendence details
app.get('/api/attendance-summary_new', async (req, res) => {
  try {
    // Total number of students
    const totalStudents = await Student1.countDocuments();

    // Today's date in 'YYYY-MM-DD' format
    const today = new Date().toISOString().split('T')[0];

    // Get all attendance records for today
    const attendancesToday = await Attendence_new.find({ date: today });

    // Count present and absent directly from docs
    let presentCount = 0;
    let absentCount = 0;

    attendancesToday.forEach(attendance => {
      if (attendance.present === true) presentCount++;
      else if (attendance.present === false) absentCount++;
    });

    // Count missing students with no attendance record today as absent
    const recordedCount = presentCount + absentCount;
    if (totalStudents > recordedCount) {
      absentCount += (totalStudents - recordedCount);
    }
   
    res.json({ totalStudents, presentCount, absentCount });

  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ message: 'Error fetching attendance summary' });
  }

  
  
});

//end attendence in dshboard
//grade wise attedence in dashboard recorrect
app.get('/api/attendance-summary-gradewise1', async (req, res) => {
  try {
    // Get today's start and end
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Get total students per grade
    const totalByGrade = await Student1.aggregate([
      {
        $group: {
          _id: "$grade",
          totalStudents: { $sum: 1 }
        }
      }
    ]);

    // 2. Get attendance records for today
    const attendanceRecords = await Attendence_new.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
      {
        $lookup: {
          from: "student11s",
          localField: "studentId",
          foreignField: "studentId",
          as: "student"
        }
      },
      { $unwind: "$student" }
    ]);

attendanceRecords.forEach(record => {
  console.log("Record:", record);
});


    // 3. Initialize result object
    const result = {};
    totalByGrade.forEach(({ _id: grade, totalStudents }) => {
      result[grade] = { totalStudents, present: 0, absent: 0 };
    });

    // 4. Count present students per grade
    attendanceRecords.forEach(record => {
      const grade = record.student.grade;
      if (!result[grade]) result[grade] = { totalStudents: 0, present: 0, absent: 0 };

      const isPresent = (record.present === true || record.present === "true" || record.present === 1);
      if (isPresent) {
        result[grade].present += 1;
      }
    });

    // 5. Calculate absent students per grade
    for (const grade in result) {
      result[grade].absent = result[grade].totalStudents - result[grade].present;
    }

    res.json(result);

  } catch (error) {
    console.error('Error fetching grade-wise summary:', error);
    res.status(500).json({ message: 'Error fetching attendance summary' });
  }
});
//************************************** */
// get present count for dashboard 3



app.get('/api/attendance-summary-gradewise3', async (req, res) => {
    try {
    //  Today's date
    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch students
    const students = await Student1.find({});

    //  Fetch classes and create gradeId → className map
    const classes = await Class.find({});
    const classMap = {};
    classes.forEach(c => {
      classMap[c._id.toString()] = c.className;
    });

    //  Initialize result object
    const result = {}; // { className: { total, present, absent } }
    students.forEach(stu => {
      const className = classMap[stu.grade.toString()] || "Unknown";
      if (!result[className]) result[className] = { total: 0, present: 0, absent: 0 };
      result[className].total += 1;
    });

    //  Fetch today's attendance
    const todayAttendance = await Attendence_new.find({ date: todayStr });

    //  Count present per class
    todayAttendance.forEach(att => {
      const student = students.find(s => s._id.toString() === att.studentId.toString());
      if (!student) return;
      const className = classMap[student.grade.toString()] || "Unknown";
      if (att.present) result[className].present += 1;
    });

    //  Calculate absent per class
    for (const className in result) {
      result[className].absent = result[className].total - result[className].present;
    }

    // Filter to only classes with at least 1 present
    const filteredResult = {};
    for (const className in result) {
      if (result[className].present > 0) {
        filteredResult[className] = result[className];
      }
    }

    res.json(filteredResult);

  } catch (err) {
    console.error("Error fetching grade-wise attendance:", err);
    res.status(500).json({ message: "Error fetching grade-wise attendance" });
  }
});


/////************************************ */


// end gradewise attendence dashbord

app.get('/api/attendance-summary-gradewise', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Total students per grade
    const totalByGrade = await Student1.aggregate([
      { $group: { _id: "$grade", totalStudents: { $sum: 1 } } }
    ]);

    // Attendance today with student info
    const attendanceRecords = await Attendence_new.aggregate([
      { $match: { date: today } },
      {
        $lookup: {
          from: "student11s",        // Mongoose collection
          localField: "studentId",
          foreignField: "studentId",
          as: "student"
        }
      },
      { $unwind: "$student" }
    ]);

    const result = {};
    totalByGrade.forEach(({ _id, totalStudents }) => {
      result[_id] = { totalStudents, present: 0, absent: 0 };
    });

    // Count present/absent per grade
    attendanceRecords.forEach(record => {
      const grade = record.student.grade;
      if (!result[grade]) result[grade] = { totalStudents: 0, present: 0, absent: 0 };
      if (record.present) {
        result[grade].present += 1;
      } else {
        result[grade].absent += 1;
      }
    });

    // Any students without attendance today are considered absent
    for (const grade in result) {
      const recorded = result[grade].present + result[grade].absent;
      const missing = result[grade].totalStudents - recorded;
      if (missing > 0) result[grade].absent += missing;
    }

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching attendance summary' });
  }
});




// gradewise attendence in dashboard
app.get('/api/attendance-summary-gradewise', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Get total students per grade
    const totalByGrade = await Student1.aggregate([
      {
        $group: {
          _id: "$grade",
          totalStudents: { $sum: 1 }
        }
      }
    ]);

    // 2. Get attendance records with student info using custom studentId (string)
    const attendanceByGrade = await Attendence_new.aggregate([
      { $match: { date: today } },
      {
        $lookup: {
          from: "student11s",                 // Mongoose collection name
          localField: "studentId",            // from Attendence_new
          foreignField: "studentId",          // from Student1
          as: "student"
        }
      },
      { $unwind: "$student" },
      {
        $group: {
          _id: {
            grade: "$student.grade",
            present: "$present"
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // 3. Prepare result
    const result = {};
    totalByGrade.forEach(({ _id: grade, totalStudents }) => {
      result[grade] = { totalStudents, present: 0, absent: 0 };
    });

    // 4. Fill present/absent counts
    attendanceByGrade.forEach(({ _id: { grade, present }, count }) => {
      if (!result[grade]) {
        result[grade] = { totalStudents: 0, present: 0, absent: 0 };
      }
      if (present === true) {
        result[grade].present += count;
      } else if (present === false) {
        result[grade].absent += count;
      }
    });

    // 5. Add missing students as absent
    for (const grade in result) {
      const recorded = result[grade].present + result[grade].absent;
      if (result[grade].totalStudents > recorded) {
        result[grade].absent += result[grade].totalStudents - recorded;
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching grade-wise summary:', error);
    res.status(500).json({ message: 'Error fetching attendance summary' });
  }
});





//end gradewise attendecnce in dashboard
// Route: Get today’s present students by grade

app.get('/api/attendance/today/gradewise', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const stats = await Attendence_new.aggregate([
      {
        $match: { date: today, present: true } // today's present students
      },
      {
        $lookup: {
          from: 'student11s',            // your students collection
          localField: 'studentId',       // ObjectId in attendance
          foreignField: '_id',           // ObjectId in students
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $group: {
          _id: '$student.grade',         // group by grade from student
          presentCount: { $sum: 1 }     // count present students
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(stats);

  } catch (err) {
    console.error("Error fetching today's grade-wise attendance:", err);
    res.status(500).json({ message: 'Failed to fetch grade-wise attendance' });
  }
});

//************************************************************ */
app.get('/api/attendance/today/gradewise2', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate()+1);

    // Fetch today's attendance with student and class info
    const todayAttendance = await Attendence_new.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate({
      path: 'studentId',
      select: 'fullName grade',
      populate: { path: 'grade', select: 'className grade' } // populate class info
    });

    const result = {};

    todayAttendance.forEach(a => {
      if (!a.studentId || !a.studentId.grade) return;

      const className = a.studentId.grade.className;

      if (!result[className]) {
        result[className] = { totalStudents: 0, present: 0, absent: 0 };
      }

      result[className].totalStudents += 1;
      if (a.present) result[className].present += 1;
      else result[className].absent += 1;
    });

    res.json(result);

  } catch (err) {
    console.error("Error fetching grade-wise attendance:", err);
    res.status(500).json({ message: "Error fetching grade-wise attendance" });
  }
});










//end dashboard attenedence details
//********************************************* */
//end econd student schema
app.post('/register-student-new', async (req, res) => {
  try {
    const newStudent = new StudentNew(req.body);
    await newStudent.save();
    res.json({
      message: 'Student registered successfully!',
      studentNumber: newStudent.studentId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to register student' });
  }
});

// POST route to register new user
app.post('/register-user', async (req, res) => {
  const { name, pass } = req.body;
  try {
    const newUser = new User({ name, pass });
    await newUser.save();
    res.send('Student registered successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to register student');
  }
});

//

//attendance
app.post('/submit-attendance', async (req, res) => {
  try {
    const { date, grade, records } = req.body;

    if (!date || !grade || !records || !Array.isArray(records)) {
      return res.status(400).send('Invalid attendance data');
    }

    const newAttendance = new Attendance({
      classDate: date,
      grade,
      records
    });

    await newAttendance.save();
    res.send('Attendance submitted successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to save attendance');
  }
});

//

// GET route to get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get users' });
  }
});

// get User count

app.get('/api/students/count', async (req, res) => {
  try {
    const count = await Student.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get student count' });
  }
});

// GET route to get all users
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get users' });
  }
});
// Return students filtered by grade (for attendance page)
app.get('/api/students/by-grade', async (req, res) => {
  try {
    const grade = req.query.grade;
    if (!grade) {
      return res.status(400).json({ message: 'Grade parameter required' });
    }
    const students = await Student.find({ grade });
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get students by grade' });
  }
});

// Get attendance report by date and grade
app.get('/api/attendance-report', async (req, res) => {
  try {
    const { date, grade } = req.query;
    if (!date || !grade) {
      return res.status(400).json({ message: 'Date and grade required' });
    }

    // Find attendance doc for date + grade, populate student names
    const attendance = await Attendance.findOne({ classDate: date, grade }).populate('records.studentId', 'fullName');

    if (!attendance) {
      return res.json({ records: [] }); // no attendance found
    }

    // Format records for response
    const reportRecords = attendance.records.map(r => ({
      studentName: r.studentId.fullName,
      status: r.status,
    }));

    res.json({ records: reportRecords });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
//end attendace report

//student attendance report
app.get('/api/attendance', async (req, res) => {
  try {
    const { date, grade } = req.query;

    if (!date) return res.status(400).json({ message: 'Date required' });

    const filter = { classDate: date };
    if (grade) filter.grade = grade;

    const attendance = await Attendance.findOne(filter).populate('records.studentId');

    if (!attendance) return res.json({ present: [], absent: [] });

    const present = [];
    const absent = [];

    attendance.records.forEach(entry => {
      if (!entry.studentId) return;
      if (entry.status === 'present') present.push(entry.studentId.fullName);
      else if (entry.status === 'absent') absent.push(entry.studentId.fullName);
    });

    res.json({ present, absent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get attendance report' });
  }
});
//end attendence report

//on dashboard attenedence and all student summary
app.get('/api/attendance-summary', async (req, res) => {
  try {
    // Get today's date as YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // Count total students
    const totalStudents = await Student1.countDocuments();

    // Aggregate unique attendance records for today
    const records = await Attendance.aggregate([
      { $match: { classDate: today } },
      { $unwind: "$records" },
      { $group: {
        _id: "$records.studentId",       // Group by studentId to avoid duplicates
        status: { $first: "$records.status" }  // Get their attendance status
      }}
    ]);

    let presentCount = 0;
    let absentCount = 0;

    records.forEach(r => {
      if (r.status === 'present') presentCount++;
      else if (r.status === 'absent') absentCount++;
    });

    // Students without attendance records are considered absent (optional)
    const recordedCount = presentCount + absentCount;
    if (totalStudents > recordedCount) {
      absentCount += totalStudents - recordedCount;
    }

    // Send JSON response
    res.json({ totalStudents, presentCount, absentCount });

  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ message: 'Error fetching attendance summary' });
  }
});






//end dashboard no of students summary

//update attendance
// Update or create attendance for a given date and grade
// Update or create attendance for a given date and grade
app.post('/api/attendance-update', async (req, res) => {
  try {
    const { classDate, grade, records } = req.body;

    // Basic validation
    if (!classDate || !grade || !records || !Array.isArray(records)) {
      return res.status(400).send('Invalid attendance data');
    }

    // Find existing attendance doc by date + grade
    let attendance = await Attendance.findOne({ classDate, grade });

    if (!attendance) {
      // If not found, create new attendance document
      attendance = new Attendance({
        classDate,
        grade,
        records
      });
    } else {
      // If found, update records array completely with new data
      attendance.records = records;
    }

    // Save the document
    await attendance.save();

    res.send('Attendance updated successfully!');
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to update attendance');
  }
});


//end update attendance

//***************************************************************** */
//start std_payment_attendence mark
const paymentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student11' },
  date: {type: Date },
   month: { type: String, required: true }, 
  amount: Number
});
const Payment = mongoose.model('Payment', paymentSchema);

// Get student by studentId
app.get('/api/student/:studentId', async (req, res) => {
  try {
    const student = await Student1.findOne({ studentId: req.params.studentId });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


//student details display with monthlyfee
// Get student by studentId, fetch monthlyFee from class _id
app.get('/api/student100/:studentId', async (req, res) => {
  try {
    // Find student
    const student = await Student1.findOne({ studentId: req.params.studentId });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // 
    const classData = await Class.findById(student.grade).select('monthlyFee className grade');
    if (!classData) return res.status(404).json({ message: 'Class not found' });

    // Send combined data
    res.json({
      _id: student._id,
      studentId: student.studentId,
      fullName: student.fullName,
      grade: classData.grade, // optional: show grade name
      className: classData.className, // optional: show class name
      phone: student.phone,
      email: student.email,
      monthlyFee: classData.monthlyFee
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});



//end stuent details display with monthly fee

// Save individual attendance
app.post('/api/individual-attendance', async (req, res) => {
  try {
    const { studentId, present } = req.body;

    if (!studentId || present === undefined) {
      return res.status(400).json({ message: "Student ID and present status are required" });
    }

    // Automatically set date to today in YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10);

    // Update existing record or create new one
    const attendance = await Attendence_new.findOneAndUpdate(
      { studentId, date: today },          // search by student + today
      { studentId, date: today, present }, // update/create
      { upsert: true, new: true }          // insert if missing, return new doc
    );

    res.json({ message: 'Attendance recorded', attendance });
  } catch (err) {
    console.error("Failed to save attendance:", err);
    res.status(500).json({ message: 'Failed to save attendance', error: err.message });
  }
});


// Save payment
app.post('/api/payment', async (req, res) => {
  const { studentId, date, amount } = req.body;
  try {
    const payment = new Payment({ studentId, date, amount });
    await payment.save();
    res.json({ message: 'Payment recorded' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save payment' });
  }
});


//attendncehistory
app.get('/api/attendance-history/:studentId', async (req, res) => {
  const studentId = req.params.studentId;
  try {
    const records = await Attendence_new.find({ studentId }).sort({ date: -1 });
    res.json(records); // Each record contains: { studentId, date, present }
  } catch (err) {
    res.status(500).json({ message: 'Failed to get attendance history' });
  }
});

//payment history
app.get('/api/payment-history/:studentId', async (req, res) => {
  const studentId = req.params.studentId;
  try {
    const records = await Payment.find({ studentId }).sort({ date: -1 });
    res.json(records); // Each record: { studentId, date, amount }
  } catch (err) {
    res.status(500).json({ message: 'Failed to get payment history' });
  }
});



//end std_payment_attendence mark

//class create scema



//end class create
// need check this
//start search student 07-29
app.get('/api/students/byNumber/:studentId', async (req, res) => {
  try {
    const student = await Student1.findOne({ studentId: req.params.studentId });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

//end search std

//update std 07
app.put('/api/students/:studentId', async (req, res) => {
  try {
    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedStudent) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student updated successfully', student: updatedStudent });
  } catch (err) {
    res.status(500).json({ message: 'Update failed' });
  }
});


//end update std


//start std_search_update
//find std using id
app.get('/api/std/byNumber/:studentId', async (req, res) => {
  const stuNum = req.params.studentId.trim();
  const student = await Student1.findOne({ studentId: stuNum });
  if (!student) return res.status(404).json({ message: 'Student not found' });
  res.json(student);
});

//update std
app.put('/api/std/:studentId', async (req, res) => {
  try {
    const updated = await Student1.findByIdAndUpdate(req.params.studentId, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Student not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Update failed' });
  }
});

//end std_search_update

// start payment records between two days


// Get payments between two dates
app.get('/api/payments/report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) 
      return res.status(400).json({ message: 'Start and End dates are required' });

    // Get payments with populated student info
    const payments = await Payment.find({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('studentId', 'studentId fullName grade'); // grade here is likely class _id

    // Map payments to include class info
    const result = await Promise.all(payments.map(async p => {
      let classData = null;
      if (p.studentId?.grade) {
        // Find class by _id stored in student.grade
        classData = await Class.findById(p.studentId.grade).select('grade className');
      }
      return {
        studentId: p.studentId?.studentId || '',
        fullName: p.studentId?.fullName || '',
        grade: classData ? classData.grade : '',
        className: classData ? classData.className : '',
        amount: p.amount,
        date: p.date.toISOString().split('T')[0]
      };
    }));

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Export payments to Excel

app.get('/api/payments/report/excel', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) 
      return res.status(400).json({ message: 'Start and End dates are required' });

    // Fetch payments with student info
    const payments = await Payment.find({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('studentId', 'studentId fullName grade'); // student.grade is class _id

    // Prepare Excel data with class info
    const reportData = await Promise.all(payments.map(async p => {
      let classData = null;
      if (p.studentId?.grade) {
        classData = await Class.findById(p.studentId.grade).select('grade className');
      }
      return {
        studentId: p.studentId?.studentId || '',
        fullName: p.studentId?.fullName || '',
        grade: classData ? classData.grade : '',
        className: classData ? classData.className : '',
        amount: p.amount,
        date: p.date.toISOString().split('T')[0]
      };
    }));

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payments Report');

    // Add header row
    worksheet.addRow(['Student ID', 'Full Name', 'Grade', 'Class Name', 'Amount', 'Date']);

    // Add data rows
    reportData.forEach(row => {
      worksheet.addRow([row.studentId, row.fullName, row.grade, row.className, row.amount, row.date]);
    });

    // Set response headers for download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=payments_report.xlsx');

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// end payment records between two days

//start student payment and attenence history report
// display report
app.get('/api/student-report/json/:studentId', async (req, res) => {
  const { studentId } = req.params;
  try {
    const student = await Student1.findOne({ studentId });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Attendance & Payments
    const attendances = await Attendence_new.find({ studentId: student._id });
    const payments = await Payment.find({ studentId: student._id, amount: { $gt: 0 } }); // only positive payments

    // Group by month
    const report = {};
    const formatMonth = (dateStr) => {
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
    };
    const formatDate = (dateStr) => new Date(dateStr).toISOString().split('T')[0];

    attendances.forEach(a => {
      const month = formatMonth(a.date);
      if (!report[month]) report[month] = { attendance: [], payments: [] };
      report[month].attendance.push({ date: formatDate(a.date), present: a.present });
    });

    payments.forEach(p => {
      const month = formatMonth(p.date);
      if (!report[month]) report[month] = { attendance: [], payments: [] };
      report[month].payments.push({ date: formatDate(p.date), amount: p.amount });
    });

    res.json(report);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// export to excel

app.get('/api/student-report/excel/:studentId', async (req, res) => {
  const { studentId } = req.params;
  try {
    const student = await Student1.findOne({ studentId });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const attendances = await Attendence_new.find({ studentId: student._id });
    const payments = await Payment.find({ studentId: student._id, amount: { $gt: 0 } });

    const report = {};
    const formatMonth = (dateStr) => {
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
    };
    const formatDate = (dateStr) => new Date(dateStr).toISOString().split('T')[0];

    attendances.forEach(a => {
      const month = formatMonth(a.date);
      if (!report[month]) report[month] = { attendance: [], payments: [] };
      report[month].attendance.push({ date: formatDate(a.date), present: a.present });
    });

    payments.forEach(p => {
      const month = formatMonth(p.date);
      if (!report[month]) report[month] = { attendance: [], payments: [] };
      report[month].payments.push({ date: formatDate(p.date), amount: p.amount });
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    worksheet.columns = [
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Attendance (Present/Absent)', key: 'attendance', width: 50 },
      { header: 'Payments (Date & Amount)', key: 'payments', width: 50 }
    ];

    for (const month in report) {
      const attendanceStr = report[month].attendance.map(a => `${a.date} (${a.present ? 'Present' : 'Absent'})`).join(', ');
      const paymentsStr = report[month].payments.map(p => `${p.date} (${p.amount})`).join(', ');

      worksheet.addRow({
        month,
        attendance: attendanceStr,
        payments: paymentsStr
      });
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${studentId}_report.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

//end  student payment and attenence history report


//start dashboard chart

// end dashboard chart

// start payment_report between 2days and grade



app.get('/api/payments/report_gradewise', async (req, res) => {
  try {
    const { grade, startDate, endDate } = req.query;

    if (!grade) return res.status(400).json({ message: 'Grade is required' });
    if (!startDate || !endDate) return res.status(400).json({ message: 'Start and End dates are required' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    
    const classData = await Class.findById(grade);
    if (!classData) return res.status(404).json({ message: 'Class not found' });

    //console.log("Selected grade id from frontend:", grade);
    //console.log("Class found:", classData);

   
    const students = await Student1.find({ grade: classData._id }); // grade stores class _id
    const studentIds = students.map(s => s._id);
    if (!studentIds.length) return res.json([]); // no students

   
//console.log("Students in this class:", students);




    const payments = await Payment.find({
      studentId: { $in: studentIds },
      date: { $gte: start, $lte: end }
    }).populate('studentId');


    const result = payments.map(p => ({
      studentNo: p.studentId.studentId,
      name: p.studentId.fullName,
      grade: classData.grade,
      className: classData.className,
      amount: p.amount,
      date: p.date.toISOString().split('T')[0]
    }));

   //console.log(result);


    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});



//gradewise excel report

// Export Payments to Excel (Grade-wise between dates)
app.get('/api/payments/report_gradewise/excel', async (req, res) => {
  try {
    const { grade, startDate, endDate } = req.query;

    if (!grade || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

   
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

   
    const classData = await Class.findById(grade);
    if (!classData) return res.status(404).json({ message: "Class not found" });

  
    const students = await Student1.find({ grade: classData._id });
    const studentIds = students.map(s => s._id);
    if (!studentIds.length) return res.status(404).json({ message: "No students in this class" });

   
    const payments = await Payment.find({
      studentId: { $in: studentIds },
      date: { $gte: start, $lte: end }
    })
 .populate("studentId", "studentId fullName")
    .lean();

    if (!payments.length) return res.status(404).json({ message: "No records found" });

    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Payments Report");

    worksheet.columns = [
      { header: "Student No", key: "studentNo", width: 15 },
      { header: "Name", key: "name", width: 25 },
      { header: "Grade", key: "grade", width: 10 },
      { header: "Class", key: "className", width: 20 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Date", key: "date", width: 20 },
    ];

    payments.forEach((p) => {
      worksheet.addRow({
        studentNo: p.studentId?.studentId || "",
        name: p.studentId?.fullName || "",
        grade: classData.grade,
        className: classData.className,
        amount: p.amount,
        date: new Date(p.date).toLocaleDateString(),
      });
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDCE6F1" },
      };
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=payment_report_${startDate}_to_${endDate}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Excel Export Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});



// end grade wise excel report

//view all students
// Get all students
app.get("/api/students", async (req, res) => {
  try {
    const students = await Student1.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Register new student
app.post("/api/students", async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update student by ID
app.put("/api/students/:id", async (req, res) => {
  try {
    const updatedStudent = await Student1.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedStudent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

//end view all students
//****************************************** */



// =============================
// Reports: Daily, Monthly, Yearly (Summary)
// =============================
app.get("/api/payments/report-summary", async (req, res) => {
  try {
    const { type } = req.query; // daily, monthly, yearly
    let groupId = null;

    if (type === "daily") {
      groupId = { year: { $year: "$date" }, month: { $month: "$date" }, day: { $dayOfMonth: "$date" } };
    } else if (type === "monthly") {
      groupId = { year: { $year: "$date" }, month: { $month: "$date" } };
    } else if (type === "yearly") {
      groupId = { year: { $year: "$date" } };
    } else {
      return res.status(400).json({ message: "Invalid type. Use daily, monthly, or yearly" });
    }

    const report = await Payment.aggregate([
      {
        $group: {
          _id: groupId,
          totalCollected: { $sum: "$amount" },
          studentsPaid: { $addToSet: "$studentId" }
        }
      },
      {
        $project: {
          _id: 0,
          period: "$_id",
          totalCollected: 1,
          studentCount: { $size: "$studentsPaid" }
        }
      },
      { $sort: { "period.year": -1, "period.month": -1, "period.day": -1 } }
    ]);

    res.json(report);
  } catch (err) {
    console.error("Payment summary error:", err);
    res.status(500).json({ message: err.message });
  }
});

//***************************************************** */
//dashboard today's total collected


// Route to get total payments collected today
app.get('/api/payments/today/total', async (req, res) => {
  try {
    // Get today's start and end times
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Fetch payments for today
    const paymentsToday = await Payment.find({
      date: { $gte: start, $lte: end }
    });

    // Calculate total amount
    const totalAmount = paymentsToday.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      date: today.toISOString().split('T')[0],
      totalAmount,
      totalPayments: paymentsToday.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch today’s payments' });
  }
});
/*********************************************************************** */
//student_payment page 
// ------------------ Get student payment & attendance info ------------------
app.get('/api/student/payment-history/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find student
    const student = await Student1.findOne({ studentId });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Class info
    const studentClass = await Class.findById(student.grade);
    const monthlyFee = studentClass ? studentClass.monthlyFee : 0;

    // Attendance records
    const attendanceRecords = await Attendence_new.find({ studentId: student._id });

    // Attendance summary per month
    const attendanceSummary = {};
    attendanceRecords.forEach(rec => {
      if (!rec.present) return; // only consider present days
      const dateObj = new Date(rec.date);
      const monthKey = dateObj.toISOString().slice(0,7); // YYYY-MM
      if (!attendanceSummary[monthKey]) attendanceSummary[monthKey] = { present: 0, totalDays: 0, presentDates: [] };
      attendanceSummary[monthKey].present += 1;
      attendanceSummary[monthKey].presentDates.push(dateObj.toISOString().slice(0,10));
      attendanceSummary[monthKey].totalDays += 1;
    });

    // Payments
    const payments = await Payment.find({ studentId: student._id });

    // Calculate paid and pending per month
    const pending = {};
    const paid = {};
    for (const month in attendanceSummary) {
      const monthPaid = payments
        .filter(p => p.month === month)
        .reduce((sum,p) => sum + p.amount, 0);

      pending[month] = Math.max(monthlyFee - monthPaid, 0);
      paid[month] = monthPaid;
    }

    // Total pending and total paid
    const totalPending = Object.values(pending).reduce((a,b)=>a+b,0);
    const totalPaid = Object.values(paid).reduce((a,b)=>a+b,0);

    res.json({
      student,
      studentClass,
      monthlyFee,
      attendanceSummary,
      payments,
      pending,
      paid,
      totalPending,
      totalPaid
    });

  } catch (error) {
    console.error('Error fetching student', error);
    res.status(500).json({ message: 'Error fetching student', error: error.message });
  }
});

// ------------------ Add Payment ------------------
// POST route for adding a payment
app.post('/api/payment/add', async (req, res) => {
  try {
    const { studentId, amount, month } = req.body;

    if (!studentId || !amount || !month) {
      return res.status(400).json({ message: "Student ID, amount, and month are required" });
    }

    // Use studentId from request body
    const student = await Student1.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const payment = new Payment({
      studentId: student._id,
      amount,
      month,        // YYYY-MM
      date: new Date()
    });
console.log(payment);
    await payment.save();
    res.json({ message: "Payment saved successfully", payment });

  } catch (err) {
    console.error("Error saving payment:", err);
    res.status(500).json({ message: "Server error while adding payment", error: err.message });
  }
});









//end student payment page
//add payment for pay_std page
// Add payment for a student

//*********************************************** */
//mark student_attendence in std_pay1 page
// ================== STUDENT PAYMENT & ATTENDANCE ROUTES ==================

// Get student full info (payments + attendance summary)
app.get('/api/student/payment-history/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find student by studentId (e.g., STD001)
    const student = await Student1.findOne({ studentId });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Class info for monthly fee
    const studentClass = await Class.findById(student.grade);
    const monthlyFee = studentClass ? studentClass.monthlyFee : 0;

    // Attendance records
    const attendanceRecords = await Attendence_new.find({ studentId: student._id }).sort({ date: 1 });

    // Attendance summary per month
    const attendanceSummary = {};
    let allPresentDates = [];
    attendanceRecords.forEach(rec => {
      const dateObj = new Date(rec.date);
      const dateStr = dateObj.toISOString().slice(0, 10);
      const monthKey = dateObj.toISOString().slice(0, 7); // YYYY-MM

      if (!attendanceSummary[monthKey]) attendanceSummary[monthKey] = { present: 0, presentDates: [] };

      if (rec.present) {
        attendanceSummary[monthKey].present += 1;
        attendanceSummary[monthKey].presentDates.push(dateStr);
        allPresentDates.push(dateStr);
      }
    });

    // Payments
    const payments = await Payment.find({ studentId: student._id });

    // Calculate paid and pending per month
    const pending = {};
    const paid = {};
    for (const month in attendanceSummary) {
      const monthPaid = payments
        .filter(p => p.month === month)
        .reduce((sum, p) => sum + p.amount, 0);

      pending[month] = Math.max(monthlyFee - monthPaid, 0);
      paid[month] = monthPaid;
    }

    // Totals
    const totalPending = Object.values(pending).reduce((a, b) => a + b, 0);
    const totalPaid = Object.values(paid).reduce((a, b) => a + b, 0);

    res.json({
      student,
      monthlyFee,
      attendanceSummary,
      allPresentDates,
      totalPresentDays: allPresentDates.length,
      payments,
      pending,
      paid,
      totalPending,
      totalPaid
    });
  } catch (error) {
    console.error('Error fetching student', error);
    res.status(500).json({ message: 'Error fetching student', error: error.message });
  }
});

// ------------------ Add Payment ------------------
app.post('/api/payment/add', async (req, res) => {
  try {
    const { studentId, amount, month } = req.body;

    if (!studentId || !amount || !month) {
      return res.status(400).json({ message: "Student ID, amount, and month are required" });
    }

    // Use Mongo _id
    const student = await Student1.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const payment = new Payment({
      studentId: student._id,
      amount,
      month,        // YYYY-MM
      date: new Date()
    });

    await payment.save();
    res.json({ message: "Payment saved successfully", payment });
  } catch (err) {
    console.error("Error saving payment:", err);
    res.status(500).json({ message: "Server error while adding payment", error: err.message });
  }
});

//--------------add payment and check already paid for that month
app.post('/api/payment/add1', async (req, res) => {
  try {
    const { studentId, amount, month } = req.body;

    if (!studentId || !amount || !month) {
      return res.status(400).json({ message: "Student ID, amount, and month are required" });
    }

    // Use Mongo _id
    const student = await Student1.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    //Check if this student already paid for this month
    const existingPayment = await Payment.findOne({ studentId, month });
    if (existingPayment) {
      return res.status(400).json({ message: `Payment already exists for ${month}` });
    }

    // Save new payment if no duplicate found
    const payment = new Payment({
      studentId: student._id,
      amount,
      month,        // YYYY-MM
      date: new Date()
    });

    await payment.save();
    res.json({ message: "Payment saved successfully", payment });
  } catch (err) {
    console.error("Error saving payment:", err);
    res.status(500).json({ message: "Server error while adding payment", error: err.message });
  }
});

//--------------------------end add payment and check already paid for that month

// ------------------ Mark Attendance ------------------
app.post('/api/individual-attendance', async (req, res) => {
  try {
    const { studentId, present } = req.body;
    if (!studentId || present === undefined) {
      return res.status(400).json({ message: "Student ID and present status are required" });
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Check if record already exists for today
    let attendance = await Attendence_new.findOne({ studentId, date: today });

    if (attendance) {
      attendance.present = present;
      await attendance.save();
    } else {
      attendance = new Attendence_new({
        studentId,
        date: today,
        present
      });
      await attendance.save();
    }

    res.json({ message: "Attendance saved successfully", attendance });
  } catch (err) {
    console.error("Error saving attendance:", err);
    res.status(500).json({ message: "Error saving attendance", error: err.message });
  }
});

// ------------------ Attendance History ------------------
app.get('/api/attendance-history/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student1.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const records = await Attendence_new.find({ studentId }).sort({ date: 1 });
    res.json(records);
  } catch (err) {
    console.error("Error fetching attendance history:", err);
    res.status(500).json({ message: "Error fetching attendance history", error: err.message });
  }
});

//user login for e-learning
// ===================== Student Login ======================
app.post('/api/student/login', async (req, res) => {
  const { studentId, phone } = req.body;

  try {
    const student = await Student1.findOne({ studentId });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (student.phone !== phone) {
      return res.status(401).json({ success: false, message: "Incorrect phone number" });
    }

    res.json({
      success: true,
      message: "Login successful",
      student: {
        id: student._id,
        studentId: student.studentId,
        name: student.fullName,
        grade: student.grade
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});




//elarning system
// --------- QuizResult schema ----------
const quizResultSchema = new mongoose.Schema({
  studentId: { type: String, required: true },   // store student.studentId like "STD001"
  studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Student11' }, // optional Mongo ref
  quizId: { type: String },   // optional if you have multiple quizzes
  date: { type: Date, default: Date.now },
  score: Number,
  maxScore: Number,
  topicResults: [ // topic level details
    {
      topic: String,
      correct: Boolean
    }
  ],
  rawAnswers: mongoose.Schema.Types.Mixed
});

const QuizResult = mongoose.models.QuizResult || mongoose.model('QuizResult', quizResultSchema, 'quiz_results');

// --------- Route: handle quiz submit ----------
app.post('/api/quiz/submit', async (req, res) => {
});















//quiz
app.post('/api/ai_quiz_feedback', async (req, res) => {
  const { studentId, score } = req.body;

  let feedback = "";

  if (score === 3) {
    feedback = "Excellent! You have mastered this topic.";
  } else if (score === 2) {
    feedback = "Good! But revise the weak areas for improvement.";
  } else if (score === 1) {
    feedback = "You need more practice. Review the notes again.";
  } else {
    feedback = "You seem to be struggling. Start with basic lessons.";
  }

  res.json({
    studentId,
    score,
    feedback,
    recommendedMaterials: [
      { topic: "Binary Numbers", link: "/notes/binary_numbers.pdf" },
      { topic: "HTML Basics", link: "/notes/html_basics.pdf" }
    ]
  });
});



//quiz end
app.get('/api/ai/recommend/:studentId', async (req, res) => {
  const { studentId } = req.params;

  
  
  const exampleOutput = {
    studentId,
    weakTopics: ["Binary Numbers", "HTML Basics"],
    recommendedMaterials: [
      { topic: "Binary Numbers", link: "/notes/binary_numbers.pdf" },
      { topic: "HTML Basics", link: "/notes/html_basics.pdf" }
    ]
  };

  res.json(exampleOutput);
});
//ai-part in elearning

app.get('/api/ai_recommend/:studentId', async (req, res) => {
  const { studentId } = req.params;

  const exampleOutput = {
    studentId,
    weakTopics: ["Binary Numbers", "HTML Basics"],
    recommendedMaterials: [
      { topic: "Binary Numbers", link: "/notes/binary_numbers.pdf" },
      { topic: "HTML Basics", link: "/notes/html_basics.pdf" }
    ]
  };

  res.json(exampleOutput);
});




//********************************************** */
//call routes
//app.use("/api/payments", paymentRoutes);
app.use("/api/pending-payments1", createPendingPaymentsRoutes({ Student:Student1, Payment, Class }));
app.use("/api/students", createStudentRoutes({ Student: Student1, Payment,Class }));
app.use("/api/markstd", markstd({ Student: Student1, Payment,Class,Attendence_new }));
app.use("/api/attendencecancel", attendencecancel({Student1, Payment,Class,Attendence_new }));
app.use("/api/attendencecancereport", createAttendanceRoutes({Student1, Payment,Class,Attendence_new }));
app.use("/api/report_gen", createReportRoutes({Student1, Payment,Class,Attendence_new }));
app.use("/api/ai_r", createairoute({ Student1, Payment, Attendence_new, Class }));
//app.use("/api/airoutes", airoutes({ Student1, Payment, Attendence_new, Class }));
app.use("/api/ai", airoutes({ Student1, Payment, Attendence_new, Class }));
app.use("/api/users", userRoutes);
const dashboardRouter = createdashboardroute({ Student1, Payment, Attendence_new, Class });
app.use("/api/dashboard", dashboardRouter);
const mldataRouter = createMLDataRoute({ Student1, Attendence_new });
app.use("/api/ml-data", mldataRouter);

//ai genearte apis
//const gradeAIRoute = createAIGRRoute({  Student,  Attendance,  Payment,  Class,});
//app.use("/api/ai", gradeAIRoute);

const chatbotRoutes = (await import("./routes/chatbot_route.js")).default;
app.use("/api/chatbot", chatbotRoutes);


app.use("/api/ai-dashboard", aiRoutesdash({ Student1, Attendence_new }));

app.use('/api/ai_dash', createAiRoutes_dash({ Student1, Payment, Attendence_new, Class }));

app.use("/api/chatbot", chatbotR({ Student1, Attendence_new, Payment, Class }));

app.use("/api/quiz", quizRoute(Student1));

app.use("/api/pending-payments", pendingPaymentRoute({ Student1, Attendence_new, Payment, Class }));
//app.use("/api/activity", activityRoutes);



// serve uploaded files at /notes/filename.pdf
//app.use('/notes', express.static(path.join(process.cwd(), 'public', 'notes')));
//app.use('/api/notes', notesRoute);

//**************************************************** */,
//***************************************************************** */

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

//app.use(express.static("public"));


// Default route to serve your registration page (adjust filename as needed)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server started at port ${PORT}`);
});
