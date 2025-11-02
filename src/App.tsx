import { useState, useEffect } from 'react';
import EmployeeTracking from './components/EmployeeTracking';
import AdminPortal from './components/AdminPortal';
import { User, BarChart3, Heart, Linkedin, Github, Globe, Sun, Moon } from 'lucide-react';

function App() {
  const [view, setView] = useState<'employee' | 'admin'>('employee');
  const [employeeLoggedIn, setEmployeeLoggedIn] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const showNavigation =
    (view === 'employee' && !employeeLoggedIn) ||
    (view === 'admin' && !adminLoggedIn);

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-gray-100' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 text-gray-900'}`}>
      {showNavigation && (
        <header className={`${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-gray-200'} backdrop-blur-md border-b sticky top-0 z-50`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <h1 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent' : 'text-gray-900'}`}>
                Time Tracking System
              </h1>

              <nav className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className={`px-3 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setView('employee')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                    view === 'employee'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                      : isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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

      {showNavigation && (
        <footer className={`${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white/80 border-gray-200'} backdrop-blur-sm border-t py-8`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center space-y-4">
              <div className={`flex items-center gap-2 text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <span>Made with</span>
                <Heart className="w-5 h-5 text-red-400 fill-red-400 animate-pulse" />
                <span>and ambitions by</span>
              </div>

              <h3 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                Pawandeep Singh Thandi
              </h3>

              <div className="flex items-center gap-4 sm:gap-6">
                <a
                  href="https://www.linkedin.com/in/pawandeep-thandi-2432031ab/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'} transition-colors group`}
                >
                  <Linkedin className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline text-sm">LinkedIn</span>
                </a>

                <a
                  href="https://github.com/Pawandeep16"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'} transition-colors group`}
                >
                  <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline text-sm">GitHub</span>
                </a>

                <a
                  href="https://pawandeep-portfolio.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'} transition-colors group`}
                >
                  <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline text-sm">Website</span>
                </a>
              </div>

              <div className={`text-sm ${isDarkMode ? 'text-gray-400 border-slate-700' : 'text-gray-500 border-gray-300'} pt-4 border-t w-full text-center`}>
                <p>&copy; {new Date().getFullYear()} Time Tracking System. All rights reserved.</p>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
