const axios = require('axios');

// Cache for currency rates to avoid frequent API calls
let currencyRates = {};
let lastUpdated = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const getCurrencyRates = async (baseCurrency = 'USD') => {
  try {
    // Check if we have recent cached data
    if (currencyRates[baseCurrency] && lastUpdated && 
        (Date.now() - lastUpdated) < CACHE_DURATION) {
      return currencyRates[baseCurrency];
    }

    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    currencyRates[baseCurrency] = response.data.rates;
    lastUpdated = Date.now();
    
    return currencyRates[baseCurrency];
  } catch (error) {
    console.error('Error fetching currency rates:', error);
    throw new Error('Failed to fetch currency rates');
  }
};

const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  try {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rates = await getCurrencyRates(fromCurrency);
    const rate = rates[toCurrency];
    
    if (!rate) {
      throw new Error(`Currency ${toCurrency} not found in rates`);
    }

    return amount * rate;
  } catch (error) {
    console.error('Currency conversion error:', error);
    throw error;
  }
};

const getCountriesAndCurrencies = async () => {
  try {
    const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,currencies');
    return response.data.map(country => ({
      name: country.name.common,
      currencies: Object.keys(country.currencies || {})
    }));
  } catch (error) {
    console.error('Error fetching countries:', error);
    throw new Error('Failed to fetch countries and currencies');
  }
};

module.exports = {
  getCurrencyRates,
  convertCurrency,
  getCountriesAndCurrencies
};
