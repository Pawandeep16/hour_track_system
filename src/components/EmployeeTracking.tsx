import { useState, useEffect } from 'react';
import { supabase, Department, Task, Employee, TimeEntry } from '../lib/supabase';
import { Clock, Play, StopCircle, User } from 'lucide-react';

export default function EmployeeTracking() {
  const [employeeName, setEmployeeName] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [todayEntries, setTodayEntries] = useState<Array<TimeEntry & { task: Task }>>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    loadDepartments();
    loadAllEmployees();
  }, []);

  const loadAllEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('name');

    if (data) {
      setAllEmployees(data);
    }
  };

  useEffect(() => {
    if (selectedDepartment) {
      loadTasks(selectedDepartment);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (currentEmployee) {
      loadTodayEntries();
      checkActiveEntry();
    }
  }, [currentEmployee]);

  const loadDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .order('name');
    if (data) setDepartments(data);
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
    }
  };

  const generateEmployeeCode = (name: string) => {
    const namePart = name.toLowerCase().replace(/\s+/g, '_');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `EMP_${namePart}_${randomPart}`;
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
        setNameError('');
      } else {
        setNameError('Employee name not found in the system. Please enter your exact full name as registered or contact admin.');
        return;
      }

      if (employee) {
        setCurrentEmployee(employee);
      }
    }

    if (!selectedDepartment || !selectedTask) {
      alert('Please select department and task');
      return;
    }

    if (activeEntry) {
      await handleEnd();
    }

    const { data } = await supabase
      .from('time_entries')
      .insert({
        employee_id: employee!.id,
        department_id: selectedDepartment,
        task_id: selectedTask,
        start_time: new Date().toISOString(),
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <Clock className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Employee Time Tracker</h1>
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
                  placeholder="Enter your exact full name"
                />
                {nameError && (
                  <p className="text-red-600 text-sm mt-2 font-medium">{nameError}</p>
                )}
                {allEmployees.length > 0 && !currentEmployee && (
                  <p className="text-gray-500 text-xs mt-2">
                    Note: Enter your exact full name as registered in the system
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
              >
                <Play className="w-6 h-6" />
                Start Working
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-lg font-semibold text-gray-800">
                      Welcome, <span className="text-blue-700">{currentEmployee.name}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      ID: {currentEmployee.employee_code}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Today's Total</p>
                    <p className="text-2xl font-bold text-blue-700">{getTotalHours()}</p>
                  </div>
                </div>
              </div>

              {!isStarted ? (
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
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Start New Task
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border-2 border-green-200 p-6 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Currently Working On</p>
                        <p className="text-xl font-bold text-green-700">
                          {tasks.find(t => t.id === activeEntry?.task_id)?.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Started: {activeEntry && new Date(activeEntry.start_time).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="animate-pulse">
                        <Clock className="w-12 h-12 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleEnd}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <StopCircle className="w-5 h-5" />
                    End Task
                  </button>
                </div>
              )}

              {todayEntries.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Today's Activity</h3>
                  <div className="space-y-2">
                    {todayEntries.map(entry => (
                      <div key={entry.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-800">{entry.task.name}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(entry.start_time).toLocaleTimeString()} -
                              {entry.end_time ? ` ${new Date(entry.end_time).toLocaleTimeString()}` : ' In Progress'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-700">
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
