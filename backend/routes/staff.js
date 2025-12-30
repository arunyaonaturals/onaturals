import express from 'express';
import db from '../database.js';

const router = express.Router();

// =====================
// STAFF ROUTES
// =====================

// Get all staff
router.get('/', (req, res) => {
    db.all('SELECT * FROM staff ORDER BY name ASC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
});

// Get single staff by ID
router.get('/:id', (req, res) => {
    db.get('SELECT * FROM staff WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Staff not found' });
            return;
        }
        res.json(row);
    });
});

// Create new staff
router.post('/', (req, res) => {
    const { name, designation, dob, address, aadharNumber, phoneNumber, email, joiningDate, salary, status } = req.body;

    if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
    }

    db.run(
        `INSERT INTO staff (name, designation, dob, address, aadharNumber, phoneNumber, email, joiningDate, salary, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, designation, dob, address, aadharNumber, phoneNumber, email, joiningDate, salary, status || 'Active'],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Staff created successfully' });
        }
    );
});

// Update staff
router.put('/:id', (req, res) => {
    const { name, designation, dob, address, aadharNumber, phoneNumber, email, joiningDate, salary, status } = req.body;

    db.run(
        `UPDATE staff SET name = ?, designation = ?, dob = ?, address = ?, aadharNumber = ?, 
         phoneNumber = ?, email = ?, joiningDate = ?, salary = ?, status = ?, updatedAt = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [name, designation, dob, address, aadharNumber, phoneNumber, email, joiningDate, salary, status, req.params.id],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Staff updated successfully', changes: this.changes });
        }
    );
});

// Delete staff
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM staff WHERE id = ?', [req.params.id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Staff deleted successfully', changes: this.changes });
    });
});

// =====================
// ATTENDANCE ROUTES
// =====================

// Get attendance for a specific date
router.get('/attendance/date/:date', (req, res) => {
    db.all(
        `SELECT a.*, s.name as staffName, s.designation 
         FROM attendance a 
         JOIN staff s ON a.staffId = s.id 
         WHERE a.date = ?
         ORDER BY s.name ASC`,
        [req.params.date],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows || []);
        }
    );
});

// Get attendance for a staff member (monthly)
router.get('/attendance/staff/:staffId/:month', (req, res) => {
    const monthPattern = `${req.params.month}%`; // e.g., "2025-12%"
    db.all(
        `SELECT * FROM attendance WHERE staffId = ? AND date LIKE ? ORDER BY date ASC`,
        [req.params.staffId, monthPattern],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows || []);
        }
    );
});

// Mark attendance (create or update)
router.post('/attendance', (req, res) => {
    const { staffId, date, status, checkIn, checkOut, remarks } = req.body;

    if (!staffId || !date) {
        res.status(400).json({ error: 'Staff ID and date are required' });
        return;
    }

    db.run(
        `INSERT INTO attendance (staffId, date, status, checkIn, checkOut, remarks) 
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(staffId, date) DO UPDATE SET 
         status = excluded.status, checkIn = excluded.checkIn, checkOut = excluded.checkOut, remarks = excluded.remarks`,
        [staffId, date, status || 'Present', checkIn, checkOut, remarks],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Attendance marked successfully' });
        }
    );
});

// Bulk mark attendance for a date
router.post('/attendance/bulk', (req, res) => {
    const { date, attendance } = req.body; // attendance = [{staffId, status, checkIn, checkOut, remarks}]

    if (!date || !attendance || !Array.isArray(attendance)) {
        res.status(400).json({ error: 'Date and attendance array are required' });
        return;
    }

    const stmt = db.prepare(
        `INSERT INTO attendance (staffId, date, status, checkIn, checkOut, remarks) 
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(staffId, date) DO UPDATE SET 
         status = excluded.status, checkIn = excluded.checkIn, checkOut = excluded.checkOut, remarks = excluded.remarks`
    );

    let processed = 0;
    let errors = [];

    attendance.forEach((record) => {
        stmt.run(
            [record.staffId, date, record.status || 'Present', record.checkIn, record.checkOut, record.remarks],
            (err) => {
                if (err) errors.push({ staffId: record.staffId, error: err.message });
                processed++;

                if (processed === attendance.length) {
                    stmt.finalize();
                    if (errors.length > 0) {
                        res.json({ message: 'Attendance partially saved', errors });
                    } else {
                        res.json({ message: 'All attendance records saved successfully' });
                    }
                }
            }
        );
    });
});

// Get attendance summary for a month
router.get('/attendance/summary/:month', (req, res) => {
    const monthPattern = `${req.params.month}%`;
    db.all(
        `SELECT s.id, s.name, s.designation,
         COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as presentDays,
         COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absentDays,
         COUNT(CASE WHEN a.status = 'Half Day' THEN 1 END) as halfDays,
         COUNT(CASE WHEN a.status = 'Leave' THEN 1 END) as leaveDays
         FROM staff s
         LEFT JOIN attendance a ON s.id = a.staffId AND a.date LIKE ?
         WHERE s.status = 'Active'
         GROUP BY s.id
         ORDER BY s.name ASC`,
        [monthPattern],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows || []);
        }
    );
});

export default router;
