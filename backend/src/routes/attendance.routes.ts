import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { authenticate, isAdmin, isStaff } from '../middleware/auth.middleware';

const router = Router();
const attendanceController = new AttendanceController();

// All routes require authentication
router.use(authenticate);

// Attendance CRUD
router.get('/', isAdmin, attendanceController.getAllAttendance);
router.get('/my-attendance', isStaff, attendanceController.getMyAttendance);
router.get('/today', isAdmin, attendanceController.getTodayAttendance);
router.get('/report', isAdmin, attendanceController.getAttendanceReport);
router.get('/user/:userId', isAdmin, attendanceController.getUserAttendance);
router.post('/', isAdmin, attendanceController.markAttendance);
router.put('/:id', isAdmin, attendanceController.updateAttendance);
router.delete('/:id', isAdmin, attendanceController.deleteAttendance);

// Leave management
router.get('/leaves', isAdmin, attendanceController.getAllLeaves);
router.get('/leaves/my-leaves', isStaff, attendanceController.getMyLeaves);
router.post('/leaves', isStaff, attendanceController.applyLeave);
router.put('/leaves/:id/approve', isAdmin, attendanceController.approveLeave);
router.put('/leaves/:id/reject', isAdmin, attendanceController.rejectLeave);

export default router;
