import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Receipt,
  CheckCircle,
  TrendingUp,
  AttachMoney,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { expenseService } from '../services/expenseService';
import { companyService } from '../services/companyService';

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalExpenses: 0,
    pendingExpenses: 0,
    approvedExpenses: 0,
    totalAmount: 0,
  });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [expenses, approvals, companyStats] = await Promise.all([
          expenseService.getExpenses(),
          user.role === 'manager' || user.role === 'admin' 
            ? expenseService.getPendingApprovals() 
            : Promise.resolve([]),
          user.role === 'admin' 
            ? companyService.getCompanyStats() 
            : Promise.resolve({})
        ]);

        // Calculate stats
        const totalExpenses = expenses.length;
        const pendingExpenses = expenses.filter(e => e.status === 'pending').length;
        const approvedExpenses = expenses.filter(e => e.status === 'approved').length;
        const totalAmount = expenses.reduce((sum, e) => sum + e.convertedAmount, 0);

        setStats({
          totalExpenses,
          pendingExpenses,
          approvedExpenses,
          totalAmount,
        });

        setRecentExpenses(expenses.slice(0, 5));
        setPendingApprovals(approvals.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.role]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user.firstName}!
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Here's what's happening with your expenses.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Receipt color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Expenses
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalExpenses}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pending
                  </Typography>
                  <Typography variant="h4">
                    {stats.pendingExpenses}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckCircle color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Approved
                  </Typography>
                  <Typography variant="h4">
                    {stats.approvedExpenses}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AttachMoney color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Amount
                  </Typography>
                  <Typography variant="h4">
                    {user.company?.currencySymbol || '$'}{stats.totalAmount.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Expenses */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Recent Expenses</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/expenses')}
              >
                View All
              </Button>
            </Box>
            {recentExpenses.length > 0 ? (
              <List>
                {recentExpenses.map((expense) => (
                  <ListItem key={expense._id} divider>
                    <ListItemText
                      primary={expense.description}
                      secondary={`${user.company?.currencySymbol || '$'}${expense.convertedAmount.toFixed(2)} • ${new Date(expense.expenseDate).toLocaleDateString()}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={expense.status}
                        color={getStatusColor(expense.status)}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="textSecondary" align="center">
                No expenses yet
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Pending Approvals (for managers/admins) */}
        {(user.role === 'manager' || user.role === 'admin') && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Pending Approvals</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/approvals')}
                >
                  View All
                </Button>
              </Box>
              {pendingApprovals.length > 0 ? (
                <List>
                  {pendingApprovals.map((expense) => (
                    <ListItem key={expense._id} divider>
                      <ListItemText
                        primary={`${expense.employee.firstName} ${expense.employee.lastName}`}
                        secondary={`${user.company?.currencySymbol || '$'}${expense.convertedAmount.toFixed(2)} • ${expense.description}`}
                      />
                      <ListItemSecondaryAction>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate('/approvals')}
                        >
                          Review
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="textSecondary" align="center">
                  No pending approvals
                </Typography>
              )}
            </Paper>
          </Grid>
        )}

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/expenses/new')}
              >
                New Expense
              </Button>
              <Button
                variant="outlined"
                startIcon={<Receipt />}
                onClick={() => navigate('/expenses')}
              >
                View Expenses
              </Button>
              {(user.role === 'manager' || user.role === 'admin') && (
                <Button
                  variant="outlined"
                  startIcon={<CheckCircle />}
                  onClick={() => navigate('/approvals')}
                >
                  Review Approvals
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
