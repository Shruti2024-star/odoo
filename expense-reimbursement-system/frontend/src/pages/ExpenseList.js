import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { expenseService } from '../services/expenseService';

function ExpenseList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const data = await expenseService.getExpenses();
      setExpenses(data);
    } catch (err) {
      setError('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (expense) => {
    setSelectedExpense(expense);
    setViewDialogOpen(true);
  };

  const handleEdit = (expense) => {
    navigate(`/expenses/edit/${expense._id}`);
  };

  const handleDelete = (expense) => {
    setSelectedExpense(expense);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await expenseService.deleteExpense(selectedExpense._id);
      setExpenses(expenses.filter(e => e._id !== selectedExpense._id));
      setDeleteDialogOpen(false);
      setSelectedExpense(null);
    } catch (err) {
      setError('Failed to delete expense');
    }
  };

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

  const formatCurrency = (amount, currency) => {
    return `${user?.company?.currencySymbol || '$'}${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">My Expenses</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/expenses/new')}
        >
          New Expense
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense._id}>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>
                    {formatCurrency(expense.convertedAmount, user?.company?.currency)}
                  </TableCell>
                  <TableCell>
                    {expense.category.charAt(0).toUpperCase() + expense.category.slice(1).replace('_', ' ')}
                  </TableCell>
                  <TableCell>
                    {new Date(expense.expenseDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={expense.status}
                      color={getStatusColor(expense.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleView(expense)}
                    >
                      <Visibility />
                    </IconButton>
                    {expense.status === 'pending' && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(expense)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(expense)}
                        >
                          <Delete />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Expense Details</DialogTitle>
        <DialogContent>
          {selectedExpense && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedExpense.description}
              </Typography>
              <Box display="flex" gap={2} mb={2}>
                <Typography>
                  <strong>Amount:</strong> {formatCurrency(selectedExpense.convertedAmount, user?.company?.currency)}
                </Typography>
                <Typography>
                  <strong>Category:</strong> {selectedExpense.category}
                </Typography>
              </Box>
              <Typography>
                <strong>Date:</strong> {new Date(selectedExpense.expenseDate).toLocaleDateString()}
              </Typography>
              <Typography>
                <strong>Status:</strong> {selectedExpense.status}
              </Typography>
              {selectedExpense.receipt && (
                <Box mt={2}>
                  <Typography variant="h6">Receipt</Typography>
                  <Typography variant="body2">
                    {selectedExpense.receipt.originalName}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Expense</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this expense? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ExpenseList;
