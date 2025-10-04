const express = require('express');
const { auth } = require('../middleware/auth');
const { getCurrencyRates, convertCurrency, getCountriesAndCurrencies } = require('../utils/currency');

const router = express.Router();

// @route   GET /api/currency/rates
// @desc    Get current currency rates
// @access  Private
router.get('/rates', auth, async (req, res) => {
  try {
    const { base = 'USD' } = req.query;
    const rates = await getCurrencyRates(base);
    
    res.json({
      base,
      rates,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Get currency rates error:', error);
    res.status(500).json({ message: 'Failed to fetch currency rates' });
  }
});

// @route   POST /api/currency/convert
// @desc    Convert currency amount
// @access  Private
router.post('/convert', auth, async (req, res) => {
  try {
    const { amount, from, to } = req.body;

    if (!amount || !from || !to) {
      return res.status(400).json({ 
        message: 'Amount, from currency, and to currency are required' 
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        message: 'Amount must be a positive number' 
      });
    }

    const convertedAmount = await convertCurrency(parseFloat(amount), from, to);
    
    res.json({
      originalAmount: parseFloat(amount),
      fromCurrency: from,
      toCurrency: to,
      convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({ message: 'Failed to convert currency' });
  }
});

// @route   GET /api/currency/countries
// @desc    Get list of countries and their currencies
// @access  Private
router.get('/countries', auth, async (req, res) => {
  try {
    const countries = await getCountriesAndCurrencies();
    res.json(countries);
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({ message: 'Failed to fetch countries' });
  }
});

module.exports = router;
