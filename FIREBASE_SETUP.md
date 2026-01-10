# Firebase Setup Guide

Your hour tracking system has been migrated from Supabase to Firebase. Follow these steps to set up your Firebase database.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "hour-tracking-system")
4. Click "Continue"
5. Disable Google Analytics (optional) or configure it
6. Click "Create project"

## Step 2: Set Up Firestore Database

1. In your Firebase project, click on "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in production mode" for better security
4. Select a Cloud Firestore location (choose one closest to your users)
5. Click "Enable"

## Step 3: Configure Firestore Security Rules

In the Firestore console, go to the "Rules" tab and replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all collections
    // WARNING: This is open access. For production, you should implement proper authentication
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Click "Publish" to save the rules.

## Step 4: Get Firebase Configuration

1. In Firebase Console, click the gear icon next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (`</>`) to add a web app
5. Enter an app nickname (e.g., "Hour Tracking Web App")
6. Click "Register app"
7. Copy the Firebase configuration object

## Step 5: Update Environment Variables

Open the `.env` file in your project root and update it with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Replace the placeholder values with your actual Firebase configuration values.

## Step 6: Initialize Collections

You need to create the following collections in Firestore with at least one document each:

### 1. admin_credentials
Create a document with:
- `username`: "admin"
- `password`: "admin123"
- `created_at`: (use current timestamp)

### 2. departments
Create initial departments (optional), e.g.:
- `name`: "Production"
- `created_at`: (use current timestamp)

### 3. tasks
Create initial tasks linked to departments (optional)

### 4. employees
Create initial employees (optional)

### 5. shifts
Create shifts (optional), e.g.:
- `name`: "Morning Shift"
- `start_time`: "06:00"
- `end_time`: "14:00"
- `color`: "#3b82f6"
- `created_at`: (use current timestamp)

## Step 7: Collections Structure

Your Firestore database will have these collections:

- **admin_credentials**: Admin login credentials
- **departments**: Department definitions
- **tasks**: Tasks linked to departments
- **employees**: Employee records
- **time_entries**: Employee time tracking entries
- **break_entries**: Employee break records
- **shifts**: Shift definitions

## Step 8: Start the Application

```bash
npm run dev
```

## Step 9: First Login

1. Go to the admin portal
2. Login with:
   - Username: admin
   - Password: admin123 (or whatever you set in Step 6)

3. Create departments, tasks, shifts, and employees through the admin interface

## Security Note

The current Firestore rules allow open access to all data. For production use, you should:

1. Enable Firebase Authentication
2. Implement proper security rules based on user authentication
3. Use Firebase Authentication to manage admin and employee access

## Employee PIN System

The application uses a secure PIN system for employee login:

### First Login (PIN Setup):
1. Employee enters their full name as registered in the system
2. If no PIN exists, they are prompted to create a 4-digit numeric PIN
3. Employee must confirm the PIN by entering it again
4. PIN is saved to Firebase and associated with the employee record

### Subsequent Logins (PIN Verification):
1. Employee enters their full name
2. System prompts for their 4-digit PIN
3. If PIN matches, employee is logged in
4. If PIN is incorrect, employee must try again

### Troubleshooting PIN Issues:
- Make sure the employee name matches exactly as registered
- PIN must be exactly 4 digits (numbers only)
- Check browser console for `[PIN]` messages to see what's happening
- If an employee forgets their PIN, admin can reset it in the Admin Portal

## Debugging

The application includes console logging for all Firebase operations. Open your browser's developer console (F12) to see:

**Firebase Operations:**
- `[Firebase] Fetching from collection: ...` - When data is being fetched
- `[Firebase] Fetched X documents from ...` - Successful fetch operations
- `[Firebase] Inserting into ...` - When data is being added
- `[Firebase] Inserted document with ID: ...` - Successful insert operations
- `[Firebase] Error ...` - Any Firebase errors

**PIN Operations:**
- `[PIN] Setting up PIN for employee: ...` - PIN setup process started
- `[PIN] PIN setup successful` - PIN saved successfully to Firebase
- `[PIN] Verifying PIN for employee: ...` - PIN verification attempt
- `[PIN] PIN verification successful` - Correct PIN entered, login granted
- `[PIN] PIN verification failed` - Incorrect PIN entered

## Need Help?

If you encounter any issues:
1. Check that all environment variables are correctly set in `.env`
2. Verify Firestore security rules are published (see Step 3)
3. **Check the browser console (F12) for Firebase operation logs and errors**
4. Ensure you've created the admin_credentials collection with valid credentials
5. Verify your Firebase project has Firestore enabled
6. Check that the Firestore database is in the correct region
