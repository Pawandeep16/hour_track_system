import { useState, useEffect } from 'react';
import { supabase, Department, Task, Employee, TimeEntry, BreakEntry, Shift } from '../lib/supabase';
import { Clock, Play, StopCircle, User, LogOut, Coffee } from 'lucide-react';
import { detectShift } from '../lib/shiftUtils';

const PAID_BREAK_LIMIT = 30;
const UNPAID_BREAK_LIMIT = 3;

export default function EmployeeTracking() {
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
    }
  }, [currentEmployee]);

  const checkStoredEmployee = () => {
    const storedEmployeeId = localStorage.getItem('employee_id');
    if (storedEmployeeId) {
      loadEmployeeById(storedEmployeeId);
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
    } else {
      localStorage.removeItem('employee_id');
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
      .eq('department_id', departmentId)
      .order('name');
    if (data) setTasks(data);
  };

  const loadTodayEntries = async () => {
    if (!currentEmployee) return;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('time_entries')
      .select('*, task:tasks(*)')
      .eq('employee_id', currentEmployee.id)
      .eq('entry_date', today)
      .order('start_time', { ascending: false });

    if (data) setTodayEntries(data as any);
  };

  const loadTodayBreaks = async () => {
    if (!currentEmployee) return;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('break_entries')
      .select('*')
      .eq('employee_id', currentEmployee.id)
      .eq('entry_date', today)
      .order('start_time', { ascending: false });

    if (data) setTodayBreaks(data);
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
        .select('*, department:departments(*)')
        .eq('id', data.task_id)
        .single();

      if (taskData) {
        setSelectedDepartment(taskData.department_id);
        setSelectedTask(taskData.id);
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

  const handleStart = async () => {
    if (!employeeName.trim()) {
      setNameError('Please enter your name');
      return;
    }

    let employee = currentEmployee;

    if (!employee) {
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('*')
        .eq('name', employeeName.trim())
        .maybeSingle();

      if (existingEmployee) {
        employee = existingEmployee;
        setCurrentEmployee(employee);
        localStorage.setItem('employee_id', employee.id);
        setNameError('');
        return;
      } else {
        setNameError('Employee name not found in the system. Please enter your exact full name as registered or contact admin.');
        return;
      }
    }

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

    const startTime = new Date().toISOString();
    const detectedShift = detectShift(startTime, shifts);

    if (detectedShift && !currentShift) {
      setCurrentShift(detectedShift);
    }

    const { data } = await supabase
      .from('time_entries')
      .insert({
        employee_id: employee!.id,
        department_id: selectedDepartment,
        task_id: selectedTask,
        start_time: startTime,
        shift_id: detectedShift?.id || null,
        entry_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (data) {
      setActiveEntry(data);
      setIsStarted(true);
      loadTodayEntries();
    }
  };

  const handleEnd = async () => {
    if (!activeEntry) return;

    const endTime = new Date();
    const startTime = new Date(activeEntry.start_time);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    await supabase
      .from('time_entries')
      .update({
        end_time: endTime.toISOString(),
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
        start_time: new Date().toISOString(),
        entry_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (data) {
      setActiveBreak(data);
      loadTodayBreaks();
    }
  };

  const handleEndBreak = async () => {
    if (!activeBreak) return;

    const endTime = new Date();
    const startTime = new Date(activeBreak.start_time);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

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
        end_time: endTime.toISOString(),
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <h1 className="text-xl sm:text-3xl font-bold text-gray-800">Employee Time Tracker</h1>
            </div>
            {currentEmployee && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>

          {!currentEmployee ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Your Name
                </label>
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => {
                    setEmployeeName(e.target.value);
                    setNameError('');
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-base sm:text-lg"
                  placeholder="Enter your exact full name"
                />
                {nameError && (
                  <p className="text-red-600 text-sm mt-2 font-medium">{nameError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-base sm:text-lg"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-base sm:text-lg"
                  >
                    <option value="">Select Task</option>
                    {tasks.map(task => (
                      <option key={task.id} value={task.id}>{task.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleStart}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-base sm:text-lg"
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                Start Working
              </button>
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
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Department
                    </label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
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
                        {tasks.map(task => (
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
                            <p className="font-semibold text-gray-800 text-sm sm:text-base">{entry.task.name}</p>
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
    </div>
  );
}
