# Supabase Frontend CRUD Operations

This project demonstrates comprehensive CRUD (Create, Read, Update, Delete) operations for user management using Supabase directly from the frontend, without the need for API routes, models, or separate type definitions.

## 🚀 Features

- **Complete User Management**: Full CRUD operations for user profiles
- **Frontend-Only**: No backend API routes needed
- **Type-Safe**: TypeScript support with proper database types
- **Role-Based Access**: Different permissions for admin, HR, team, and client roles
- **Real-time Operations**: Direct database operations via Supabase client
- **Comprehensive UI**: Full-featured user management interface

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/
│   │   └── SignupForm.tsx          # Enhanced signup with proper profile creation
│   └── admin/
│       └── UserManagement.tsx      # Complete user management interface
├── utils/
│   ├── database/
│   │   └── userCrud.ts            # All CRUD operations for users
│   └── supabase/
│       ├── client.ts              # Browser Supabase client
│       ├── server.ts              # Server Supabase client
│       └── admin.ts               # Admin client with service role
├── types/
│   └── database.ts                # TypeScript database types
└── app/
    ├── signup/
    │   └── page.tsx               # User registration page
    └── admin/
        └── users/
            └── page.tsx           # User management dashboard
```

## 🔧 Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Database Schema

The project uses the comprehensive schema provided in `schema.txt`. Make sure to run the SQL commands in your Supabase database to create all necessary tables, triggers, and RLS policies.

Key tables:
- `profiles` - User profile information
- `leave_balances` - User leave tracking
- Database triggers automatically create profiles when users sign up

### 3. Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## 📋 CRUD Operations Overview

### Create Operations

#### 1. User Signup with Profile Creation
```typescript
import { userCrud } from '@/utils/database/userCrud';

// Automatic profile creation during signup
const { data, error } = await userCrud.createProfile({
  id: userId,
  email: 'user@example.com',
  full_name: 'John Doe',
  role: 'team',
  department: 'Engineering',
  job_title: 'Developer',
  phone: '+1234567890',
  is_active: true,
});
```

#### 2. Initial Leave Balances
```typescript
// Automatically created with new profiles
await userCrud.createInitialLeaveBalances(userId);
```

### Read Operations

#### 1. Get Current User Profile
```typescript
const { data: profile, error } = await userCrud.getCurrentUserProfile();
```

#### 2. Get All Users with Filtering
```typescript
const { data: users, error, count } = await userCrud.getAllUsers({
  page: 1,
  limit: 10,
  role: 'team',
  department: 'Engineering',
  isActive: true,
  searchTerm: 'john',
});
```

#### 3. Get Users by Role
```typescript
const { data: admins, error } = await userCrud.getUsersByRole('admin');
```

#### 4. Get Users by Department
```typescript
const { data: engineers, error } = await userCrud.getUsersByDepartment('Engineering');
```

#### 5. Search Users
```typescript
const { data: results, error } = await userCrud.searchUsers('john doe', 10);
```

#### 6. Get User Statistics
```typescript
const { data: stats, error } = await userCrud.getUserStatistics();
// Returns: totalUsers, activeUsers, usersByRole, usersByDepartment
```

### Update Operations

#### 1. Update Current User Profile
```typescript
const { data, error } = await userCrud.updateCurrentUserProfile({
  full_name: 'John Smith',
  department: 'Marketing',
  job_title: 'Senior Developer',
  phone: '+1987654321',
});
```

#### 2. Update Another User's Profile (Admin/HR only)
```typescript
const { data, error } = await userCrud.updateUserProfile(userId, {
  department: 'Sales',
  is_active: false,
});
```

#### 3. Change User Role (Admin only)
```typescript
const { data, error } = await userCrud.updateUserRole(userId, 'hr');
```

#### 4. Toggle User Status
```typescript
const { data, error } = await userCrud.toggleUserStatus(userId, false); // deactivate
```

### Delete Operations

#### 1. Soft Delete (Deactivate)
```typescript
const { success, error } = await userCrud.softDeleteUser(userId);
```

#### 2. Hard Delete (Permanent - Admin only)
```typescript
const { success, error } = await userCrud.hardDeleteUser(userId);
```

## 🔐 Permission System

The CRUD operations include built-in permission checks:

- **Team Members**: Can only view and update their own profile
- **Clients**: Can only view and update their own profile  
- **HR Managers**: Can view all users and update most user data
- **Administrators**: Full access to all operations including role changes and deletions

## 🎨 User Interface Components

### SignupForm Component
- Enhanced user registration with proper metadata handling
- Automatic profile creation with fallback mechanisms
- Leave balance initialization
- Error handling and success feedback

### UserManagement Component
- Complete user management dashboard
- Advanced filtering and search capabilities
- Pagination support
- Real-time statistics
- Inline editing capabilities
- Role-based action visibility

## 📊 Features Demonstrated

### 1. Advanced Search & Filtering
- Search by name or email
- Filter by role, department, status
- Pagination with customizable page sizes
- Real-time filtering

### 2. Bulk Operations
- Statistics dashboard
- Multi-user management
- Batch status updates

### 3. Real-time Updates
- Immediate UI updates after operations
- Optimistic updates with error handling
- Live user statistics

### 4. Error Handling
- Comprehensive error catching
- User-friendly error messages
- Fallback mechanisms for critical operations

## 🚀 Usage Examples

### Basic User Operations
```typescript
import { userCrud } from '@/utils/database/userCrud';

// In a React component
const [users, setUsers] = useState([]);

// Load users
const loadUsers = async () => {
  const { data, error } = await userCrud.getAllUsers({ page: 1, limit: 10 });
  if (data) setUsers(data);
};

// Update user
const updateUser = async (userId, updates) => {
  const { data, error } = await userCrud.updateUserProfile(userId, updates);
  if (data) {
    // Refresh users list
    loadUsers();
  }
};
```

### Component Integration
```typescript
import UserManagement from '@/components/admin/UserManagement';

export default function AdminPage() {
  return <UserManagement currentUserRole="admin" />;
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Profile Creation Fails**
   - Check database triggers are properly set up
   - Verify RLS policies allow profile creation
   - Check user_metadata is being passed correctly

2. **Permission Denied Errors**
   - Verify RLS policies are configured
   - Check user role permissions
   - Ensure proper authentication

3. **Database Connection Issues**
   - Verify environment variables are set
   - Check Supabase project URL and keys
   - Test database connection

### Debug Tips

1. Check browser console for detailed error messages
2. Use Supabase dashboard to verify data structure
3. Test operations in Supabase SQL editor
4. Verify user authentication state

## 📈 Performance Considerations

- **Pagination**: Large user lists are paginated for better performance
- **Selective Queries**: Only fetch required fields when possible
- **Caching**: Consider implementing client-side caching for frequently accessed data
- **Real-time**: Use Supabase real-time subscriptions for live updates when needed

## 🔒 Security Features

- **Row Level Security**: All operations respect RLS policies
- **Role-based Access**: Operations check user permissions
- **Input Validation**: Client-side and database-level validation
- **SQL Injection Protection**: Parameterized queries via Supabase client

This implementation provides a complete, production-ready user management system using Supabase directly from the frontend, eliminating the need for custom API routes while maintaining security and type safety.