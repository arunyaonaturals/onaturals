import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get all payroll records with optional filters
router.get('/', (req, res) => {
    const { month, year, status } = req.query;
    let sql = `SELECT * FROM payroll WHERE 1=1`;
    const params = [];

    if (month) {
        sql += ` AND month = ?`;
        params.push(month);
    }
    if (year) {
        sql += ` AND year = ?`;
        params.push(year);
    }
    if (status) {
        sql += ` AND status = ?`;
        params.push(status);
    }

    sql += ` ORDER BY year DESC, month DESC, staffName ASC`;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get salary components for a staff
router.get('/salary-components/:staffId', (req, res) => {
    const sql = `SELECT * FROM salary_components WHERE staffId = ?`;
    db.get(sql, [req.params.staffId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || {});
    });
});

// Save/Update salary components for a staff
router.post('/salary-components/:staffId', (req, res) => {
    const staffId = req.params.staffId;
    const {
        basicSalary = 0,
        hra = 0,
        conveyance = 0,
        medicalAllowance = 0,
        specialAllowance = 0,
        pf = 0,
        esi = 0,
        professionalTax = 0,
        otherDeductions = 0
    } = req.body;

    const sql = `INSERT INTO salary_components 
                 (staffId, basicSalary, hra, conveyance, medicalAllowance, specialAllowance, pf, esi, professionalTax, otherDeductions)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(staffId) DO UPDATE SET
                 basicSalary = excluded.basicSalary,
                 hra = excluded.hra,
                 conveyance = excluded.conveyance,
                 medicalAllowance = excluded.medicalAllowance,
                 specialAllowance = excluded.specialAllowance,
                 pf = excluded.pf,
                 esi = excluded.esi,
                 professionalTax = excluded.professionalTax,
                 otherDeductions = excluded.otherDeductions,
                 updatedAt = CURRENT_TIMESTAMP`;

    db.run(sql, [staffId, basicSalary, hra, conveyance, medicalAllowance, specialAllowance, pf, esi, professionalTax, otherDeductions], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, staffId });
    });
});

// Generate payroll for a specific month/year
router.post('/generate', async (req, res) => {
    const { month, year, workingDays = 26 } = req.body;

    if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required' });
    }

    try {
        // Get all active staff with their salary components
        const staffSql = `SELECT s.*, sc.* FROM staff s 
                          LEFT JOIN salary_components sc ON s.id = sc.staffId 
                          WHERE s.status = 'Active'`;

        db.all(staffSql, [], (err, staffList) => {
            if (err) return res.status(500).json({ error: err.message });

            let processed = 0;
            let errors = [];

            if (staffList.length === 0) {
                return res.json({ success: true, message: 'No active staff found', processed: 0 });
            }

            staffList.forEach(staff => {
                // Calculate attendance for the month
                const attendanceSql = `SELECT COUNT(*) as presentDays FROM attendance 
                                       WHERE staffId = ? 
                                       AND strftime('%m', date) = ? 
                                       AND strftime('%Y', date) = ?
                                       AND status = 'Present'`;

                const monthStr = month.toString().padStart(2, '0');

                db.get(attendanceSql, [staff.id, monthStr, year.toString()], (err, attendanceRow) => {
                    const presentDays = attendanceRow?.presentDays || workingDays; // Default to full if no attendance
                    const leaveDays = workingDays - presentDays;

                    // Calculate salary
                    const basic = parseFloat(staff.basicSalary) || parseFloat(staff.salary) || 0;
                    const hra = parseFloat(staff.hra) || 0;
                    const conveyance = parseFloat(staff.conveyance) || 0;
                    const medical = parseFloat(staff.medicalAllowance) || 0;
                    const special = parseFloat(staff.specialAllowance) || 0;

                    const grossSalary = basic + hra + conveyance + medical + special;

                    // Pro-rate based on attendance
                    const dailyRate = grossSalary / workingDays;
                    const actualGross = dailyRate * presentDays;

                    // Deductions
                    const pfAmount = parseFloat(staff.pf) || 0;
                    const esiAmount = parseFloat(staff.esi) || 0;
                    const ptAmount = parseFloat(staff.professionalTax) || 0;
                    const otherDed = parseFloat(staff.otherDeductions) || 0;

                    const totalDeductions = pfAmount + esiAmount + ptAmount + otherDed;
                    const netSalary = actualGross - totalDeductions;

                    // Insert or update payroll record
                    const insertSql = `INSERT INTO payroll 
                        (staffId, staffName, designation, month, year, workingDays, presentDays, leaveDays,
                         basicSalary, hra, conveyance, medicalAllowance, specialAllowance, grossSalary,
                         pf, esi, professionalTax, otherDeductions, totalDeductions, netSalary, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
                        ON CONFLICT(staffId, month, year) DO UPDATE SET
                        workingDays = excluded.workingDays,
                        presentDays = excluded.presentDays,
                        leaveDays = excluded.leaveDays,
                        basicSalary = excluded.basicSalary,
                        hra = excluded.hra,
                        conveyance = excluded.conveyance,
                        medicalAllowance = excluded.medicalAllowance,
                        specialAllowance = excluded.specialAllowance,
                        grossSalary = excluded.grossSalary,
                        pf = excluded.pf,
                        esi = excluded.esi,
                        professionalTax = excluded.professionalTax,
                        otherDeductions = excluded.otherDeductions,
                        totalDeductions = excluded.totalDeductions,
                        netSalary = excluded.netSalary,
                        updatedAt = CURRENT_TIMESTAMP`;

                    db.run(insertSql, [
                        staff.id, staff.name, staff.designation, month, year, workingDays, presentDays, leaveDays,
                        basic, hra, conveyance, medical, special, actualGross,
                        pfAmount, esiAmount, ptAmount, otherDed, totalDeductions, netSalary
                    ], function (err) {
                        processed++;
                        if (err) errors.push({ staff: staff.name, error: err.message });

                        if (processed === staffList.length) {
                            res.json({
                                success: true,
                                message: `Payroll generated for ${processed} staff`,
                                processed,
                                errors: errors.length > 0 ? errors : undefined
                            });
                        }
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update payroll status (mark as paid)
router.put('/:id', (req, res) => {
    const { status, paidDate, paymentMode, remarks } = req.body;
    const sql = `UPDATE payroll SET status = ?, paidDate = ?, paymentMode = ?, remarks = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;

    db.run(sql, [status, paidDate, paymentMode, remarks, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// Get single payroll record
router.get('/:id', (req, res) => {
    db.get(`SELECT * FROM payroll WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

// Delete payroll record
router.delete('/:id', (req, res) => {
    db.run(`DELETE FROM payroll WHERE id = ?`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, deleted: this.changes });
    });
});

// Get payroll summary for a month
router.get('/summary/:month/:year', (req, res) => {
    const { month, year } = req.params;
    const sql = `SELECT 
                    COUNT(*) as totalStaff,
                    SUM(grossSalary) as totalGross,
                    SUM(totalDeductions) as totalDeductions,
                    SUM(netSalary) as totalNet,
                    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paidCount,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount
                 FROM payroll WHERE month = ? AND year = ?`;

    db.get(sql, [month, year], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || {});
    });
});

export default router;
