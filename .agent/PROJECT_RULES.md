# Finance App - Development Rules & Conventions

This document defines the design patterns, conventions, and implementation standards for the Finance Management Application. Follow these rules when adding new features or modifying existing code.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Backend Conventions](#backend-conventions)
3. [Frontend Conventions](#frontend-conventions)
4. [Component Patterns](#component-patterns)
5. [API Design](#api-design)
6. [Authentication & Authorization](#authentication--authorization)
7. [Database Models](#database-models)
8. [Error Handling](#error-handling)
9. [UI/UX Standards](#uiux-standards)

---

## Project Structure

```
Loan App/
├── apps/
│   ├── client/          # React frontend
│   │   ├── src/
│   │   │   ├── components/   # Reusable components
│   │   │   │   ├── ui/       # shadcn/ui components
│   │   │   │   └── ...       # Feature components
│   │   │   ├── pages/        # Page components
│   │   │   ├── lib/          # Utilities (axios, utils)
│   │   │   └── App.jsx       # Main app with routing
│   │   └── ...
│   └── server/          # Node.js/Express backend
│       ├── src/
│       │   ├── controllers/  # Business logic
│       │   ├── models/       # Mongoose models
│       │   ├── routes/       # API routes
│       │   ├── middleware/   # Auth, upload, etc.
│       │   ├── utils/        # Helper functions
│       │   └── scripts/      # Utility scripts
│       └── ...
```

---

## Backend Conventions

### 1. Controller Pattern

**Standard Structure:**

```javascript
const ModelName = require('../models/ModelName');

// @desc    Action description
// @route   HTTP_METHOD /api/route
// @access  Public/Private
const actionName = async (req, res) => {
  try {
    // 1. Extract and validate input
    const { field1, field2 } = req.body;

    // 2. Authorization check (if needed)
    if (resource.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // 3. Business logic
    const result = await ModelName.find({ user: req.user._id });

    // 4. Return response
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { actionName };
```

**Key Rules:**

- Always use `async/await` for database operations
- Wrap all logic in `try/catch` blocks
- Return appropriate HTTP status codes (200, 201, 400, 404, 500)
- Include descriptive error messages
- Validate user ownership before modifying resources

### 2. Route Pattern

**Standard Structure:**

```javascript
const express = require('express');
const router = express.Router();
const {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
} = require('../controllers/itemController');
const { protect } = require('../middleware/authMiddleware');

// Collection routes
router.route('/').get(protect, getItems).post(protect, createItem);

// Individual resource routes
router
  .route('/:id')
  .get(protect, getItemById)
  .put(protect, updateItem)
  .delete(protect, deleteItem);

module.exports = router;
```

**Key Rules:**

- Group related routes using `router.route()`
- Always apply authentication middleware (`protect` or `protectMember`)
- Use RESTful conventions (GET, POST, PUT, DELETE)
- Export router at the end

### 3. Model Pattern

**Standard Structure:**

```javascript
const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    // ... other fields
  },
  { timestamps: true }, // Adds createdAt and updatedAt
);

// Pre-save hooks (if needed)
modelSchema.pre('save', async function () {
  // Logic before saving
});

// Instance methods (if needed)
modelSchema.methods.methodName = function () {
  // Custom method logic
};

module.exports = mongoose.model('ModelName', modelSchema);
```

**Key Rules:**

- Always include `user` reference for multi-tenant data
- Use `timestamps: true` for automatic date tracking
- Define validation rules in the schema
- Use enums for fields with fixed values

### 4. Pagination Pattern

**Always implement pagination for list endpoints:**

```javascript
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 10;
const skip = (page - 1) * limit;

const totalEntries = await Model.countDocuments(query);
const items = await Model.find(query)
  .skip(skip)
  .limit(limit)
  .sort({ createdAt: -1 });

res.json({
  data: items,
  totalEntries,
  totalPages: Math.ceil(totalEntries / limit),
  currentPage: page,
});
```

---

## Frontend Conventions

### 1. Component Structure

**Page Component Pattern:**

```javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { toast } from 'sonner';

const PageName = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/endpoint');
      setData(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader title="Page Title" />
      {/* Content */}
    </div>
  );
};

export default PageName;
```

**Key Rules:**

- Use functional components with hooks
- Import from `@/` for absolute paths
- Always handle loading and error states
- Use `toast` from `sonner` for notifications
- Use `navigate` from `react-router-dom` for navigation

### 2. Modal Component Pattern

**Standard Modal Structure:**

```javascript
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/axios';
import { toast } from 'sonner';

const ActionModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
  const [formData, setFormData] = useState(
    initialData || {
      field1: '',
      field2: '',
    },
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const endpoint = initialData
        ? `/api/resource/${initialData._id}`
        : '/api/resource';
      const method = initialData ? 'put' : 'post';

      await api[method](endpoint, formData);
      toast.success(
        initialData ? 'Updated successfully' : 'Created successfully',
      );
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit' : 'Add'} Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form fields */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ActionModal;
```

**Key Rules:**

- Accept `isOpen`, `onClose`, `onSuccess` props
- Support both create and edit modes via `initialData`
- Show loading state on buttons
- Call `onSuccess()` after successful operation
- Use shadcn/ui Dialog component

### 3. API Calls

**Use the centralized axios instance:**

```javascript
import api from '@/lib/axios';

// GET request
const response = await api.get('/endpoint');

// POST request
await api.post('/endpoint', data);

// PUT request
await api.put('/endpoint/:id', data);

// DELETE request
await api.delete('/endpoint/:id');
```

**Key Rules:**

- Always use `api` from `@/lib/axios` (includes auth token)
- Handle errors with try/catch
- Show toast notifications for success/error
- Use async/await syntax

---

## Component Patterns

### 1. UI Components (shadcn/ui)

**Available Components:**

- `Button` - Primary UI button with variants
- `Dialog` - Modal dialogs
- `Input` - Form inputs
- `Label` - Form labels
- `Select` - Dropdown selects
- `Card` - Content cards
- `Skeleton` - Loading skeletons
- `Sheet` - Side panels
- `Calendar` - Date picker calendar
- `Popover` - Popup overlays
- `Textarea` - Multi-line text input
- `AlertDialog` - Confirmation dialogs

**Usage Example:**

```javascript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Button variant="default" size="lg">Click Me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="gradient">Upgrade</Button>
```

### 2. Custom Components

**Reusable Components:**

- `PageHeader` - Page title header
- `Pagination` - Pagination controls
- `StatsCard` - Dashboard stat cards
- `TableSkeleton` - Loading skeleton for tables
- `CardsSkeleton` - Loading skeleton for cards
- `InfiniteLoader` - Infinite scroll loader

**Usage:**

```javascript
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/ui/Pagination';

<PageHeader title="Customers" />
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={setCurrentPage}
/>
```

---

## API Design

### 1. Endpoint Naming

**RESTful Conventions:**

```
GET    /api/loans              # Get all loans (paginated)
POST   /api/loans              # Create new loan
GET    /api/loans/:id          # Get single loan
PUT    /api/loans/:id          # Update loan
DELETE /api/loans/:id          # Delete loan
GET    /api/loans/upcoming     # Custom action
```

**Key Rules:**

- Use plural nouns for resources (`/loans`, `/customers`)
- Use HTTP methods to indicate action
- Use `:id` for resource identifiers
- Custom actions go before `:id` routes

### 2. Request/Response Format

**Request Body:**

```json
{
  "field1": "value1",
  "field2": 123,
  "nestedField": {
    "subField": "value"
  }
}
```

**Success Response:**

```json
{
  "data": [...],
  "totalEntries": 50,
  "totalPages": 5,
  "currentPage": 1
}
```

**Error Response:**

```json
{
  "message": "Error description"
}
```

### 3. Query Parameters

**Standard Query Params:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `search` - Search term
- `sortBy` - Field to sort by
- `sortOrder` - `asc` or `desc`
- `customerId` - Filter by customer
- `status` - Filter by status

---

## Authentication & Authorization

### 1. Admin Authentication

**Middleware:** `protect` from `authMiddleware.js`

**Usage:**

```javascript
const { protect } = require('../middleware/authMiddleware');
router.get('/admin-only', protect, controllerFunction);
```

**Access user data:**

```javascript
req.user._id; // User ID
req.user.email; // User email
req.user.plan; // Subscription plan
```

### 2. Member Authentication

**Middleware:** `protectMember` from `memberAuthMiddleware.js`

**Usage:**

```javascript
const { protectMember } = require('../middleware/memberAuthMiddleware');
router.get('/member-only', protectMember, controllerFunction);
```

**Access member data:**

```javascript
req.member._id; // Member ID
req.member.user; // Business owner ID
req.member.customer; // Linked customer ID
```

### 3. Security Code

**Business Security Code:**

- 6-character alphanumeric code (uppercase)
- Generated automatically on user registration
- Used for member login and public loan lookup
- Stored in `user.securityCode`
- Never changes after creation

---

## Database Models

### 1. Common Patterns

**User Reference:**

```javascript
user: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true,
}
```

**Timestamps:**

```javascript
{
  timestamps: true;
} // Adds createdAt, updatedAt
```

**Enums:**

```javascript
status: {
  type: String,
  enum: ['active', 'completed', 'defaulted'],
  default: 'active',
}
```

### 2. Key Models

- **User** - Business owners/admins
- **Member** - Employees with limited access
- **Customer** - Loan recipients
- **Loan** - Loan records
- **Repayment** - Payment records
- **Notification** - System notifications
- **Payment** - Stripe payment records

---

## Error Handling

### 1. Backend Error Responses

**Standard Pattern:**

```javascript
try {
  // Logic
} catch (error) {
  res.status(500).json({ message: error.message });
}
```

**Validation Errors:**

```javascript
if (!requiredField) {
  return res.status(400).json({ message: 'Field is required' });
}
```

**Not Found:**

```javascript
if (!resource) {
  return res.status(404).json({ message: 'Resource not found' });
}
```

**Unauthorized:**

```javascript
if (resource.user.toString() !== req.user._id.toString()) {
  return res.status(404).json({ message: 'Resource not found' });
}
```

### 2. Frontend Error Handling

**Standard Pattern:**

```javascript
try {
  const res = await api.get('/endpoint');
  setData(res.data);
} catch (error) {
  toast.error(error.response?.data?.message || 'Operation failed');
}
```

---

## UI/UX Standards

### 1. Design System

**Colors:**

- Primary: Blue gradient (`btn-gradient`)
- Success: Green gradient (`btn-success-gradient`)
- Destructive: Red
- Muted: Gray

**Typography:**

- Headings: Bold, larger sizes
- Body: Regular weight
- Labels: Uppercase, small, muted

**Spacing:**

- Page padding: `p-6`
- Card padding: `p-4` or `p-6`
- Gap between elements: `gap-4` or `gap-6`

### 2. Responsive Design

**Breakpoints:**

- Mobile: Default
- Tablet: `md:`
- Desktop: `lg:`

**Pattern:**

```javascript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards */}
</div>
```

### 3. Loading States

**Skeleton Loaders:**

```javascript
import TableSkeleton from '@/components/TableSkeleton';

{
  loading ? <TableSkeleton /> : <Table data={data} />;
}
```

**Button Loading:**

```javascript
<Button disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
```

### 4. Notifications

**Use Sonner Toast:**

```javascript
import { toast } from 'sonner';

toast.success('Operation successful');
toast.error('Operation failed');
toast.info('Information message');
```

---

## Best Practices

### 1. Code Organization

- ✅ Keep controllers focused on single responsibility
- ✅ Extract reusable logic into utility functions
- ✅ Use meaningful variable and function names
- ✅ Add comments for complex logic
- ✅ Keep components under 300 lines

### 2. Performance

- ✅ Implement pagination for all list endpoints
- ✅ Use indexes on frequently queried fields
- ✅ Lazy load images and heavy components
- ✅ Debounce search inputs
- ✅ Cache API responses when appropriate

### 3. Security

- ✅ Always validate user ownership
- ✅ Sanitize user inputs
- ✅ Use HTTPS in production
- ✅ Store sensitive data in environment variables
- ✅ Implement rate limiting on public endpoints

### 4. Testing

- ✅ Test authentication flows
- ✅ Test CRUD operations
- ✅ Test edge cases (empty data, errors)
- ✅ Test responsive layouts
- ✅ Test form validations

---

## Quick Reference

### Common Imports

**Backend:**

```javascript
const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
```

**Frontend:**

```javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { toast } from 'sonner';
```

### File Naming

- Components: `PascalCase.jsx` (e.g., `AddLoanModal.jsx`)
- Pages: `PascalCase.jsx` (e.g., `Dashboard.jsx`)
- Controllers: `camelCase.js` (e.g., `loanController.js`)
- Routes: `camelCase.js` (e.g., `loanRoutes.js`)
- Models: `PascalCase.js` (e.g., `Loan.js`)

---

**Last Updated:** February 11, 2026
**Version:** 1.0
