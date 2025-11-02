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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-gray-100">
      {/* Compact Header */}
      {showNavigation && (
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3">
              {/* Logo */}
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                TimeTrack Pro
              </h1>

              {/* Compact Nav */}
              <nav className="flex gap-2">
                <button
                  onClick={() => setView('employee')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    view === 'employee'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Employee</span>
                </button>
                <button
                  onClick={() => setView('admin')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    view === 'admin'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-slate-800'
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

      {/* Centered Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl mx-auto">
          {view === 'employee' ? (
            <EmployeeTracking onLoginStateChange={setEmployeeLoggedIn} />
          ) : (
            <AdminPortal onLoginStateChange={setAdminLoggedIn} />
          )}
        </div>
      </main>

      {/* Compact Footer */}
      <footer className="bg-slate-900/70 backdrop-blur-sm border-t border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex flex-col items-center gap-3 text-sm">
            <p className="text-gray-400 flex items-center gap-2">
              Made with <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" /> by
            </p>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Pawandeep Singh Thandi
            </h3>

            <div className="flex gap-6 text-gray-500">
              <a
                href="https://www.linkedin.com/in/pawandeep-thandi-2432031ab/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="https://github.com/Pawandeep16"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://pawandeep-portfolio.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors"
              >
                <Globe className="w-5 h-5" />
              </a>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              © {new Date().getFullYear()} TimeTrack Pro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;