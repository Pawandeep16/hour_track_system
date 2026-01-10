# Hour Tracking System

A comprehensive employee hour tracking system built with React, TypeScript, and Firebase.

## Features

- **Employee Time Tracking**: Clock in/out with department and task selection
- **Break Management**: Track paid and unpaid breaks
- **Shift Management**: Define and manage multiple shifts
- **Admin Portal**: Comprehensive reporting and employee management
- **Security**: PIN-based employee authentication
- **Export Options**: Export reports to Excel and PDF formats

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Database**: Firebase Firestore
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Reports**: jsPDF, xlsx, papaparse

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- A Firebase account
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Firebase (see FIREBASE_SETUP.md for detailed instructions):
   - Create a Firebase project
   - Enable Firestore Database
   - Get your Firebase configuration
   - Update the `.env` file with your Firebase credentials

4. Start the development server:
   ```bash
   npm run dev
   ```

## Configuration

Update the `.env` file with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Usage

### Employee Portal

1. Enter your full name
2. Set up or enter your security PIN
3. Select department and task
4. Clock in to start tracking time
5. Take breaks as needed
6. Clock out when finished

### Admin Portal

1. Access the admin portal from the main page
2. Login with admin credentials
3. Manage employees, departments, tasks, and shifts
4. View individual and summary reports
5. Export data to Excel or PDF

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Documentation

- [Firebase Setup Guide](FIREBASE_SETUP.md) - Complete guide to set up Firebase for this application

## License

MIT

## Support

For issues or questions, please refer to the FIREBASE_SETUP.md documentation.
