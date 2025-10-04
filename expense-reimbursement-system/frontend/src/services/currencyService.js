import api from './api';

export const currencyService = {
  getRates: async (base = 'USD') => {
    const response = await api.get(`/currency/rates?base=${base}`);
    return response.data;
  },

  convertCurrency: async (amount, from, to) => {
    const response = await api.post('/currency/convert', { amount, from, to });
    return response.data;
  },

  getCountries: async () => {
    const response = await api.get('/currency/countries');
    return response.data;
  },
};
