const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Post = require('../models/Post');

// @desc    Get user notifications
// @route   GET /api/v1/users/me/notifications
// @access  Private
router.get('/me/notifications', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'notifications.sender',
      select: 'name avatar'
    }).populate({
      path: 'notifications.post',
      select: 'text originalPost originalPostType'
    }).sort({'notifications.createdAt': -1});

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user.notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @desc    Mark a single notification as read
// @route   PUT /api/v1/users/me/notifications/:id/read
// @access  Private
router.put('/me/notifications/:id/read', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const notification = user.notifications.id(req.params.id);
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    notification.read = true;
    await user.save();
    
    res.json({ msg: 'Notification marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @desc    Mark all user notifications as read
// @route   POST /api/v1/users/me/notifications/mark-all-as-read
// @access  Private
router.post('/me/notifications/mark-all-as-read', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.notifications.forEach(notif => {
      notif.read = true;
    });

    await user.save();
    res.json({ msg: 'All notifications marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @desc    Mark user notifications as read (legacy endpoint)
// @route   PUT /api/v1/users/me/notifications/mark-as-read
// @access  Private
router.put('/me/notifications/mark-as-read', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.notifications.forEach(notif => {
      notif.read = true;
    });

    await user.save();
    res.json({ msg: 'Notifications marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @desc    Get unread notification count
// @route   GET /api/v1/users/me/notifications/unread-count
// @access  Private
router.get('/me/notifications/unread-count', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const unreadCount = user.notifications.filter(notif => !notif.read).length;
    res.json({ unreadCount });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

