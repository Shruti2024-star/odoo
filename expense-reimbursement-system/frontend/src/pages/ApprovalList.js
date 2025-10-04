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
  Tabs,
  Tab,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { expenseService } from '../services/expenseService';

function ApprovalList() {
  const { user } = useAuth();
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [approvedExpenses, setApprovedExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [comments, setComments] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      const [pending, approved] = await Promise.all([
        expenseService.getPendingApprovals(),
        expenseService.getApprovalHistory()
      ]);
      setPendingExpenses(pending);
      setApprovedExpenses(approved);
    } catch (err) {
      setError('Failed to fetch approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (expense) => {
    setSelectedExpense(expense);
    setViewDialogOpen(true);
  };

  const handleAction = (expense, type) => {
    setSelectedExpense(expense);
    setActionType(type);
    setComments('');
    setActionDialogOpen(true);
  };

  const confirmAction = async () => {
    try {
      if (actionType === 'approve') {
        await expenseService.approveExpense(selectedExpense._id, comments);
      } else {
        await expenseService.rejectExpense(selectedExpense._id, comments);
      }
      
      // Refresh the list
      await fetchApprovals();
      setActionDialogOpen(false);
      setSelectedExpense(null);
      setComments('');
    } catch (err) {
      setError(`Failed to ${actionType} expense`);
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

  const formatCurrency = (amount) => {
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
      <Typography variant="h4" gutterBottom>
        Expense Approvals
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mt: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Pending (${pendingExpenses.length})`} />
          <Tab label={`History (${approvedExpenses.length})`} />
        </Tabs>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(tabValue === 0 ? pendingExpenses : approvedExpenses).map((expense) => (
                <TableRow key={expense._id}>
                  <TableCell>
                    {expense.employee.firstName} {expense.employee.lastName}
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>
                    {formatCurrency(expense.convertedAmount)}
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
                    {tabValue === 0 && expense.status === 'pending' && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleAction(expense, 'approve')}
                          color="success"
                        >
                          <CheckCircle />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleAction(expense, 'reject')}
                          color="error"
                        >
                          <Cancel />
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
                  <strong>Employee:</strong> {selectedExpense.employee.firstName} {selectedExpense.employee.lastName}
                </Typography>
                <Typography>
                  <strong>Amount:</strong> {formatCurrency(selectedExpense.convertedAmount)}
                </Typography>
              </Box>
              <Typography>
                <strong>Category:</strong> {selectedExpense.category}
              </Typography>
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

      {/* Action Dialog */}
      <Dialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionType === 'approve' ? 'Approve Expense' : 'Reject Expense'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Comments"
            fullWidth
            multiline
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={actionType === 'approve' ? 'Optional approval comments...' : 'Please provide reason for rejection...'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmAction}
            color={actionType === 'approve' ? 'success' : 'error'}
            variant="contained"
          >
            {actionType === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ApprovalList;
