import { useState } from 'react';
import EmployeeTracking from './components/EmployeeTracking';
import AdminPortal from './components/AdminPortal';
import { User, BarChart3 } from 'lucide-react';

function App() {
  const [view, setView] = useState<'employee' | 'admin'>('employee');

  return (
    <div className="min-h-screen">
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

      {view === 'employee' ? <EmployeeTracking /> : <AdminPortal />}
    </div>
  );
}

export default App;
