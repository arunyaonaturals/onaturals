import { Response } from 'express';
import { query, queryOne, run } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class AttendanceController {
  getAllAttendance = async (req: AuthRequest, res: Response) => {
    try {
      const { user_id, start_date, end_date, status } = req.query;
      let sql = `SELECT a.*, u.name as user_name, u.email as user_email FROM attendance a INNER JOIN users u ON a.user_id = u.id WHERE 1=1`;
      const params: any[] = [];

      if (user_id) { sql += ' AND a.user_id = ?'; params.push(user_id); }
      if (start_date) { sql += ' AND a.date >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND a.date <= ?'; params.push(end_date); }
      if (status) { sql += ' AND a.status = ?'; params.push(status); }
      sql += ' ORDER BY a.date DESC, u.name';

      const attendance = await query(sql, params);
      res.json({ success: true, data: attendance });
    } catch (error) {
      console.error('Get all attendance error:', error);
      res.status(500).json({ success: false, message: 'Error fetching attendance' });
    }
  };

  getMyAttendance = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
      const { month, year } = req.query;

      let sql = 'SELECT * FROM attendance WHERE user_id = ?';
      const params: any[] = [req.user.id];

      if (month && year) {
        sql += " AND strftime('%m', date) = ? AND strftime('%Y', date) = ?";
        params.push(String(month).padStart(2, '0'), year);
      }
      sql += ' ORDER BY date DESC';

      const attendance = await query(sql, params);
      res.json({ success: true, data: attendance });
    } catch (error) {
      console.error('Get my attendance error:', error);
      res.status(500).json({ success: false, message: 'Error fetching attendance' });
    }
  };

  getTodayAttendance = async (req: AuthRequest, res: Response) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const attendance = await query(`SELECT a.*, u.name as user_name, u.email as user_email FROM attendance a
        INNER JOIN users u ON a.user_id = u.id WHERE a.date = ? ORDER BY u.name`, [today]);

      const usersWithoutAttendance = await query(`SELECT id, name, email FROM users WHERE is_active = 1 
        AND id NOT IN (SELECT user_id FROM attendance WHERE date = ?)`, [today]);

      res.json({ success: true, data: { marked: attendance, unmarked: usersWithoutAttendance } });
    } catch (error) {
      console.error('Get today attendance error:', error);
      res.status(500).json({ success: false, message: 'Error fetching today attendance' });
    }
  };

  getAttendanceReport = async (req: AuthRequest, res: Response) => {
    try {
      const { month, year } = req.query;
      if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year are required' });

      const report = await query(`
        SELECT u.id, u.name, u.email,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
          SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
          SUM(CASE WHEN a.status = 'half_day' THEN 1 ELSE 0 END) as half_days,
          SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) as leave_days
        FROM users u LEFT JOIN attendance a ON u.id = a.user_id 
          AND strftime('%m', a.date) = ? AND strftime('%Y', a.date) = ?
        WHERE u.is_active = 1 GROUP BY u.id, u.name, u.email ORDER BY u.name
      `, [String(month).padStart(2, '0'), year]);

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Get attendance report error:', error);
      res.status(500).json({ success: false, message: 'Error fetching attendance report' });
    }
  };

  getUserAttendance = async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { month, year } = req.query;

      let sql = 'SELECT * FROM attendance WHERE user_id = ?';
      const params: any[] = [userId];

      if (month && year) {
        sql += " AND strftime('%m', date) = ? AND strftime('%Y', date) = ?";
        params.push(String(month).padStart(2, '0'), year);
      }
      sql += ' ORDER BY date DESC';

      const attendance = await query(sql, params);
      res.json({ success: true, data: attendance });
    } catch (error) {
      console.error('Get user attendance error:', error);
      res.status(500).json({ success: false, message: 'Error fetching attendance' });
    }
  };

  markAttendance = async (req: AuthRequest, res: Response) => {
    try {
      const { user_id, date, status, check_in, check_out, notes } = req.body;
      if (!user_id || !date || !status) {
        return res.status(400).json({ success: false, message: 'User ID, date, and status are required' });
      }

      const existing = await queryOne('SELECT id FROM attendance WHERE user_id = ? AND date = ?', [user_id, date]);

      if (existing) {
        await run(`UPDATE attendance SET status = ?, check_in = COALESCE(?, check_in), 
          check_out = COALESCE(?, check_out), notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND date = ?`, [status, check_in, check_out, notes, user_id, date]);
        return res.json({ success: true, message: 'Attendance updated successfully' });
      }

      const result = await run('INSERT INTO attendance (user_id, date, status, check_in, check_out, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [user_id, date, status, check_in || null, check_out || null, notes || null]);

      res.status(201).json({ success: true, message: 'Attendance marked successfully', data: { id: result.lastInsertRowid } });
    } catch (error) {
      console.error('Mark attendance error:', error);
      res.status(500).json({ success: false, message: 'Error marking attendance' });
    }
  };

  updateAttendance = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, check_in, check_out, notes } = req.body;

      const existing = await queryOne('SELECT id FROM attendance WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Attendance record not found' });

      await run(`UPDATE attendance SET status = COALESCE(?, status), check_in = COALESCE(?, check_in),
        check_out = COALESCE(?, check_out), notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [status, check_in, check_out, notes, id]);

      res.json({ success: true, message: 'Attendance updated successfully' });
    } catch (error) {
      console.error('Update attendance error:', error);
      res.status(500).json({ success: false, message: 'Error updating attendance' });
    }
  };

  deleteAttendance = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await run('DELETE FROM attendance WHERE id = ?', [id]);
      res.json({ success: true, message: 'Attendance record deleted successfully' });
    } catch (error) {
      console.error('Delete attendance error:', error);
      res.status(500).json({ success: false, message: 'Error deleting attendance' });
    }
  };

  getAllLeaves = async (req: AuthRequest, res: Response) => {
    try {
      const { status, user_id } = req.query;
      let sql = `SELECT l.*, u.name as user_name, u.email as user_email FROM leaves l INNER JOIN users u ON l.user_id = u.id WHERE 1=1`;
      const params: any[] = [];

      if (status) { sql += ' AND l.status = ?'; params.push(status); }
      if (user_id) { sql += ' AND l.user_id = ?'; params.push(user_id); }
      sql += ' ORDER BY l.created_at DESC';

      const leaves = await query(sql, params);
      res.json({ success: true, data: leaves });
    } catch (error) {
      console.error('Get all leaves error:', error);
      res.status(500).json({ success: false, message: 'Error fetching leaves' });
    }
  };

  getMyLeaves = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
      const leaves = await query('SELECT * FROM leaves WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
      res.json({ success: true, data: leaves });
    } catch (error) {
      console.error('Get my leaves error:', error);
      res.status(500).json({ success: false, message: 'Error fetching leaves' });
    }
  };

  applyLeave = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
      const { leave_type, start_date, end_date, reason } = req.body;

      if (!leave_type || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'Leave type, start date, and end date are required' });
      }

      const result = await run('INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, leave_type, start_date, end_date, reason || null]);

      res.status(201).json({ success: true, message: 'Leave application submitted successfully', data: { id: result.lastInsertRowid } });
    } catch (error) {
      console.error('Apply leave error:', error);
      res.status(500).json({ success: false, message: 'Error applying for leave' });
    }
  };

  approveLeave = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await run("UPDATE leaves SET status = 'approved', approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);

      const leave = await queryOne('SELECT user_id, start_date, end_date FROM leaves WHERE id = ?', [id]);
      if (leave) {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const existing = await queryOne('SELECT id FROM attendance WHERE user_id = ? AND date = ?', [leave.user_id, dateStr]);
          if (existing) {
            await run("UPDATE attendance SET status = 'leave', notes = 'Approved leave' WHERE user_id = ? AND date = ?", [leave.user_id, dateStr]);
          } else {
            await run("INSERT INTO attendance (user_id, date, status, notes) VALUES (?, ?, 'leave', 'Approved leave')", [leave.user_id, dateStr]);
          }
        }
      }

      res.json({ success: true, message: 'Leave approved successfully' });
    } catch (error) {
      console.error('Approve leave error:', error);
      res.status(500).json({ success: false, message: 'Error approving leave' });
    }
  };

  rejectLeave = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;
      await run("UPDATE leaves SET status = 'rejected', rejection_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [rejection_reason || null, id]);
      res.json({ success: true, message: 'Leave rejected' });
    } catch (error) {
      console.error('Reject leave error:', error);
      res.status(500).json({ success: false, message: 'Error rejecting leave' });
    }
  };
}
