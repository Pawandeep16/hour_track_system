import { useState } from 'react';
import EmployeeTracking from './components/EmployeeTracking';
import AdminPortal from './components/AdminPortal';
import { User, BarChart3, Heart, Linkedin, Github, Globe } from 'lucide-react';

function App() {
  const [view, setView] = useState<'employee' | 'admin'>('employee');
  const [employeeLoggedIn, setEmployeeLoggedIn] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);

  const showNavigation = (view === 'employee' && !employeeLoggedIn) || (view === 'admin' && !adminLoggedIn);

  return (
    <div className="min-h-screen flex flex-col">
      {showNavigation && (
        <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Time Tracking System
                </h1>
              </div>

              <nav className="flex gap-2">
                <button
                  onClick={() => setView('employee')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                    view === 'employee'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Employee</span>
                </button>
                <button
                  onClick={() => setView('admin')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                    view === 'admin'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </nav>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1">
        {view === 'employee' ? (
          <EmployeeTracking onLoginStateChange={setEmployeeLoggedIn} />
        ) : (
          <AdminPortal onLoginStateChange={setAdminLoggedIn} />
        )}
      </main>

      <footer className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-8 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center gap-2 text-base sm:text-lg">
              <span className="text-gray-300">Made with</span>
              <Heart className="w-5 h-5 text-red-400 fill-red-400 animate-pulse" />
              <span className="text-gray-300">and ambitions by</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-blue-400">
              Pawandeep Singh Thandi
            </h3>

            <div className="flex items-center gap-4 sm:gap-6">
              <a
                href="https://www.linkedin.com/in/pawandeep-thandi-2432031ab/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors group"
              >
                <Linkedin className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline text-sm">LinkedIn</span>
              </a>

              <a
                href="https://github.com/Pawandeep16"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors group"
              >
                <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline text-sm">GitHub</span>
              </a>

              <a
                href="https://pawandeep-portfolio.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors group"
              >
                <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline text-sm">Website</span>
              </a>
            </div>

            <div className="text-sm text-gray-400 pt-4 border-t border-slate-700 w-full text-center">
              <p>&copy; {new Date().getFullYear()} Time Tracking System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
