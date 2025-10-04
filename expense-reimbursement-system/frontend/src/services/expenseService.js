import api from './api';

export const expenseService = {
  createExpense: async (expenseData) => {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(expenseData).forEach(key => {
      if (key !== 'receipt' && expenseData[key] !== null && expenseData[key] !== undefined) {
        formData.append(key, expenseData[key]);
      }
    });

    // Add file if present
    if (expenseData.receipt) {
      formData.append('receipt', expenseData.receipt);
    }

    const response = await api.post('/expenses', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getExpenses: async () => {
    const response = await api.get('/expenses');
    return response.data;
  },

  getExpense: async (id) => {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  },

  updateExpense: async (id, expenseData) => {
    const response = await api.put(`/expenses/${id}`, expenseData);
    return response.data;
  },

  deleteExpense: async (id) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },

  approveExpense: async (id, comments) => {
    const response = await api.post(`/approvals/${id}/approve`, { comments });
    return response.data;
  },

  rejectExpense: async (id, comments) => {
    const response = await api.post(`/approvals/${id}/reject`, { comments });
    return response.data;
  },

  getPendingApprovals: async () => {
    const response = await api.get('/approvals/pending');
    return response.data;
  },

  getApprovalHistory: async () => {
    const response = await api.get('/approvals/history');
    return response.data;
  },

  getApprovalStats: async () => {
    const response = await api.get('/approvals/stats');
    return response.data;
  },
};
