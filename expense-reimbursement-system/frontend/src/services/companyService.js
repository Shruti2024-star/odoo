import api from './api';

export const companyService = {
  getCompany: async () => {
    const response = await api.get('/companies/me');
    return response.data;
  },

  updateCompany: async (companyData) => {
    const response = await api.put('/companies/me', companyData);
    return response.data;
  },

  getCompanyStats: async () => {
    const response = await api.get('/companies/stats');
    return response.data;
  },
};
