import { Response } from 'express';
import { query, queryOne, run } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { generatePayslipPDF } from '../utils/pdf.generator';

export class SalaryController {
  getAllSalaryStructures = async (req: AuthRequest, res: Response) => {
    try {
      const structures = await query(`SELECT ss.*, u.name as user_name, u.email as user_email FROM salary_structures ss
        INNER JOIN users u ON ss.user_id = u.id WHERE ss.is_active = 1 ORDER BY u.name`);
      res.json({ success: true, data: structures });
    } catch (error) {
      console.error('Get all salary structures error:', error);
      res.status(500).json({ success: false, message: 'Error fetching salary structures' });
    }
  };

  getUserSalaryStructure = async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const structure = await queryOne(`SELECT ss.*, u.name as user_name FROM salary_structures ss
        INNER JOIN users u ON ss.user_id = u.id WHERE ss.user_id = ? AND ss.is_active = 1`, [userId]);

      if (!structure) return res.status(404).json({ success: false, message: 'Salary structure not found' });
      res.json({ success: true, data: structure });
    } catch (error) {
      console.error('Get user salary structure error:', error);
      res.status(500).json({ success: false, message: 'Error fetching salary structure' });
    }
  };

  createSalaryStructure = async (req: AuthRequest, res: Response) => {
    try {
      const { user_id, basic_salary, hra, da, other_allowances, pf_deduction, esi_deduction, other_deductions } = req.body;
      if (!user_id || basic_salary === undefined) {
        return res.status(400).json({ success: false, message: 'User ID and basic salary are required' });
      }

      await run('UPDATE salary_structures SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [user_id]);

      const grossSalary = (basic_salary || 0) + (hra || 0) + (da || 0) + (other_allowances || 0);
      const totalDeductions = (pf_deduction || 0) + (esi_deduction || 0) + (other_deductions || 0);
      const netSalary = grossSalary - totalDeductions;

      const result = await run(`INSERT INTO salary_structures (user_id, basic_salary, hra, da, other_allowances, pf_deduction, esi_deduction, other_deductions, gross_salary, net_salary) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user_id, basic_salary, hra || 0, da || 0, other_allowances || 0, pf_deduction || 0, esi_deduction || 0, other_deductions || 0, grossSalary, netSalary]);

      res.status(201).json({ success: true, message: 'Salary structure created successfully', data: { id: result.lastInsertRowid, gross_salary: grossSalary, net_salary: netSalary } });
    } catch (error) {
      console.error('Create salary structure error:', error);
      res.status(500).json({ success: false, message: 'Error creating salary structure' });
    }
  };

  updateSalaryStructure = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { basic_salary, hra, da, other_allowances, pf_deduction, esi_deduction, other_deductions } = req.body;

      const existing = await queryOne('SELECT * FROM salary_structures WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Salary structure not found' });

      const newBasic = basic_salary !== undefined ? basic_salary : existing.basic_salary;
      const newHra = hra !== undefined ? hra : existing.hra;
      const newDa = da !== undefined ? da : existing.da;
      const newOtherAllowances = other_allowances !== undefined ? other_allowances : existing.other_allowances;
      const newPf = pf_deduction !== undefined ? pf_deduction : existing.pf_deduction;
      const newEsi = esi_deduction !== undefined ? esi_deduction : existing.esi_deduction;
      const newOtherDeductions = other_deductions !== undefined ? other_deductions : existing.other_deductions;

      const grossSalary = newBasic + newHra + newDa + newOtherAllowances;
      const totalDeductions = newPf + newEsi + newOtherDeductions;
      const netSalary = grossSalary - totalDeductions;

      await run(`UPDATE salary_structures SET basic_salary = ?, hra = ?, da = ?, other_allowances = ?,
        pf_deduction = ?, esi_deduction = ?, other_deductions = ?, gross_salary = ?, net_salary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [newBasic, newHra, newDa, newOtherAllowances, newPf, newEsi, newOtherDeductions, grossSalary, netSalary, id]);

      res.json({ success: true, message: 'Salary structure updated successfully' });
    } catch (error) {
      console.error('Update salary structure error:', error);
      res.status(500).json({ success: false, message: 'Error updating salary structure' });
    }
  };

  getAllPayments = async (req: AuthRequest, res: Response) => {
    try {
      const { user_id, month, year, status } = req.query;
      let sql = `SELECT sp.*, u.name as user_name, u.email as user_email FROM salary_payments sp INNER JOIN users u ON sp.user_id = u.id WHERE 1=1`;
      const params: any[] = [];

      if (user_id) { sql += ' AND sp.user_id = ?'; params.push(user_id); }
      if (month) { sql += ' AND sp.month = ?'; params.push(month); }
      if (year) { sql += ' AND sp.year = ?'; params.push(year); }
      if (status) { sql += ' AND sp.status = ?'; params.push(status); }
      sql += ' ORDER BY sp.year DESC, sp.month DESC, u.name';

      const payments = await query(sql, params);
      res.json({ success: true, data: payments });
    } catch (error) {
      console.error('Get all payments error:', error);
      res.status(500).json({ success: false, message: 'Error fetching payments' });
    }
  };

  getMyPayments = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
      const payments = await query('SELECT * FROM salary_payments WHERE user_id = ? ORDER BY year DESC, month DESC', [req.user.id]);
      res.json({ success: true, data: payments });
    } catch (error) {
      console.error('Get my payments error:', error);
      res.status(500).json({ success: false, message: 'Error fetching payments' });
    }
  };

  getPaymentById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const payment = await queryOne(`SELECT sp.*, u.name as user_name, u.email as user_email FROM salary_payments sp INNER JOIN users u ON sp.user_id = u.id WHERE sp.id = ?`, [id]);
      if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
      res.json({ success: true, data: payment });
    } catch (error) {
      console.error('Get payment by id error:', error);
      res.status(500).json({ success: false, message: 'Error fetching payment' });
    }
  };

  calculateSalary = async (req: AuthRequest, res: Response) => {
    try {
      const { user_id, month, year } = req.body;
      if (!user_id || !month || !year) {
        return res.status(400).json({ success: false, message: 'User ID, month, and year are required' });
      }

      const structure = await queryOne('SELECT * FROM salary_structures WHERE user_id = ? AND is_active = 1', [user_id]);
      if (!structure) return res.status(404).json({ success: false, message: 'Salary structure not found for user' });

      const attendance = await queryOne(`
        SELECT SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
          SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as half_days,
          SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as leave_days
        FROM attendance WHERE user_id = ? AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
      `, [user_id, String(month).padStart(2, '0'), year]);

      const { present_days, absent_days, half_days, leave_days } = attendance || { present_days: 0, absent_days: 0, half_days: 0, leave_days: 0 };
      const daysInMonth = new Date(parseInt(year as string), parseInt(month as string), 0).getDate();
      const effectiveWorkingDays = (present_days || 0) + (leave_days || 0) + ((half_days || 0) * 0.5);
      const perDaySalary = structure.net_salary / daysInMonth;
      const calculatedSalary = perDaySalary * effectiveWorkingDays;
      const deductionForAbsence = perDaySalary * ((absent_days || 0) + ((half_days || 0) * 0.5));

      res.json({
        success: true,
        data: {
          user_id, month, year, salary_structure: structure,
          attendance_summary: { present_days: present_days || 0, absent_days: absent_days || 0, half_days: half_days || 0, leave_days: leave_days || 0, effective_working_days: effectiveWorkingDays },
          calculation: { days_in_month: daysInMonth, per_day_salary: perDaySalary.toFixed(2), gross_salary: structure.gross_salary, deduction_for_absence: deductionForAbsence.toFixed(2), net_payable: calculatedSalary.toFixed(2) }
        }
      });
    } catch (error) {
      console.error('Calculate salary error:', error);
      res.status(500).json({ success: false, message: 'Error calculating salary' });
    }
  };

  processSalaryPayment = async (req: AuthRequest, res: Response) => {
    try {
      const { user_id, month, year, basic_amount, hra_amount, da_amount, other_allowances, pf_deduction, esi_deduction, other_deductions, bonus, net_salary, payment_date, payment_method, notes } = req.body;

      if (!user_id || !month || !year || net_salary === undefined) {
        return res.status(400).json({ success: false, message: 'User ID, month, year, and net salary are required' });
      }

      const existing = await queryOne('SELECT id FROM salary_payments WHERE user_id = ? AND month = ? AND year = ?', [user_id, month, year]);
      if (existing) return res.status(400).json({ success: false, message: 'Salary payment already exists for this month' });

      const grossSalary = (basic_amount || 0) + (hra_amount || 0) + (da_amount || 0) + (other_allowances || 0) + (bonus || 0);
      const totalDeductions = (pf_deduction || 0) + (esi_deduction || 0) + (other_deductions || 0);
      const today = new Date().toISOString().split('T')[0];

      const result = await run(`INSERT INTO salary_payments (user_id, month, year, basic_amount, hra_amount, da_amount, other_allowances, bonus, pf_deduction, esi_deduction, other_deductions, gross_salary, total_deductions, net_salary, payment_date, payment_method, status, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
        [user_id, month, year, basic_amount || 0, hra_amount || 0, da_amount || 0, other_allowances || 0, bonus || 0, pf_deduction || 0, esi_deduction || 0, other_deductions || 0, grossSalary, totalDeductions, net_salary, payment_date || today, payment_method || 'bank_transfer', notes || null]);

      res.status(201).json({ success: true, message: 'Salary payment processed successfully', data: { id: result.lastInsertRowid } });
    } catch (error) {
      console.error('Process salary payment error:', error);
      res.status(500).json({ success: false, message: 'Error processing salary payment' });
    }
  };

  updatePayment = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, payment_date, payment_method, notes } = req.body;

      const existing = await queryOne('SELECT id FROM salary_payments WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'Payment not found' });

      await run(`UPDATE salary_payments SET status = COALESCE(?, status), payment_date = COALESCE(?, payment_date),
        payment_method = COALESCE(?, payment_method), notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [status, payment_date, payment_method, notes, id]);

      res.json({ success: true, message: 'Payment updated successfully' });
    } catch (error) {
      console.error('Update payment error:', error);
      res.status(500).json({ success: false, message: 'Error updating payment' });
    }
  };

  generatePayslip = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const payment = await queryOne(`SELECT sp.*, u.name as user_name, u.email as user_email FROM salary_payments sp INNER JOIN users u ON sp.user_id = u.id WHERE sp.id = ?`, [id]);

      if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

      const pdfBuffer = await generatePayslipPDF(payment);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=payslip_${payment.user_name}_${payment.month}_${payment.year}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Generate payslip error:', error);
      res.status(500).json({ success: false, message: 'Error generating payslip' });
    }
  };
}
