const express = require('express');
const { body, validationResult } = require('express-validator');
const Company = require('../models/Company');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/companies/me
// @desc    Get current user's company
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.user.company._id);
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/companies/me
// @desc    Update company settings
// @access  Admin
router.put('/me', auth, authorize('admin'), [
  body('name').optional().notEmpty().withMessage('Company name cannot be empty'),
  body('country').optional().notEmpty().withMessage('Country cannot be empty'),
  body('currency').optional().notEmpty().withMessage('Currency cannot be empty'),
  body('settings.approvalRules.percentageRule.enabled').optional().isBoolean(),
  body('settings.approvalRules.percentageRule.percentage').optional().isNumeric().isFloat({ min: 0, max: 100 }),
  body('settings.approvalRules.specificApproverRule.enabled').optional().isBoolean(),
  body('settings.approvalRules.specificApproverRule.approverRole').optional().notEmpty(),
  body('settings.approvalRules.hybridRule.enabled').optional().isBoolean(),
  body('settings.approvalRules.hybridRule.percentage').optional().isNumeric().isFloat({ min: 0, max: 100 }),
  body('settings.approvalRules.hybridRule.specificRole').optional().notEmpty(),
  body('settings.thresholds.managerApproval').optional().isNumeric().isFloat({ min: 0 }),
  body('settings.thresholds.financeApproval').optional().isNumeric().isFloat({ min: 0 }),
  body('settings.thresholds.directorApproval').optional().isNumeric().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, country, currency, settings } = req.body;
    const company = await Company.findById(req.user.company._id);

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Update basic info
    if (name) company.name = name;
    if (country) company.country = country;
    if (currency) {
      company.currency = currency;
      company.currencySymbol = getCurrencySymbol(currency);
    }

    // Update settings
    if (settings) {
      if (settings.approvalRules) {
        if (settings.approvalRules.percentageRule) {
          company.settings.approvalRules.percentageRule = {
            ...company.settings.approvalRules.percentageRule,
            ...settings.approvalRules.percentageRule
          };
        }
        if (settings.approvalRules.specificApproverRule) {
          company.settings.approvalRules.specificApproverRule = {
            ...company.settings.approvalRules.specificApproverRule,
            ...settings.approvalRules.specificApproverRule
          };
        }
        if (settings.approvalRules.hybridRule) {
          company.settings.approvalRules.hybridRule = {
            ...company.settings.approvalRules.hybridRule,
            ...settings.approvalRules.hybridRule
          };
        }
      }
      if (settings.thresholds) {
        company.settings.thresholds = {
          ...company.settings.thresholds,
          ...settings.thresholds
        };
      }
    }

    await company.save();

    res.json({
      message: 'Company updated successfully',
      company
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/companies/stats
// @desc    Get company statistics
// @access  Admin
router.get('/stats', auth, authorize('admin'), async (req, res) => {
  try {
    const companyId = req.user.company._id;

    // Get expense statistics
    const expenseStats = await require('../models/Expense').aggregate([
      { $match: { company: companyId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$convertedAmount' }
        }
      }
    ]);

    // Get user statistics
    const userStats = await require('../models/User').aggregate([
      { $match: { company: companyId, isActive: true } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get monthly expense trends
    const monthlyStats = await require('../models/Expense').aggregate([
      { $match: { company: companyId } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$convertedAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.json({
      expenses: expenseStats,
      users: userStats,
      monthlyTrends: monthlyStats
    });
  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to get currency symbol
function getCurrencySymbol(currency) {
  const symbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$',
    'CHF': 'CHF',
    'CNY': '¥',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'CZK': 'Kč',
    'HUF': 'Ft',
    'RUB': '₽',
    'BRL': 'R$',
    'MXN': '$',
    'ZAR': 'R',
    'KRW': '₩',
    'SGD': 'S$',
    'HKD': 'HK$',
    'NZD': 'NZ$',
    'TRY': '₺',
    'THB': '฿',
    'MYR': 'RM',
    'PHP': '₱',
    'IDR': 'Rp',
    'VND': '₫'
  };
  return symbols[currency] || currency;
}

module.exports = router;
