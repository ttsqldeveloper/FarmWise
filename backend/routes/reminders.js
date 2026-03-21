const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Get all reminders for user
router.get('/', auth, async (req, res) => {
  const db = req.db;
  const userId = req.user.userId;

  try {
    const result = await db.query(
      `SELECT id, title, description, due_date, priority, is_completed, created_at
       FROM reminders
       WHERE user_id = $1
       ORDER BY due_date ASC NULLS LAST, created_at DESC`,
      [userId]
    );

    res.json({ reminders: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get upcoming reminders
router.get('/upcoming', auth, async (req, res) => {
  const db = req.db;
  const userId = req.user.userId;

  try {
    const result = await db.query(
      `SELECT id, title, description, due_date, priority, is_completed
       FROM reminders
       WHERE user_id = $1 
         AND is_completed = false
         AND (due_date >= CURRENT_DATE OR due_date IS NULL)
       ORDER BY due_date ASC NULLS LAST
       LIMIT 10`,
      [userId]
    );

    res.json({ reminders: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new reminder
router.post('/', auth, async (req, res) => {
  const db = req.db;
  const userId = req.user.userId;
  const { title, description, due_date, priority } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO reminders (user_id, title, description, due_date, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, description, due_date, priority, created_at`,
      [userId, title, description, due_date || null, priority || 'medium']
    );

    res.status(201).json({ reminder: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a reminder
router.put('/:id', auth, async (req, res) => {
  const db = req.db;
  const userId = req.user.userId;
  const reminderId = req.params.id;
  const { title, description, due_date, priority, is_completed } = req.body;

  try {
    const result = await db.query(
      `UPDATE reminders
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           due_date = COALESCE($3, due_date),
           priority = COALESCE($4, priority),
           is_completed = COALESCE($5, is_completed)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [title, description, due_date, priority, is_completed, reminderId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json({ reminder: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a reminder
router.delete('/:id', auth, async (req, res) => {
  const db = req.db;
  const userId = req.user.userId;
  const reminderId = req.params.id;

  try {
    const result = await db.query(
      'DELETE FROM reminders WHERE id = $1 AND user_id = $2 RETURNING id',
      [reminderId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark reminder as complete
router.patch('/:id/complete', auth, async (req, res) => {
  const db = req.db;
  const userId = req.user.userId;
  const reminderId = req.params.id;

  try {
    const result = await db.query(
      `UPDATE reminders
       SET is_completed = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [reminderId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json({ reminder: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;