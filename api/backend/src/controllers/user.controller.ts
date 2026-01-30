import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, run } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class UserController {
  getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
      const users = await query('SELECT id, username, name, email, role, phone, is_active, created_at FROM users ORDER BY created_at DESC');
      res.json({ success: true, data: users });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ success: false, message: 'Error fetching users' });
    }
  };

  getSalesCaptains = async (req: AuthRequest, res: Response) => {
    try {
      const users = await query(`
        SELECT u.id, u.username, u.name, u.email, u.phone, a.id as area_id, a.name as area_name
        FROM users u LEFT JOIN areas a ON a.sales_captain_id = u.id
        WHERE u.role = 'sales_captain' AND u.is_active = 1 ORDER BY u.name
      `);
      res.json({ success: true, data: users });
    } catch (error) {
      console.error('Get sales captains error:', error);
      res.status(500).json({ success: false, message: 'Error fetching sales captains' });
    }
  };

  getUserById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = await queryOne('SELECT id, username, name, email, role, phone, is_active, created_at FROM users WHERE id = ?', [id]);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Get user by id error:', error);
      res.status(500).json({ success: false, message: 'Error fetching user' });
    }
  };

  createUser = async (req: AuthRequest, res: Response) => {
    try {
      const { username, name, email, password, role, phone } = req.body;
      console.log('Creating user:', { username, name, email, role, phone });
      
      if (!username || !name || !password) {
        return res.status(400).json({ success: false, message: 'Username, name, and password are required' });
      }

      // Validate role
      const validRoles = ['admin', 'sales_captain', 'accountant', 'staff'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      }

      const existing = await queryOne('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
      if (existing) return res.status(400).json({ success: false, message: 'User with this username already exists' });

      const hashedPassword = bcrypt.hashSync(password, 10);

      const result = await run('INSERT INTO users (username, name, email, password, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
        [username.toLowerCase(), name, email || null, hashedPassword, role || 'staff', phone || null]);

      console.log('User created with ID:', result.lastInsertRowid);
      
      res.status(201).json({
        success: true, message: 'User created successfully',
        data: { id: result.lastInsertRowid, username: username.toLowerCase(), name, email, role: role || 'staff', phone }
      });
    } catch (error: any) {
      console.error('Create user error:', error);
      res.status(500).json({ success: false, message: error.message || 'Error creating user' });
    }
  };

  updateUser = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { username, name, email, role, phone, is_active, password } = req.body;

      const existing = await queryOne('SELECT id FROM users WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ success: false, message: 'User not found' });

      if (username) {
        const usernameCheck = await queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username.toLowerCase(), id]);
        if (usernameCheck) return res.status(400).json({ success: false, message: 'Username already in use by another user' });
      }

      // Update password if provided
      if (password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
      }

      await run(`UPDATE users SET username = COALESCE(?, username), name = COALESCE(?, name), email = COALESCE(?, email), 
           role = COALESCE(?, role), phone = COALESCE(?, phone), is_active = COALESCE(?, is_active), 
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [username?.toLowerCase(), name, email, role, phone, is_active, id]);

      res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ success: false, message: 'Error updating user' });
    }
  };

  deleteUser = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await run('UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
      res.json({ success: true, message: 'User deactivated successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ success: false, message: 'Error deleting user' });
    }
  };
}
