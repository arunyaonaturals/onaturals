import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get all beats
router.get('/', (req, res) => {
    db.all('SELECT * FROM beats ORDER BY beatName ASC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows || []);
    });
});

// Get single beat
router.get('/:id', (req, res) => {
    db.get('SELECT * FROM beats WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row);
    });
});

// Create beat
router.post('/', (req, res) => {
    const { beatName, salesman, areas } = req.body;

    if (!beatName) {
        res.status(400).json({ error: 'Beat name is required' });
        return;
    }

    db.run(
        'INSERT INTO beats (beatName, salesman, areas) VALUES (?, ?, ?)',
        [beatName, salesman, areas],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint')) {
                    res.status(400).json({ error: 'Beat name already exists' });
                } else {
                    res.status(500).json({ error: err.message });
                }
                return;
            }
            res.json({ id: this.lastID, message: 'Beat created successfully' });
        }
    );
});

// Update beat
router.put('/:id', (req, res) => {
    const { beatName, salesman, areas } = req.body;

    db.run(
        'UPDATE beats SET beatName = ?, salesman = ?, areas = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [beatName, salesman, areas, req.params.id],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Beat updated successfully', changes: this.changes });
        }
    );
});

// Delete beat
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM beats WHERE id = ?', [req.params.id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Beat deleted successfully', changes: this.changes });
    });
});

export default router;
