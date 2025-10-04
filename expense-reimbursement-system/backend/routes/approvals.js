const express = require('express');
const { body, validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Company = require('../models/Company');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/approvals/pending
// @desc    Get pending approvals for current user
// @access  Manager/Admin
router.get('/pending', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const expenses = await Expense.find({
      company: req.user.company._id,
      currentApprover: req.user._id,
      status: 'pending'
    })
    .populate('employee', 'firstName lastName email')
    .populate('approvalFlow.approver', 'firstName lastName email role')
    .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/approvals/:id/approve
// @desc    Approve an expense
// @access  Manager/Admin
router.post('/:id/approve', auth, authorize('manager', 'admin'), [
  body('comments').optional().isString().withMessage('Comments must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { comments } = req.body;
    const expenseId = req.params.id;

    const expense = await Expense.findById(expenseId)
      .populate('company')
      .populate('approvalFlow.approver', 'role');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check if current user is the current approver
    if (expense.currentApprover.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to approve this expense' });
    }

    // Update approval flow
    const currentApproval = expense.approvalFlow.find(flow => 
      flow.approver._id.toString() === req.user._id.toString() && 
      flow.status === 'pending'
    );

    if (!currentApproval) {
      return res.status(400).json({ message: 'No pending approval found for current user' });
    }

    currentApproval.status = 'approved';
    currentApproval.comments = comments || '';
    currentApproval.timestamp = new Date();

    // Add to approval history
    expense.approvalHistory.push({
      approver: req.user._id,
      action: 'approved',
      comments: comments || '',
      timestamp: new Date()
    });

    // Check if expense meets approval criteria
    const meetsCriteria = expense.checkApprovalCriteria(expense.company);
    
    if (meetsCriteria) {
      // Expense is fully approved
      expense.status = 'approved';
      expense.currentApprover = null;
    } else {
      // Move to next approver
      const nextApproval = expense.approvalFlow.find(flow => 
        flow.status === 'pending' && 
        flow.order > currentApproval.order
      );

      if (nextApproval) {
        expense.currentApprover = nextApproval.approver;
      } else {
        // No more approvers, check if we can approve based on rules
        const approvalPercentage = expense.getApprovalPercentage();
        const settings = expense.company.settings.approvalRules;

        if (settings.percentageRule.enabled && approvalPercentage >= settings.percentageRule.percentage) {
          expense.status = 'approved';
          expense.currentApprover = null;
        } else if (settings.specificApproverRule.enabled) {
          const hasSpecificApprover = expense.approvalFlow.some(flow => 
            flow.approver.role === settings.specificApproverRule.approverRole && 
            flow.status === 'approved'
          );
          if (hasSpecificApprover) {
            expense.status = 'approved';
            expense.currentApprover = null;
          }
        } else {
          // Default: approve if any approver approved
          expense.status = 'approved';
          expense.currentApprover = null;
        }
      }
    }

    await expense.save();

    const updatedExpense = await Expense.findById(expenseId)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvalFlow.approver', 'firstName lastName email role')
      .populate('approvalHistory.approver', 'firstName lastName email role');

    res.json({
      message: 'Expense approved successfully',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/approvals/:id/reject
// @desc    Reject an expense
// @access  Manager/Admin
router.post('/:id/reject', auth, authorize('manager', 'admin'), [
  body('comments').notEmpty().withMessage('Rejection comments are required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { comments } = req.body;
    const expenseId = req.params.id;

    const expense = await Expense.findById(expenseId);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check if current user is the current approver
    if (expense.currentApprover.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to reject this expense' });
    }

    // Update approval flow
    const currentApproval = expense.approvalFlow.find(flow => 
      flow.approver._id.toString() === req.user._id.toString() && 
      flow.status === 'pending'
    );

    if (!currentApproval) {
      return res.status(400).json({ message: 'No pending approval found for current user' });
    }

    currentApproval.status = 'rejected';
    currentApproval.comments = comments;
    currentApproval.timestamp = new Date();

    // Add to approval history
    expense.approvalHistory.push({
      approver: req.user._id,
      action: 'rejected',
      comments: comments,
      timestamp: new Date()
    });

    // Reject the expense
    expense.status = 'rejected';
    expense.currentApprover = null;

    await expense.save();

    const updatedExpense = await Expense.findById(expenseId)
      .populate('employee', 'firstName lastName email')
      .populate('approvalFlow.approver', 'firstName lastName email role')
      .populate('approvalHistory.approver', 'firstName lastName email role');

    res.json({
      message: 'Expense rejected successfully',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Reject expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/approvals/history
// @desc    Get approval history for current user
// @access  Manager/Admin
router.get('/history', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const expenses = await Expense.find({
      company: req.user.company._id,
      'approvalHistory.approver': req.user._id
    })
    .populate('employee', 'firstName lastName email')
    .populate('approvalFlow.approver', 'firstName lastName email role')
    .populate('approvalHistory.approver', 'firstName lastName email role')
    .sort({ 'approvalHistory.timestamp': -1 });

    res.json(expenses);
  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/approvals/stats
// @desc    Get approval statistics
// @access  Manager/Admin
router.get('/stats', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const companyId = req.user.company._id;
    const userId = req.user._id;

    const stats = await Expense.aggregate([
      {
        $match: {
          company: companyId,
          'approvalHistory.approver': userId
        }
      },
      {
        $unwind: '$approvalHistory'
      },
      {
        $match: {
          'approvalHistory.approver': userId
        }
      },
      {
        $group: {
          _id: '$approvalHistory.action',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalApprovals = stats.reduce((sum, stat) => sum + stat.count, 0);
    const approvedCount = stats.find(stat => stat._id === 'approved')?.count || 0;
    const rejectedCount = stats.find(stat => stat._id === 'rejected')?.count || 0;

    res.json({
      totalApprovals,
      approvedCount,
      rejectedCount,
      approvalRate: totalApprovals > 0 ? (approvedCount / totalApprovals) * 100 : 0
    });
  } catch (error) {
    console.error('Get approval stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
