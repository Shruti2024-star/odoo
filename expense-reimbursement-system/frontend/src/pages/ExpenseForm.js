import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { expenseService } from '../services/expenseService';
import { currencyService } from '../services/currencyService';
import dayjs from 'dayjs';

const categories = [
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'transport', label: 'Transport' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' },
];

function ExpenseForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    amount: '',
    originalCurrency: 'USD',
    category: '',
    description: '',
    expenseDate: dayjs(),
  });
  const [currencies, setCurrencies] = useState([]);
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [receipt, setReceipt] = useState(null);
  const [ocrData, setOcrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await currencyService.getRates();
        setCurrencies(Object.keys(response.rates));
      } catch (err) {
        console.error('Failed to fetch currencies:', err);
      }
    };
    fetchCurrencies();
  }, []);

  useEffect(() => {
    const convertCurrency = async () => {
      if (formData.amount && formData.originalCurrency && user?.company?.currency) {
        try {
          const response = await currencyService.convertCurrency(
            parseFloat(formData.amount),
            formData.originalCurrency,
            user.company.currency
          );
          setConvertedAmount(response.convertedAmount);
        } catch (err) {
          console.error('Currency conversion failed:', err);
        }
      }
    };
    convertCurrency();
  }, [formData.amount, formData.originalCurrency, user?.company?.currency]);

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setReceipt(acceptedFiles[0]);
      setOcrData(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDateChange = (date) => {
    setFormData({
      ...formData,
      expenseDate: date,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const submitData = {
        ...formData,
        expenseDate: formData.expenseDate.format('YYYY-MM-DD'),
        receipt: receipt,
      };

      await expenseService.createExpense(submitData);
      setSuccess('Expense submitted successfully!');
      setTimeout(() => {
        navigate('/expenses');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          New Expense
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="amount"
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={handleChange}
                inputProps={{ step: '0.01', min: '0' }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Currency</InputLabel>
                <Select
                  name="originalCurrency"
                  value={formData.originalCurrency}
                  label="Currency"
                  onChange={handleChange}
                >
                  {currencies.map((currency) => (
                    <MenuItem key={currency} value={currency}>
                      {currency}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {convertedAmount > 0 && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Converted amount: {user?.company?.currencySymbol || '$'}{convertedAmount.toFixed(2)} {user?.company?.currency}
                </Alert>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={formData.category}
                  label="Category"
                  onChange={handleChange}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Expense Date"
                  value={formData.expenseDate}
                  onChange={handleDateChange}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="description"
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Receipt Upload (Optional)
              </Typography>
              <Card>
                <CardContent>
                  <div {...getRootProps()} style={{ textAlign: 'center', padding: '20px' }}>
                    <input {...getInputProps()} />
                    {isDragActive ? (
                      <Typography>Drop the receipt here...</Typography>
                    ) : (
                      <Box>
                        <Typography variant="body1" gutterBottom>
                          Drag & drop a receipt here, or click to select
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Supports: JPG, PNG, GIF, PDF
                        </Typography>
                      </Box>
                    )}
                  </div>
                  {receipt && (
                    <Box mt={2}>
                      <Typography variant="body2">
                        Selected: {receipt.name}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => navigate('/expenses')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Submit Expense'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
}

export default ExpenseForm;
