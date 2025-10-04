# Expense Reimbursement System

A comprehensive expense reimbursement system built with the MERN stack (MongoDB, Express.js, React.js, Node.js) that streamlines the expense approval process for companies.

## Features

### Core Features
- **Authentication & User Management**: Secure JWT-based authentication with role-based access control
- **Multi-level Approval Workflow**: Configurable approval flows with manager, finance, and director levels
- **Flexible Approval Rules**: Support for percentage-based, specific approver, and hybrid approval rules
- **Currency Support**: Multi-currency support with real-time conversion using external APIs
- **OCR Receipt Processing**: Automatic receipt scanning and data extraction using Tesseract.js
- **Real-time Notifications**: Instant updates on approval status changes

### User Roles
- **Admin**: Full system access, user management, company settings, override approvals
- **Manager**: Approve/reject expenses, view team expenses, manage approval workflows
- **Employee**: Submit expenses, view personal expense history, track approval status

### Approval Workflow
1. **Employee submits expense** with receipt (optional OCR processing)
2. **Manager approval** (if employee has manager and isManagerApprover is true)
3. **Finance approval** (based on amount thresholds)
4. **Director approval** (for high-value expenses)
5. **Automatic approval** based on configured rules

### Approval Rules
- **Percentage Rule**: Approve if X% of approvers approve
- **Specific Approver Rule**: Auto-approve if specific role (e.g., CFO) approves
- **Hybrid Rule**: Approve if X% OR specific role approves

## Technology Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Multer** for file uploads
- **Tesseract.js** for OCR processing
- **Axios** for external API calls

### Frontend
- **React.js** with functional components and hooks
- **Material-UI** for responsive UI components
- **React Router** for navigation
- **React Hook Form** for form management
- **React Dropzone** for file uploads
- **Axios** for API communication

### External APIs
- **REST Countries API** for country and currency data
- **ExchangeRate-API** for currency conversion

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp config.env.example config.env
```

4. Update `config.env` with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/expense-reimbursement
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

5. Start the backend server:
```bash
npm run dev
```

The backend will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new company and admin
- `POST /api/auth/login` - User login
- `GET /api/auth/countries` - Get countries and currencies

### Users
- `GET /api/users` - Get all users (Admin/Manager)
- `POST /api/users` - Create new user (Admin)
- `PUT /api/users/:id` - Update user (Admin)
- `DELETE /api/users/:id` - Delete user (Admin)
- `GET /api/users/me` - Get current user profile

### Expenses
- `POST /api/expenses` - Create new expense (Employee)
- `GET /api/expenses` - Get expenses (role-based filtering)
- `GET /api/expenses/:id` - Get single expense
- `PUT /api/expenses/:id` - Update expense (Employee, pending only)
- `DELETE /api/expenses/:id` - Delete expense (Employee, pending only)

### Approvals
- `GET /api/approvals/pending` - Get pending approvals (Manager/Admin)
- `POST /api/approvals/:id/approve` - Approve expense (Manager/Admin)
- `POST /api/approvals/:id/reject` - Reject expense (Manager/Admin)
- `GET /api/approvals/history` - Get approval history (Manager/Admin)
- `GET /api/approvals/stats` - Get approval statistics (Manager/Admin)

### Company
- `GET /api/companies/me` - Get company details
- `PUT /api/companies/me` - Update company settings (Admin)
- `GET /api/companies/stats` - Get company statistics (Admin)

### Currency
- `GET /api/currency/rates` - Get currency exchange rates
- `POST /api/currency/convert` - Convert currency amount
- `GET /api/currency/countries` - Get countries and currencies

## Usage

### Getting Started
1. **Register a Company**: First user creates a company and becomes admin
2. **Create Users**: Admin creates employees and managers
3. **Configure Settings**: Set up approval rules and thresholds
4. **Submit Expenses**: Employees submit expenses with receipts
5. **Approve Expenses**: Managers review and approve/reject expenses

### Expense Submission
1. Navigate to "New Expense"
2. Fill in expense details (amount, currency, category, description, date)
3. Upload receipt (optional - OCR will auto-extract data)
4. Submit for approval

### Approval Process
1. Managers see pending approvals in their dashboard
2. Review expense details and receipt
3. Approve or reject with comments
4. System automatically moves to next approver or completes workflow

### OCR Receipt Processing
- Upload image files (JPG, PNG, GIF) or PDF
- System automatically extracts:
  - Amount
  - Date
  - Merchant name
  - Description
- Auto-fills expense form fields

## Configuration

### Approval Thresholds
Configure minimum amounts for different approval levels:
- Manager Approval: Default $1,000
- Finance Approval: Default $5,000
- Director Approval: Default $10,000

### Approval Rules
Set up flexible approval criteria:
- Percentage-based approval (e.g., 60% of approvers must approve)
- Specific role approval (e.g., CFO approval auto-approves)
- Hybrid rules combining both approaches

## File Structure

```
expense-reimbursement-system/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication middleware
│   ├── utils/           # Utility functions
│   ├── uploads/         # File uploads
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts
│   │   ├── services/    # API services
│   │   └── utils/       # Utility functions
│   └── public/          # Static assets
└── README.md
```

## Security Features

- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Input validation and sanitization
- File upload restrictions
- CORS configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please contact the development team or create an issue in the repository.