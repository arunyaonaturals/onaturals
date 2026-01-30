import { Response } from 'express';
import { query, queryOne, run } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import path from 'path';
import fs from 'fs';

export class StaffController {
  // Get all staff members
  getAllStaff = async (req: AuthRequest, res: Response) => {
    try {
      const { role, is_active } = req.query;
      let sql = `
        SELECT s.*, u.username as linked_username
        FROM staff s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (role) {
        sql += ' AND s.role = ?';
        params.push(role);
      }
      if (is_active !== undefined) {
        sql += ' AND s.is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }
      sql += ' ORDER BY s.name ASC';

      const staff = await query(sql, params);
      res.json({ success: true, data: staff });
    } catch (error) {
      console.error('Get all staff error:', error);
      res.status(500).json({ success: false, message: 'Error fetching staff' });
    }
  };

  // Get staff by ID
  getStaffById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const staff = await queryOne(`
        SELECT s.*, u.username as linked_username
        FROM staff s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
      `, [id]);

      if (!staff) {
        return res.status(404).json({ success: false, message: 'Staff member not found' });
      }

      res.json({ success: true, data: staff });
    } catch (error) {
      console.error('Get staff by id error:', error);
      res.status(500).json({ success: false, message: 'Error fetching staff member' });
    }
  };

  // Get staff by role
  getStaffByRole = async (req: AuthRequest, res: Response) => {
    try {
      const { role } = req.params;
      const staff = await query(`
        SELECT id, name, phone, role FROM staff
        WHERE role = ? AND is_active = 1
        ORDER BY name ASC
      `, [role]);

      res.json({ success: true, data: staff });
    } catch (error) {
      console.error('Get staff by role error:', error);
      res.status(500).json({ success: false, message: 'Error fetching staff by role' });
    }
  };

  // Create new staff member
  createStaff = async (req: AuthRequest, res: Response) => {
    try {
      const {
        name, phone, address, city, state, pincode, aadhar_number,
        emergency_contact_name, emergency_contact_phone, role,
        date_of_joining, salary, bank_account_number, bank_name,
        ifsc_code, user_id, notes
      } = req.body;

      if (!name || !phone || !role) {
        return res.status(400).json({ 
          success: false, 
          message: 'Name, phone, and role are required' 
        });
      }

      // Validate role
      const validRoles = ['owner', 'sales_captain', 'accountant', 'hr', 'helper', 'driver', 'packing_staff'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid role' 
        });
      }

      const result = await run(`
        INSERT INTO staff (
          name, phone, address, city, state, pincode, aadhar_number,
          emergency_contact_name, emergency_contact_phone, role,
          date_of_joining, salary, bank_account_number, bank_name,
          ifsc_code, user_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name, phone, address || null, city || null, state || null, pincode || null,
        aadhar_number || null, emergency_contact_name || null, emergency_contact_phone || null,
        role, date_of_joining || null, salary || null, bank_account_number || null,
        bank_name || null, ifsc_code || null, user_id || null, notes || null
      ]);

      res.status(201).json({
        success: true,
        message: 'Staff member created successfully',
        data: { id: result.lastInsertRowid }
      });
    } catch (error) {
      console.error('Create staff error:', error);
      res.status(500).json({ success: false, message: 'Error creating staff member' });
    }
  };

  // Update staff member
  updateStaff = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name, phone, address, city, state, pincode, aadhar_number,
        emergency_contact_name, emergency_contact_phone, role,
        date_of_joining, salary, bank_account_number, bank_name,
        ifsc_code, user_id, is_active, notes
      } = req.body;

      const existing = await queryOne('SELECT id FROM staff WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Staff member not found' });
      }

      await run(`
        UPDATE staff SET
          name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          pincode = COALESCE(?, pincode),
          aadhar_number = COALESCE(?, aadhar_number),
          emergency_contact_name = COALESCE(?, emergency_contact_name),
          emergency_contact_phone = COALESCE(?, emergency_contact_phone),
          role = COALESCE(?, role),
          date_of_joining = COALESCE(?, date_of_joining),
          salary = COALESCE(?, salary),
          bank_account_number = COALESCE(?, bank_account_number),
          bank_name = COALESCE(?, bank_name),
          ifsc_code = COALESCE(?, ifsc_code),
          user_id = COALESCE(?, user_id),
          is_active = COALESCE(?, is_active),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        name, phone, address, city, state, pincode, aadhar_number,
        emergency_contact_name, emergency_contact_phone, role,
        date_of_joining, salary, bank_account_number, bank_name,
        ifsc_code, user_id, is_active, notes, id
      ]);

      res.json({ success: true, message: 'Staff member updated successfully' });
    } catch (error) {
      console.error('Update staff error:', error);
      res.status(500).json({ success: false, message: 'Error updating staff member' });
    }
  };

  // Upload staff photo
  uploadPhoto = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await queryOne('SELECT id, photo_url FROM staff WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Staff member not found' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      // Delete old photo if exists
      if (existing.photo_url) {
        const oldPhotoPath = path.join(__dirname, '../../uploads', existing.photo_url);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      const photoUrl = `/uploads/staff/${req.file.filename}`;
      await run('UPDATE staff SET photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [photoUrl, id]);

      res.json({ 
        success: true, 
        message: 'Photo uploaded successfully',
        data: { photo_url: photoUrl }
      });
    } catch (error) {
      console.error('Upload photo error:', error);
      res.status(500).json({ success: false, message: 'Error uploading photo' });
    }
  };

  // Delete staff member (soft delete)
  deleteStaff = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await queryOne('SELECT id FROM staff WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Staff member not found' });
      }

      await run('UPDATE staff SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

      res.json({ success: true, message: 'Staff member deactivated successfully' });
    } catch (error) {
      console.error('Delete staff error:', error);
      res.status(500).json({ success: false, message: 'Error deleting staff member' });
    }
  };

  // Permanently delete staff member
  permanentDeleteStaff = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existing = await queryOne('SELECT id, photo_url FROM staff WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Staff member not found' });
      }

      // Delete photo if exists
      if (existing.photo_url) {
        const photoPath = path.join(__dirname, '../../uploads', existing.photo_url);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      }

      await run('DELETE FROM staff WHERE id = ?', [id]);

      res.json({ success: true, message: 'Staff member permanently deleted' });
    } catch (error) {
      console.error('Permanent delete staff error:', error);
      res.status(500).json({ success: false, message: 'Error deleting staff member' });
    }
  };

  // Get staff statistics
  getStaffStats = async (req: AuthRequest, res: Response) => {
    try {
      const totalStaff = await queryOne('SELECT COUNT(*) as count FROM staff WHERE is_active = 1');
      const byRole = await query(`
        SELECT role, COUNT(*) as count 
        FROM staff 
        WHERE is_active = 1 
        GROUP BY role
      `);

      res.json({
        success: true,
        data: {
          total: totalStaff?.count || 0,
          by_role: byRole
        }
      });
    } catch (error) {
      console.error('Get staff stats error:', error);
      res.status(500).json({ success: false, message: 'Error fetching staff statistics' });
    }
  };
}
