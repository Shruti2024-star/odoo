const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  currencySymbol: {
    type: String,
    default: '$'
  },
  settings: {
    approvalRules: {
      percentageRule: {
        enabled: { type: Boolean, default: false },
        percentage: { type: Number, default: 60 }
      },
      specificApproverRule: {
        enabled: { type: Boolean, default: false },
        approverRole: { type: String, default: 'CFO' }
      },
      hybridRule: {
        enabled: { type: Boolean, default: false },
        percentage: { type: Number, default: 60 },
        specificRole: { type: String, default: 'CFO' }
      }
    },
    thresholds: {
      managerApproval: { type: Number, default: 1000 },
      financeApproval: { type: Number, default: 5000 },
      directorApproval: { type: Number, default: 10000 }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

companySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Company', companySchema);
