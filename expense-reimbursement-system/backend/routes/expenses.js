const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Company = require('../models/Company');
const { auth, authorize } = require('../middleware/auth');
const { convertCurrency } = require('../utils/currency');
const { processReceipt } = require('../utils/ocr');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/receipts/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed'));
    }
  }
});

// @route   POST /api/expenses
// @desc    Create new expense
// @access  Employee
router.post('/', auth, authorize('employee', 'admin'), upload.single('receipt'), [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('originalCurrency').notEmpty().withMessage('Currency is required'),
  body('category').isIn(['travel', 'meals', 'accommodation', 'transport', 'office_supplies', 'entertainment', 'other']).withMessage('Invalid category'),
  body('description').notEmpty().withMessage('Description is required'),
  body('expenseDate').isISO8601().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, originalCurrency, category, description, expenseDate } = req.body;
    const company = await Company.findById(req.user.company._id);
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Convert currency
    const convertedAmount = await convertCurrency(amount, originalCurrency, company.currency);

    // Create expense
    const expense = new Expense({
      employee: req.user._id,
      company: company._id,
      amount: parseFloat(amount),
      originalCurrency,
      convertedAmount,
      companyCurrency: company.currency,
      category,
      description,
      expenseDate: new Date(expenseDate)
    });

    // Handle receipt upload
    if (req.file) {
      expense.receipt = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size
      };

      // Process OCR if it's an image
      if (req.file.mimetype.startsWith('image/')) {
        try {
          const ocrData = await processReceipt(req.file.path);
          expense.ocrData = ocrData;
          
          // Auto-fill fields if OCR data is available
          if (ocrData.extractedAmount && !amount) {
            expense.amount = ocrData.extractedAmount;
            expense.convertedAmount = await convertCurrency(ocrData.extractedAmount, originalCurrency, company.currency);
          }
          if (ocrData.extractedDate && !expenseDate) {
            expense.expenseDate = ocrData.extractedDate;
          }
          if (ocrData.extractedMerchant && !description) {
            expense.description = `Receipt from ${ocrData.extractedMerchant}`;
          }
        } catch (ocrError) {
          console.error('OCR processing failed:', ocrError);
          // Continue without OCR data
        }
      }
    }

    // Set up approval flow
    await setupApprovalFlow(expense, req.user, company);
    
    await expense.save();

    // Populate the expense with related data
    const populatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvalFlow.approver', 'firstName lastName email role');

    res.status(201).json({
      message: 'Expense created successfully',
      expense: populatedExpense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/expenses
// @desc    Get expenses based on user role
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = { company: req.user.company._id };
    
    // Filter based on user role
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    } else if (req.user.role === 'manager') {
      // Managers can see their team's expenses
      const teamMembers = await User.find({ 
        $or: [
          { manager: req.user._id },
          { _id: req.user._id }
        ],
        company: req.user.company._id
      }).select('_id');
      
      query.employee = { $in: teamMembers.map(member => member._id) };
    }
    // Admins can see all expenses (no additional filter)

    const expenses = await Expense.find(query)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvalFlow.approver', 'firstName lastName email role')
      .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/expenses/:id
// @desc    Get single expense
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvalFlow.approver', 'firstName lastName email role')
      .populate('approvalHistory.approver', 'firstName lastName email role');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check if user has permission to view this expense
    if (req.user.role === 'employee' && expense.employee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update expense (only if pending)
// @access  Employee
router.put('/:id', auth, authorize('employee', 'admin'), [
  body('amount').optional().isNumeric().withMessage('Amount must be a number'),
  body('category').optional().isIn(['travel', 'meals', 'accommodation', 'transport', 'office_supplies', 'entertainment', 'other']).withMessage('Invalid category'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('expenseDate').optional().isISO8601().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check permissions
    if (req.user.role === 'employee' && expense.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only allow updates if expense is pending
    if (expense.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot update approved or rejected expense' });
    }

    const { amount, category, description, expenseDate } = req.body;
    const company = await Company.findById(req.user.company._id);

    // Update fields
    if (amount) {
      expense.amount = parseFloat(amount);
      expense.convertedAmount = await convertCurrency(amount, expense.originalCurrency, company.currency);
    }
    if (category) expense.category = category;
    if (description) expense.description = description;
    if (expenseDate) expense.expenseDate = new Date(expenseDate);

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvalFlow.approver', 'firstName lastName email role');

    res.json({
      message: 'Expense updated successfully',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense (only if pending)
// @access  Employee/Admin
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check permissions
    if (req.user.role === 'employee' && expense.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only allow deletion if expense is pending
    if (expense.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot delete approved or rejected expense' });
    }

    await Expense.findByIdAndDelete(req.params.id);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to set up approval flow
async function setupApprovalFlow(expense, user, company) {
  const approvalFlow = [];
  let currentApprover = null;

  // Get the employee's manager if they have one and isManagerApprover is true
  if (user.manager && user.isManagerApprover) {
    const manager = await User.findById(user.manager);
    if (manager) {
      approvalFlow.push({
        approver: manager._id,
        order: 1,
        status: 'pending'
      });
      currentApprover = manager._id;
    }
  }

  // Add additional approvers based on amount thresholds
  const amount = expense.convertedAmount;
  const thresholds = company.settings.thresholds;
  let order = approvalFlow.length + 1;

  // Finance approval
  if (amount >= thresholds.financeApproval) {
    const financeManager = await User.findOne({ 
      company: company._id, 
      role: 'manager',
      isManagerApprover: true 
    });
    if (financeManager && financeManager._id.toString() !== currentApprover?.toString()) {
      approvalFlow.push({
        approver: financeManager._id,
        order: order++,
        status: 'pending'
      });
      if (!currentApprover) currentApprover = financeManager._id;
    }
  }

  // Director approval
  if (amount >= thresholds.directorApproval) {
    const director = await User.findOne({ 
      company: company._id, 
      role: 'admin' 
    });
    if (director && director._id.toString() !== currentApprover?.toString()) {
      approvalFlow.push({
        approver: director._id,
        order: order++,
        status: 'pending'
      });
      if (!currentApprover) currentApprover = director._id;
    }
  }

  // If no approvers found, assign to admin
  if (approvalFlow.length === 0) {
    const admin = await User.findOne({ 
      company: company._id, 
      role: 'admin' 
    });
    if (admin) {
      approvalFlow.push({
        approver: admin._id,
        order: 1,
        status: 'pending'
      });
      currentApprover = admin._id;
    }
  }

  expense.approvalFlow = approvalFlow;
  expense.currentApprover = currentApprover;
}

module.exports = router;
