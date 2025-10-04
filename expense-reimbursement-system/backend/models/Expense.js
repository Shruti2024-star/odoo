const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  originalCurrency: {
    type: String,
    required: true
  },
  convertedAmount: {
    type: Number,
    required: true
  },
  companyCurrency: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['travel', 'meals', 'accommodation', 'transport', 'office_supplies', 'entertainment', 'other']
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  expenseDate: {
    type: Date,
    required: true
  },
  receipt: {
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'partially_approved'],
    default: 'pending'
  },
  currentApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvalHistory: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      enum: ['approved', 'rejected'],
      required: true
    },
    comments: {
      type: String,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  approvalFlow: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    order: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'skipped'],
      default: 'pending'
    },
    comments: String,
    timestamp: Date
  }],
  ocrData: {
    extractedText: String,
    confidence: Number,
    extractedAmount: Number,
    extractedDate: Date,
    extractedMerchant: String,
    processed: {
      type: Boolean,
      default: false
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

// Update timestamp
expenseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate total approval percentage
expenseSchema.methods.getApprovalPercentage = function() {
  const totalApprovers = this.approvalFlow.length;
  const approvedCount = this.approvalFlow.filter(flow => flow.status === 'approved').length;
  return totalApprovers > 0 ? (approvedCount / totalApprovers) * 100 : 0;
};

// Check if expense meets approval criteria
expenseSchema.methods.checkApprovalCriteria = function(company) {
  const settings = company.settings.approvalRules;
  const approvalPercentage = this.getApprovalPercentage();
  
  // Check percentage rule
  if (settings.percentageRule.enabled) {
    if (approvalPercentage >= settings.percentageRule.percentage) {
      return true;
    }
  }
  
  // Check specific approver rule
  if (settings.specificApproverRule.enabled) {
    const specificApprover = this.approvalFlow.find(flow => 
      flow.approver.role === settings.specificApproverRule.approverRole && 
      flow.status === 'approved'
    );
    if (specificApprover) {
      return true;
    }
  }
  
  // Check hybrid rule
  if (settings.hybridRule.enabled) {
    const hasSpecificApprover = this.approvalFlow.some(flow => 
      flow.approver.role === settings.hybridRule.specificRole && 
      flow.status === 'approved'
    );
    
    if (hasSpecificApprover || approvalPercentage >= settings.hybridRule.percentage) {
      return true;
    }
  }
  
  return false;
};

module.exports = mongoose.model('Expense', expenseSchema);
