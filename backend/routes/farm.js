const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Get farm profile
router.get('/profile', auth, async (req, res) => {
  const db = req.db;
  const userId = req.user.userId;

  try {
    const result = await db.query(
      'SELECT id, name, email, region, farm_type, crop_type, livestock_type FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update farm profile
router.put('/profile', auth, async (req, res) => {
  const db = req.db;
  const userId = req.user.userId;
  const { region, farm_type, crop_type, livestock_type } = req.body;

  try {
    const result = await db.query(
      `UPDATE users 
       SET region = COALESCE($1, region),
           farm_type = COALESCE($2, farm_type),
           crop_type = COALESCE($3, crop_type),
           livestock_type = COALESCE($4, livestock_type),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, email, region, farm_type, crop_type, livestock_type`,
      [region, farm_type, crop_type, livestock_type, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get farm statistics
router.get('/stats', auth, async (req, res) => {
  const db = req.db;
  const userId = req.user.userId;

  try {
    // Get counts for various activities
    const stats = {
      chatCount: 0,
      reminderCount: 0,
      logCount: 0
    };

    // Count chat messages
    const chatResult = await db.query(
      'SELECT COUNT(*) as count FROM chat_history WHERE user_id = $1',
      [userId]
    );
    stats.chatCount = parseInt(chatResult.rows[0].count);

    // Count reminders
    const reminderResult = await db.query(
      'SELECT COUNT(*) as count FROM reminders WHERE user_id = $1',
      [userId]
    );
    stats.reminderCount = parseInt(reminderResult.rows[0].count);

    res.json({ stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;