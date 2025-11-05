# Implementation Guide for New Features

This guide explains all the new features that have been added to the Hour Tracking System.

## ✅ Completed Features

### 1. Database Schema Updates
- **Employee positions** with default "Warehouse Associate"
- **Email addresses** with verification status
- **Email verification codes** with expiration
- **Auth integration** fields for future Google OAuth

### 2. New Components Created

#### EmployeeProfile.tsx
- Employee self-service profile editing
- Email verification flow
- PIN reset functionality
- View position (read-only for employees)
- Shows verification badge for verified emails

#### EmailLoginModal.tsx
- Email + verification code + PIN login flow
- Send 6-digit verification codes to email
- Step-by-step verification process
- Secure PIN entry after email verification

#### AdminEmployeeEditor.tsx
- Admin can edit all employee details
- Change employee names, emails, positions
- Toggle temp employee status
- Mark emails as verified manually
- Reset employee PINs

#### TimeCardAdjustment.tsx
- Admins can adjust time entry start/end times
- Automatic duration recalculation
- Delete time entries
- Clear visual feedback

### 3. Helper Services

#### emailService.ts
- Generate 6-digit verification codes
- Send verification emails (via Supabase Auth)
- Check code expiration

#### dateUtils.ts (Updated)
- All datetime functions now include timezone offset
- Accurate duration calculations
- Local date/time handling

## 🔧 Integration Steps

### For EmployeeTracking Component

Add these imports:
```typescript
import { UserCircle, Mail } from 'lucide-react';
import EmployeeProfile from './EmployeeProfile';
import EmailLoginModal from './EmailLoginModal';
```

Add state variables:
```typescript
const [showProfile, setShowProfile] = useState(false);
const [showEmailLogin, setShowEmailLogin] = useState(false);
```

Add Profile button in the header (next to Logout):
```typescript
<button
  onClick={() => setShowProfile(true)}
  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
>
  <UserCircle className="w-4 h-4" />
  Profile
</button>
```

Add Email Login button (in the login screen, below the name-based sign in):
```typescript
<button
  onClick={() => setShowEmailLogin(true)}
  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-base sm:text-lg"
>
  <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
  Sign In with Email
</button>
```

Add modals at the end of the component:
```typescript
{showProfile && currentEmployee && (
  <EmployeeProfile
    employee={currentEmployee}
    onClose={() => setShowProfile(false)}
    onUpdate={(updatedEmployee) => setCurrentEmployee(updatedEmployee)}
  />
)}

<EmailLoginModal
  isOpen={showEmailLogin}
  onClose={() => setShowEmailLogin(false)}
  onSuccess={(employee) => {
    setCurrentEmployee(employee);
    localStorage.setItem('employee_id', employee.id);
    setShowEmailLogin(false);
    setShowNameEntry(false);
  }}
/>
```

### For AdminPortal Component

Add these imports:
```typescript
import { Edit, Clock as ClockAdjust } from 'lucide-react';
import AdminEmployeeEditor from './AdminEmployeeEditor';
import TimeCardAdjustment from './TimeCardAdjustment';
```

Add state variables:
```typescript
const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
const [selectedTimeEntry, setSelectedTimeEntry] = useState<(TimeEntry & { task: Task }) | null>(null);
const [showEmployeeEditor, setShowEmployeeEditor] = useState(false);
const [showTimeAdjustment, setShowTimeAdjustment] = useState(false);
```

Add Edit button next to each employee in the list:
```typescript
<button
  onClick={() => {
    setSelectedEmployee(employee);
    setShowEmployeeEditor(true);
  }}
  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-semibold"
>
  <Edit className="w-4 h-4 inline mr-1" />
  Edit
</button>
```

Add Adjust button next to each time entry:
```typescript
<button
  onClick={() => {
    setSelectedTimeEntry(entry);
    setShowTimeAdjustment(true);
  }}
  className="px-2 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded text-xs font-semibold"
>
  <ClockAdjust className="w-3 h-3 inline mr-1" />
  Adjust
</button>
```

Add modals at the end of the component:
```typescript
{showEmployeeEditor && selectedEmployee && (
  <AdminEmployeeEditor
    employee={selectedEmployee}
    onClose={() => {
      setShowEmployeeEditor(false);
      setSelectedEmployee(null);
    }}
    onUpdate={() => {
      loadEmployeesData(); // Refresh the employee list
      setShowEmployeeEditor(false);
      setSelectedEmployee(null);
    }}
  />
)}

{showTimeAdjustment && selectedTimeEntry && (
  <TimeCardAdjustment
    entry={selectedTimeEntry}
    onClose={() => {
      setShowTimeAdjustment(false);
      setSelectedTimeEntry(null);
    }}
    onUpdate={() => {
      loadEmployeesData(); // Refresh the data
      setShowTimeAdjustment(false);
      setSelectedTimeEntry(null);
    }}
  />
)}
```

## 📋 Features Summary

### Employee Portal Features:
1. **Profile Management**
   - Edit name and email
   - Verify email with 6-digit code
   - Change PIN
   - View position (read-only)
   - Verified badge for confirmed emails

2. **Login Options**
   - Name + PIN (existing)
   - Email + Verification Code + PIN (new)

3. **Security**
   - Email verification required for email login
   - One-time verification codes (15-minute expiration)
   - Secure PIN storage

### Admin Portal Features:
1. **Employee Management**
   - Edit all employee details
   - Change positions (dropdown with common roles)
   - Mark employees as temporary
   - Manually verify/unverify emails
   - Reset employee PINs

2. **Timecard Management**
   - Adjust start/end times
   - Automatic duration recalculation
   - Delete entries
   - Full audit trail

## 🔐 Email Verification Flow

1. Employee enters/updates email in profile
2. System sends 6-digit verification code
3. Code expires after 15 minutes
4. Employee enters code to verify
5. Email marked as verified in database
6. Can now login with email + PIN

## 🎯 Position System

Default positions available:
- Warehouse Associate (default)
- Forklift Operator
- Warehouse Supervisor
- Inventory Specialist
- Shipping Clerk
- Receiving Clerk
- Quality Control
- Team Lead
- Warehouse Manager
- Other

Admins can change employee positions at any time.

## 🚀 Next Steps (Google OAuth - Not Implemented Yet)

To add Google OAuth:
1. Enable Google provider in Supabase Dashboard
2. Configure OAuth redirect URLs
3. Link employees to Supabase Auth users
4. Update login flow to use Supabase Auth

Note: The database schema is ready for OAuth integration (auth_user_id column exists).

## 📝 Notes

- Email verification codes are currently shown in alerts (for development)
- In production, codes should be sent via actual email (Supabase supports this)
- All datetime operations now properly handle local timezones
- Duration calculations are accurate across timezone boundaries
