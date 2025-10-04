import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { companyService } from '../services/companyService';
import { currencyService } from '../services/currencyService';

function CompanySettings() {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    currency: '',
    settings: {
      approvalRules: {
        percentageRule: {
          enabled: false,
          percentage: 60,
        },
        specificApproverRule: {
          enabled: false,
          approverRole: 'CFO',
        },
        hybridRule: {
          enabled: false,
          percentage: 60,
          specificRole: 'CFO',
        },
      },
      thresholds: {
        managerApproval: 1000,
        financeApproval: 5000,
        directorApproval: 10000,
      },
    },
  });

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const [companyData, currencyData] = await Promise.all([
        companyService.getCompany(),
        currencyService.getCountries()
      ]);
      
      setCompany(companyData);
      setFormData({
        name: companyData.name,
        country: companyData.country,
        currency: companyData.currency,
        settings: companyData.settings,
      });
      
      // Extract unique currencies from countries
      const uniqueCurrencies = [...new Set(currencyData.flatMap(c => c.currencies))];
      setCurrencies(uniqueCurrencies);
    } catch (err) {
      setError('Failed to fetch company data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const keys = name.split('.');
      setFormData(prev => {
        const newData = { ...prev };
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = type === 'checkbox' ? checked : value;
        return newData;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await companyService.updateCompany(formData);
      setSuccess('Company settings updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update company settings');
    } finally {
      setSaving(false);
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
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Company Settings
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
          {/* Basic Information */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Basic Information" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      name="name"
                      label="Company Name"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      name="country"
                      label="Country"
                      value={formData.country}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Currency</InputLabel>
                      <Select
                        name="currency"
                        value={formData.currency}
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
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Approval Rules */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Approval Rules" />
              <CardContent>
                <Grid container spacing={3}>
                  {/* Percentage Rule */}
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.settings.approvalRules.percentageRule.enabled}
                          onChange={handleChange}
                          name="settings.approvalRules.percentageRule.enabled"
                        />
                      }
                      label="Percentage Rule: Approve if X% of approvers approve"
                    />
                    {formData.settings.approvalRules.percentageRule.enabled && (
                      <TextField
                        type="number"
                        label="Percentage"
                        value={formData.settings.approvalRules.percentageRule.percentage}
                        onChange={handleChange}
                        name="settings.approvalRules.percentageRule.percentage"
                        inputProps={{ min: 0, max: 100 }}
                        sx={{ mt: 1, width: 200 }}
                      />
                    )}
                  </Grid>

                  {/* Specific Approver Rule */}
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.settings.approvalRules.specificApproverRule.enabled}
                          onChange={handleChange}
                          name="settings.approvalRules.specificApproverRule.enabled"
                        />
                      }
                      label="Specific Approver Rule: Auto-approve if specific role approves"
                    />
                    {formData.settings.approvalRules.specificApproverRule.enabled && (
                      <FormControl sx={{ mt: 1, minWidth: 200 }}>
                        <InputLabel>Approver Role</InputLabel>
                        <Select
                          value={formData.settings.approvalRules.specificApproverRule.approverRole}
                          onChange={handleChange}
                          name="settings.approvalRules.specificApproverRule.approverRole"
                          label="Approver Role"
                        >
                          <MenuItem value="CFO">CFO</MenuItem>
                          <MenuItem value="Director">Director</MenuItem>
                          <MenuItem value="Manager">Manager</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  </Grid>

                  {/* Hybrid Rule */}
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.settings.approvalRules.hybridRule.enabled}
                          onChange={handleChange}
                          name="settings.approvalRules.hybridRule.enabled"
                        />
                      }
                      label="Hybrid Rule: Approve if X% OR specific role approves"
                    />
                    {formData.settings.approvalRules.hybridRule.enabled && (
                      <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                          type="number"
                          label="Percentage"
                          value={formData.settings.approvalRules.hybridRule.percentage}
                          onChange={handleChange}
                          name="settings.approvalRules.hybridRule.percentage"
                          inputProps={{ min: 0, max: 100 }}
                          sx={{ width: 200 }}
                        />
                        <FormControl sx={{ minWidth: 200 }}>
                          <InputLabel>Specific Role</InputLabel>
                          <Select
                            value={formData.settings.approvalRules.hybridRule.specificRole}
                            onChange={handleChange}
                            name="settings.approvalRules.hybridRule.specificRole"
                            label="Specific Role"
                          >
                            <MenuItem value="CFO">CFO</MenuItem>
                            <MenuItem value="Director">Director</MenuItem>
                            <MenuItem value="Manager">Manager</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Approval Thresholds */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Approval Thresholds" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      type="number"
                      fullWidth
                      name="settings.thresholds.managerApproval"
                      label="Manager Approval Threshold"
                      value={formData.settings.thresholds.managerApproval}
                      onChange={handleChange}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      type="number"
                      fullWidth
                      name="settings.thresholds.financeApproval"
                      label="Finance Approval Threshold"
                      value={formData.settings.thresholds.financeApproval}
                      onChange={handleChange}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      type="number"
                      fullWidth
                      name="settings.thresholds.directorApproval"
                      label="Director Approval Threshold"
                      value={formData.settings.thresholds.directorApproval}
                      onChange={handleChange}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
                variant="outlined"
                onClick={() => fetchCompanyData()}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : 'Save Settings'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default CompanySettings;
