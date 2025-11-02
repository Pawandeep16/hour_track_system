import { useState } from 'react';
import EmployeeTracking from './components/EmployeeTracking';
import AdminPortal from './components/AdminPortal';
import { User, BarChart3, Heart, Linkedin, Github, Globe } from 'lucide-react';

function App() {
  const [view, setView] = useState<'employee' | 'admin'>('employee');
  const [employeeLoggedIn, setEmployeeLoggedIn] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);

  const showNavigation =
    (view === 'employee' && !employeeLoggedIn) ||
    (view === 'admin' && !adminLoggedIn);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-gray-100">
      {/* Header */}
      {showNavigation && (
        <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-lg border-b border-slate-700 shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between h-20 gap-3 sm:gap-0">
              {/* Logo / Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 tracking-wide">
                Time Tracking System
              </h1>

              {/* Navigation */}
              <nav className="flex gap-3 sm:gap-4">
                <button
                  onClick={() => setView('employee')}
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 border border-slate-600 ${
                    view === 'employee'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md scale-105'
                      : 'bg-slate-800 text-gray-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span className="hidden sm:inline">Employee</span>
                </button>
                <button
                  onClick={() => setView('admin')}
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 border border-slate-600 ${
                    view === 'admin'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md scale-105'
                      : 'bg-slate-800 text-gray-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </nav>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 flex justify-center items-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl">
          {view === 'employee' ? (
            <EmployeeTracking onLoginStateChange={setEmployeeLoggedIn} />
          ) : (
            <AdminPortal onLoginStateChange={setAdminLoggedIn} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="flex items-center justify-center gap-2 text-base sm:text-lg text-gray-300">
              <span>Made with</span>
              <Heart className="w-5 h-5 text-red-500 fill-red-500 animate-pulse" />
              <span>and ambitions by</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
              Pawandeep Singh Thandi
            </h3>

            <div className="flex items-center justify-center gap-5 sm:gap-8 pt-2">
              <a
                href="https://www.linkedin.com/in/pawandeep-thandi-2432031ab/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors group"
              >
                <Linkedin className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline text-sm">LinkedIn</span>
              </a>

              <a
                href="https://github.com/Pawandeep16"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors group"
              >
                <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline text-sm">GitHub</span>
              </a>

              <a
                href="https://pawandeep-portfolio.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors group"
              >
                <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline text-sm">Website</span>
              </a>
            </div>

            <div className="text-xs sm:text-sm text-gray-500 pt-6 border-t border-slate-700 w-full">
              <p>
                &copy; {new Date().getFullYear()} Time Tracking System. All
                rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
