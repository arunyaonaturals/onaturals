import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne, run } from '../config/database';
import { AuthRequest, UserPayload } from '../middleware/auth.middleware';

export class AuthController {
  register = async (req: Request, res: Response) => {
    try {
      const { username, name, email, password, role, phone } = req.body;

      if (!username || !name || !password) {
        return res.status(400).json({ success: false, message: 'Username, name, and password are required' });
      }

      const existingUser = await queryOne('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'User with this username already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const result = await run('INSERT INTO users (username, name, email, password, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
        [username.toLowerCase(), name, email || null, hashedPassword, role || 'staff', phone || null]);

      const token = this.generateToken({ id: result.lastInsertRowid, username: username.toLowerCase(), role: role || 'staff', name });

      res.status(201).json({
        success: true, message: 'User registered successfully',
        data: { id: result.lastInsertRowid, username: username.toLowerCase(), name, email, role: role || 'staff', token }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, message: 'Error registering user' });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
      }

      const user = await queryOne('SELECT * FROM users WHERE username = ? AND is_active = 1', [username.toLowerCase()]);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
      }

      const token = this.generateToken({ id: user.id, username: user.username, role: user.role, name: user.name });

      res.json({
        success: true, message: 'Login successful',
        data: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role, token }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Error logging in' });
    }
  };

  getCurrentUser = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

      const user = await queryOne('SELECT id, username, name, email, role, phone, created_at FROM users WHERE id = ?', [req.user.id]);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ success: false, message: 'Error fetching user data' });
    }
  };

  changePassword = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current password and new password are required' });
      }

      const user = await queryOne('SELECT password FROM users WHERE id = ?', [req.user.id]);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ success: false, message: 'Error changing password' });
    }
  };

  private generateToken(payload: UserPayload): string {
    const secret: string = process.env.JWT_SECRET || 'default-secret';
    const expiresIn: string = process.env.JWT_EXPIRES_IN || '7d';
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }
}
