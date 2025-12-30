import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../database.js';

const router = express.Router();

// Login endpoint
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Login error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Compare password with hash
        const isValidPassword = bcrypt.compareSync(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Return user info (without password)
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role
            }
        });
    });
});

// Verify session (check if user exists)
router.post('/verify', (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    db.get('SELECT id, username, name, role FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Verify error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: user
        });
    });
});

// Get all users (admin only)
router.get('/users', (req, res) => {
    db.all('SELECT id, username, name, role, createdAt FROM users ORDER BY createdAt DESC', [], (err, users) => {
        if (err) {
            console.error('Get users error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(users);
    });
});

// Create new user (admin only)
router.post('/users', (req, res) => {
    const { username, password, name, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(
        'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, name || username, role || 'restricted'],
        function (err) {
            if (err) {
                console.error('Create user error - Full details:', {
                    message: err.message,
                    stack: err.stack,
                    code: err.code,
                    errno: err.errno
                });
                if (err.message && err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({
                    error: 'Internal server error',
                    details: err.message
                });
            }
            res.json({
                success: true,
                user: {
                    id: this.lastID,
                    username,
                    name: name || username,
                    role: role || 'restricted'
                }
            });
        }
    );
});

// Update user password
router.put('/users/:id/password', (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(
        'UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedPassword, id],
        function (err) {
            if (err) {
                console.error('Update password error:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json({ success: true });
        }
    );
});

// Delete user
router.delete('/users/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
        if (err) {
            console.error('Delete user error - Full details:', {
                message: err.message,
                stack: err.stack,
                code: err.code,
                errno: err.errno
            });
            return res.status(500).json({
                error: 'Internal server error',
                details: err.message
            });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true });
    });
});

export default router;
