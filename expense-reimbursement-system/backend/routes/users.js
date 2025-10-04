const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users in company
// @access  Admin/Manager
router.get('/', auth, authorize('admin', 'manager'), async (req, res) => {
  try {
    const users = await User.find({ 
      company: req.user.company._id,
      isActive: true 
    })
    .populate('manager', 'firstName lastName email')
    .select('-password')
    .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users
// @desc    Create new user
// @access  Admin
router.post('/', auth, authorize('admin'), [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'manager', 'employee']).withMessage('Invalid role'),
  body('managerId').optional().isMongoId().withMessage('Invalid manager ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password, role, managerId, isManagerApprover } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Validate manager if provided
    if (managerId) {
      const manager = await User.findOne({ 
        _id: managerId, 
        company: req.user.company._id,
        role: { $in: ['admin', 'manager'] }
      });
      if (!manager) {
        return res.status(400).json({ message: 'Invalid manager' });
      }
    }

    const user = new User({
      firstName,
      lastName,
      email,
      password,
      role,
      company: req.user.company._id,
      manager: managerId || null,
      isManagerApprover: isManagerApprover || false
    });

    await user.save();

    const populatedUser = await User.findById(user._id)
      .populate('manager', 'firstName lastName email')
      .select('-password');

    res.status(201).json({
      message: 'User created successfully',
      user: populatedUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Admin
router.put('/:id', auth, authorize('admin'), [
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('role').optional().isIn(['admin', 'manager', 'employee']).withMessage('Invalid role'),
  body('managerId').optional().isMongoId().withMessage('Invalid manager ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, role, managerId, isManagerApprover, isActive } = req.body;
    const userId = req.params.id;

    // Find user
    const user = await User.findOne({ 
      _id: userId, 
      company: req.user.company._id 
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from demoting themselves
    if (user._id.toString() === req.user._id.toString() && role && role !== 'admin') {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    // Validate manager if provided
    if (managerId) {
      const manager = await User.findOne({ 
        _id: managerId, 
        company: req.user.company._id,
        role: { $in: ['admin', 'manager'] }
      });
      if (!manager) {
        return res.status(400).json({ message: 'Invalid manager' });
      }
    }

    // Update user
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (managerId !== undefined) updateData.manager = managerId;
    if (isManagerApprover !== undefined) updateData.isManagerApprover = isManagerApprover;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    )
    .populate('manager', 'firstName lastName email')
    .select('-password');

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (soft delete)
// @access  Admin
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, company: req.user.company._id },
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('company')
      .populate('manager', 'firstName lastName email')
      .select('-password');

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
