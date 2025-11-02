import { useState } from 'react';
import EmployeeTracking from './components/EmployeeTracking';
import AdminPortal from './components/AdminPortal';
import { User, BarChart3, Heart } from 'lucide-react';

function App() {
  const [view, setView] = useState<'employee' | 'admin'>('employee');
  const [employeeLoggedIn, setEmployeeLoggedIn] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);

  const showNavigation = (view === 'employee' && !employeeLoggedIn) || (view === 'admin' && !adminLoggedIn);

  return (
    <div className="min-h-screen flex flex-col">
      {showNavigation && (
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <button
            onClick={() => setView('employee')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all shadow-lg ${
              view === 'employee'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Employee
          </button>
          <button
            onClick={() => setView('admin')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all shadow-lg ${
              view === 'admin'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Admin
          </button>
        </div>
      )}

      <div className="flex-1">
        {view === 'employee' ? (
          <EmployeeTracking onLoginStateChange={setEmployeeLoggedIn} />
        ) : (
          <AdminPortal onLoginStateChange={setAdminLoggedIn} />
        )}
      </div>

      <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="flex items-center justify-center gap-2 text-sm sm:text-base">
            Made with <Heart className="w-4 h-4 text-red-400 fill-red-400" /> and ambitions by{' '}
            <span className="font-bold text-blue-400">Pawandeep Singh Thandi</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
