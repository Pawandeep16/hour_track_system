import { useState, useEffect } from 'react';
import { supabase, Department, Task, Employee, TimeEntry, BreakEntry, Shift } from '../lib/supabase';
import { Clock, Play, StopCircle, User, LogOut, Coffee, Lock, UserCircle } from 'lucide-react';
import { detectShift } from '../lib/shiftUtils';
import { getLocalDate, getLocalDateTime, calculateDurationMinutes } from '../lib/dateUtils';
import PinModal from './PinModal';
import EmployeeProfile from './EmployeeProfile';
import ImprovedLoginFlow from './ImprovedLoginFlow';

const PAID_BREAK_LIMIT = 15;
const UNPAID_BREAK_LIMIT = 30;

interface EmployeeTrackingProps {
  onLoginStateChange: (isLoggedIn: boolean) => void;
}

export default function EmployeeTracking({ onLoginStateChange }: EmployeeTrackingProps) {
  const [employeeName, setEmployeeName] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [activeBreak, setActiveBreak] = useState<BreakEntry | null>(null);
  const [todayEntries, setTodayEntries] = useState<Array<TimeEntry & { task: Task }>>([]);
  const [todayBreaks, setTodayBreaks] = useState<BreakEntry[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [nameError, setNameError] = useState('');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [showNameEntry, setShowNameEntry] = useState(true);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [tempEmployee, setTempEmployee] = useState<Employee | null>(null);
  const [showResetPin, setShowResetPin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    loadDepartments();
    loadShifts();
    checkStoredEmployee();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      loadTasks(selectedDepartment);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (currentEmployee) {
      loadTodayEntries();
      loadTodayBreaks();
      checkActiveEntry();
      checkActiveBreak();
      onLoginStateChange(true);
    } else {
      onLoginStateChange(false);
    }
  }, [currentEmployee, onLoginStateChange]);

  const checkStoredEmployee = () => {
    const storedEmployeeId = localStorage.getItem('employee_id');
    if (storedEmployeeId) {
      loadEmployeeById(storedEmployeeId);
      setShowNameEntry(false);
    }
  };

  const loadEmployeeById = async (employeeId: string) => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle();

    if (data) {
      setCurrentEmployee(data);
      setEmployeeName(data.name);
      setShowNameEntry(false);
    } else {
      localStorage.removeItem('employee_id');
      setShowNameEntry(true);
    }
  };

  const loadDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .order('name');
    if (data) setDepartments(data);
  };

  const loadShifts = async () => {
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .order('start_time');
    if (data) setShifts(data);
  };

  const loadTasks = async (departmentId: string) => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('department_id', departmentId);
    if (data) {
      const sortedTasks = [...data].sort((a: any, b: any) => a.name.localeCompare(b.name));
      setTasks(sortedTasks);
    }
  };

  const loadTodayEntries = async () => {
    if (!currentEmployee) return;

    const today = getLocalDate();
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', currentEmployee.id)
      .eq('entry_date', today);

    if (data) {
      const entriesWithTasks = await Promise.all(
        data.map(async (entry: any) => {
          const { data: taskData } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', entry.task_id)
            .maybeSingle();

          return { ...entry, task: taskData || { name: 'Unknown Task' } };
        })
      );

      const sortedData = [...entriesWithTasks].sort((a: any, b: any) => b.start_time.localeCompare(a.start_time));
      setTodayEntries(sortedData as any);
    }
  };

  const loadTodayBreaks = async () => {
    if (!currentEmployee) return;

    const today = getLocalDate();
    const { data } = await supabase
      .from('break_entries')
      .select('*')
      .eq('employee_id', currentEmployee.id)
      .eq('entry_date', today);

    if (data) {
      const sortedData = [...data].sort((a: any, b: any) => b.start_time.localeCompare(a.start_time));
      setTodayBreaks(sortedData);
    }
  };

  const checkActiveEntry = async () => {
    if (!currentEmployee) return;

    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', currentEmployee.id)
      .is('end_time', null)
      .maybeSingle();

    if (data) {
      setActiveEntry(data);
      setIsStarted(true);
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', data.task_id)
        .maybeSingle();

      if (taskData) {
        setSelectedDepartment(taskData.department_id);
        setSelectedTask(taskData.id);
        await loadTasks(taskData.department_id);
      }
    }
  };

  const checkActiveBreak = async () => {
    if (!currentEmployee) return;

    const { data } = await supabase
      .from('break_entries')
      .select('*')
      .eq('employee_id', currentEmployee.id)
      .is('end_time', null)
      .maybeSingle();

    if (data) {
      setActiveBreak(data);
    }
  };

  const handleSignIn = async () => {
    if (!employeeName.trim()) {
      setNameError('Please enter your name');
      return;
    }

    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('*')
      .eq('name', employeeName.trim())
      .maybeSingle();

    if (existingEmployee) {
      setTempEmployee(existingEmployee);
      setNameError('');

      if (!existingEmployee.security_pin) {
        setShowPinSetup(true);
      } else {
        setShowPinVerify(true);
      }
    } else {
      setNameError('Employee name not found in the system. Please enter your exact full name as registered or contact admin.');
    }
  };

  const handlePinSetup = async (pin: string) => {
    if (!tempEmployee) return;

    const { error } = await supabase
      .from('employees')
      .update({
        security_pin: pin,
        pin_set_at: getLocalDateTime()
      })
      .eq('id', tempEmployee.id);

    if (!error) {
      setCurrentEmployee({ ...tempEmployee, security_pin: pin, pin_set_at: getLocalDateTime() });
      localStorage.setItem('employee_id', tempEmployee.id);
      setShowPinSetup(false);
      setShowNameEntry(false);
      setTempEmployee(null);
    }
  };

  const handlePinVerify = async (pin: string) => {
    if (!tempEmployee) return;

    if (pin === tempEmployee.security_pin) {
      setCurrentEmployee(tempEmployee);
      localStorage.setItem('employee_id', tempEmployee.id);
      setShowPinVerify(false);
      setShowNameEntry(false);
      setTempEmployee(null);
    } else {
      alert('Incorrect PIN. Please try again.');
    }
  };

  const handleResetPin = async (newPin: string) => {
    if (!currentEmployee) return;

    const { error } = await supabase
      .from('employees')
      .update({
        security_pin: newPin,
        pin_set_at: getLocalDateTime()
      })
      .eq('id', currentEmployee.id);

    if (!error) {
      setCurrentEmployee({ ...currentEmployee, security_pin: newPin, pin_set_at: getLocalDateTime() });
      setShowResetPin(false);
      alert('PIN reset successfully!');
    } else {
      alert('Failed to reset PIN. Please try again.');
    }
  };

  const handleStart = async () => {
    if (!currentEmployee) return;

    if (!selectedDepartment || !selectedTask) {
      alert('Please select department and task');
      return;
    }

    if (activeEntry) {
      await handleEnd();
    }

    if (activeBreak) {
      await handleEndBreak();
    }

    const startTime = getLocalDateTime();
    const detectedShift = detectShift(startTime, shifts);

    if (detectedShift && !currentShift) {
      setCurrentShift(detectedShift);
    }

    const { data } = await supabase
      .from('time_entries')
      .insert({
        employee_id: currentEmployee.id,
        department_id: selectedDepartment,
        task_id: selectedTask,
        start_time: startTime,
        shift_id: detectedShift?.id || null,
        entry_date: getLocalDate()
      });

    if (data) {
      setActiveEntry(data as any);
      setIsStarted(true);
      loadTodayEntries();
    }
  };

  const handleEnd = async () => {
    if (!activeEntry) return;

    const endTimeStr = getLocalDateTime();
    const durationMinutes = calculateDurationMinutes(activeEntry.start_time, endTimeStr);

    await supabase
      .from('time_entries')
      .update({
        end_time: endTimeStr,
        duration_minutes: durationMinutes
      })
      .eq('id', activeEntry.id);

    setActiveEntry(null);
    setIsStarted(false);
    setSelectedTask('');
    loadTodayEntries();
  };

  const handleStartBreak = async (breakType: 'paid' | 'unpaid') => {
    if (!currentEmployee) return;

    if (activeBreak) {
      await handleEndBreak();
    }

    if (activeEntry && !activeBreak) {
      await handleEnd();
    }

    const { data } = await supabase
      .from('break_entries')
      .insert({
        employee_id: currentEmployee.id,
        break_type: breakType,
        start_time: getLocalDateTime(),
        entry_date: getLocalDate()
      });

    if (data) {
      setActiveBreak(data as any);
      loadTodayBreaks();
    }
  };

  const handleEndBreak = async () => {
    if (!activeBreak) return;

    const endTimeStr = getLocalDateTime();
    const durationMinutes = calculateDurationMinutes(activeBreak.start_time, endTimeStr);

    const breakLimit = activeBreak.break_type === 'paid' ? PAID_BREAK_LIMIT : UNPAID_BREAK_LIMIT;

    if (durationMinutes > breakLimit) {
      const confirmEnd = window.confirm(
        `Your ${activeBreak.break_type} break has exceeded the ${breakLimit}-minute limit (${durationMinutes} minutes). Do you want to end it now?`
      );
      if (!confirmEnd) return;
    }

    await supabase
      .from('break_entries')
      .update({
        end_time: endTimeStr,
        duration_minutes: durationMinutes
      })
      .eq('id', activeBreak.id);

    setActiveBreak(null);
    loadTodayBreaks();
  };

  const handleLogout = () => {
    localStorage.removeItem('employee_id');
    setCurrentEmployee(null);
    setEmployeeName('');
    setActiveEntry(null);
    setActiveBreak(null);
    setIsStarted(false);
    setTodayEntries([]);
    setTodayBreaks([]);
    setSelectedDepartment('');
    setSelectedTask('');
    setCurrentShift(null);
    setShowNameEntry(true);
    onLoginStateChange(false);
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getTotalHours = () => {
    const total = todayEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
    return formatDuration(total);
  };

  const getTotalBreakTime = (breakType?: 'paid' | 'unpaid') => {
    const breaks = breakType
      ? todayBreaks.filter(b => b.break_type === breakType)
      : todayBreaks;
    const total = breaks.reduce((sum, breakEntry) => sum + (breakEntry.duration_minutes || 0), 0);
    return formatDuration(total);
  };

  return (
    <div className="text-black p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <h1 className="text-xl sm:text-3xl font-bold text-gray-800">Employee Time Tracker</h1>
            </div>
            {currentEmployee && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowProfile(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                >
                  <UserCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Profile</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>

          {showNameEntry ? (
            <ImprovedLoginFlow
              onSuccess={(employee) => {
                setCurrentEmployee(employee);
                localStorage.setItem('employee_id', employee.id);
                setShowNameEntry(false);
              }}
            />

          ) : !currentEmployee ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading...</p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 sm:p-6 rounded-xl border-2 border-blue-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base sm:text-lg font-semibold text-gray-800">
                        Welcome, <span className="text-blue-700">{currentEmployee.name}</span>
                      </p>
                      {currentShift && (
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: currentShift.color }}
                        >
                          {currentShift.name}
                        </span>
                      )}
                      {currentEmployee.is_temp && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                          TEMP
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      ID: {currentEmployee.employee_code}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-gray-600">Today's Total</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-700">{getTotalHours()}</p>
                  </div>
                </div>
              </div>

              {activeBreak ? (
                <div className="space-y-4">
                  <div className="bg-orange-50 border-2 border-orange-200 p-4 sm:p-6 rounded-xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">Currently on Break</p>
                        <p className="text-lg sm:text-xl font-bold text-orange-700 capitalize">
                          {activeBreak.break_type} Break
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Started: {new Date(activeBreak.start_time).toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Limit: {activeBreak.break_type === 'paid' ? PAID_BREAK_LIMIT : UNPAID_BREAK_LIMIT} minutes
                        </p>
                      </div>
                      <div className="animate-pulse">
                        <Coffee className="w-10 h-10 sm:w-12 sm:h-12 text-orange-600" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleEndBreak}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 sm:py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <StopCircle className="w-5 h-5" />
                    End Break
                  </button>
                </div>
              ) : !isStarted ? (
                <div className="space-y-4">
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => setShowResetPin(true)}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      <Lock className="w-4 h-4" />
                      Reset PIN
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Department
                    </label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => {
                        setSelectedDepartment(e.target.value);
                        setSelectedTask('');
                        loadTasks(e.target.value);
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      <option value="">Select Department</option>
                      {departments?.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedDepartment && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Task
                      </label>
                      <select
                        value={selectedTask}
                        onChange={(e) => setSelectedTask(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      >
                        <option value="">Select Task</option>
                        {tasks?.map(task => (
                          <option key={task.id} value={task.id}>{task.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={handleStart}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 sm:py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Start New Task
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleStartBreak('paid')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors flex flex-col items-center justify-center gap-1"
                    >
                      <Coffee className="w-5 h-5" />
                      <span className="text-xs sm:text-sm">Paid Break</span>
                      <span className="text-xs opacity-80">{PAID_BREAK_LIMIT} min</span>
                    </button>
                    <button
                      onClick={() => handleStartBreak('unpaid')}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors flex flex-col items-center justify-center gap-1"
                    >
                      <Coffee className="w-5 h-5" />
                      <span className="text-xs sm:text-sm">Unpaid Break</span>
                      <span className="text-xs opacity-80">{UNPAID_BREAK_LIMIT} min</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border-2 border-green-200 p-4 sm:p-6 rounded-xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">Currently Working On</p>
                        <p className="text-lg sm:text-xl font-bold text-green-700">
                          {tasks.find(t => t.id === activeEntry?.task_id)?.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Started: {activeEntry && new Date(activeEntry.start_time).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="animate-pulse">
                        <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleEnd}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 sm:py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <StopCircle className="w-5 h-5" />
                    End Task
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleStartBreak('paid')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors flex flex-col items-center justify-center gap-1"
                    >
                      <Coffee className="w-5 h-5" />
                      <span className="text-xs sm:text-sm">Paid Break</span>
                      <span className="text-xs opacity-80">{PAID_BREAK_LIMIT} min</span>
                    </button>
                    <button
                      onClick={() => handleStartBreak('unpaid')}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors flex flex-col items-center justify-center gap-1"
                    >
                      <Coffee className="w-5 h-5" />
                      <span className="text-xs sm:text-sm">Unpaid Break</span>
                      <span className="text-xs opacity-80">{UNPAID_BREAK_LIMIT} min</span>
                    </button>
                  </div>
                </div>
              )}

              {(todayEntries.length > 0 || todayBreaks.length > 0) && (
                <div className="mt-6 sm:mt-8">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Today's Activity</h3>

                  {todayBreaks.length > 0 && (
                    <div className="mb-4 p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Break Summary</p>
                      <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                        <div>
                          <span className="text-gray-600">Paid:</span>
                          <span className="ml-2 font-bold text-blue-700">{getTotalBreakTime('paid')}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Unpaid:</span>
                          <span className="ml-2 font-bold text-purple-700">{getTotalBreakTime('unpaid')}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {todayEntries.map(entry => (
                      <div key={entry.id} className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-800 text-sm sm:text-base">{entry.task?.name || 'Unknown Task'}</p>
                              <span className="text-xs text-gray-500 font-medium">
                                {entry.entry_date}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500">
                              {new Date(entry.start_time).toLocaleTimeString()} -
                              {entry.end_time ? ` ${new Date(entry.end_time).toLocaleTimeString()}` : ' In Progress'}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="font-bold text-blue-700 text-sm sm:text-base">
                              {formatDuration(entry.duration_minutes)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <PinModal
        isOpen={showPinSetup}
        onClose={() => {}}
        onSubmit={handlePinSetup}
        title="Set Up Your PIN"
        isSetup={true}
      />

      <PinModal
        isOpen={showPinVerify}
        onClose={() => {
          setShowPinVerify(false);
          setTempEmployee(null);
        }}
        onSubmit={handlePinVerify}
        title="Enter Your PIN"
        isSetup={false}
      />

      <PinModal
        isOpen={showResetPin}
        onClose={() => setShowResetPin(false)}
        onSubmit={handleResetPin}
        title="Reset Your PIN"
        isSetup={true}
      />

      {showProfile && currentEmployee && (
        <EmployeeProfile
          employee={currentEmployee}
          onClose={() => setShowProfile(false)}
          onUpdate={(updatedEmployee) => setCurrentEmployee(updatedEmployee)}
        />
      )}
    </div>
  );
}
