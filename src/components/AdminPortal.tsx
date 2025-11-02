import { useState, useEffect } from 'react';
import { supabase, Department, Task, Employee, TimeEntry, BreakEntry } from '../lib/supabase';
import {
  BarChart3,
  Users,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Filter,
  Lock,
  LogOut,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import Papa from "papaparse";
import * as XLSX from 'xlsx';

interface EmployeeWithEntries extends Employee {
  entries: Array<TimeEntry & { task: Task; department: Department }>;
  breaks: BreakEntry[];
  totalMinutes: number;
  totalBreakMinutes: number;
}

interface DepartmentSummary {
  departmentId: string;
  departmentName: string;
  tasks: Array<{
    taskName: string;
    employeeCount: number;
    totalMinutes: number;
    employees: Array<{ name: string; minutes: number }>;
  }>;
  departmentTotalMinutes: number;
}

export default function AdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<EmployeeWithEntries[]>([]);
  const [departmentSummaries, setDepartmentSummaries] = useState<DepartmentSummary[]>([]);
  const [grandTotalMinutes, setGrandTotalMinutes] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDept, setNewTaskDept] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [activeTab, setActiveTab] = useState<'individual' | 'summary' | 'manage' | 'employees'>('individual');
  const [summaryDeptFilter, setSummaryDeptFilter] = useState<string>('all');
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [newEmployeeName, setNewEmployeeName] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [selectedDate, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const { data, error } = await supabase
      .from('admin_credentials')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .maybeSingle();

    if (data) {
      setIsAuthenticated(true);
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
  };

  const loadData = async () => {
    await Promise.all([
      loadDepartments(),
      loadTasks(),
      loadEmployeesWithEntries(),
      generateDepartmentSummaries(),
      loadAllEmployees()
    ]);
  };

  const loadAllEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('name');

    if (data) {
      setAllEmployees(data);
    }
  };

  const loadDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .order('name');
    if (data) setDepartments(data);
  };

  const loadTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, department:departments(*)')
      .order('name');
    if (data) setTasks(data as any);
  };

  const loadEmployeesWithEntries = async () => {
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('*')
      .order('name');

    if (!allEmployees) return;

    const employeesWithData = await Promise.all(
      allEmployees.map(async (employee) => {
        const { data: entries } = await supabase
          .from('time_entries')
          .select('*, task:tasks(*), department:departments(*)')
          .eq('employee_id', employee.id)
          .eq('entry_date', selectedDate)
          .order('start_time');

        const { data: breaks } = await supabase
          .from('break_entries')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('entry_date', selectedDate)
          .order('start_time');

        const totalMinutes = (entries || []).reduce(
          (sum, entry) => sum + (entry.duration_minutes || 0),
          0
        );

        const totalBreakMinutes = (breaks || []).reduce(
          (sum, breakEntry) => sum + (breakEntry.duration_minutes || 0),
          0
        );

        return {
          ...employee,
          entries: entries || [],
          breaks: breaks || [],
          totalMinutes,
          totalBreakMinutes
        } as EmployeeWithEntries;
      })
    );

    setEmployees(employeesWithData.filter(e => e.entries.length > 0 || e.breaks.length > 0));
  };

  const generateDepartmentSummaries = async () => {
    const { data: entries } = await supabase
      .from('time_entries')
      .select('*, task:tasks(*), department:departments(*), employee:employees(*)')
      .eq('entry_date', selectedDate)
      .not('end_time', 'is', null);

    if (!entries) return;

    const departmentMap = new Map<string, DepartmentSummary>();
    let grandTotal = 0;

    entries.forEach((entry: any) => {
      const deptId = entry.department.id;
      const deptName = entry.department.name;

      if (!departmentMap.has(deptId)) {
        departmentMap.set(deptId, {
          departmentId: deptId,
          departmentName: deptName,
          tasks: [],
          departmentTotalMinutes: 0
        });
      }

      const deptSummary = departmentMap.get(deptId)!;

      let taskSummary = deptSummary.tasks.find(t => t.taskName === entry.task.name);
      if (!taskSummary) {
        taskSummary = {
          taskName: entry.task.name,
          employeeCount: 0,
          totalMinutes: 0,
          employees: []
        };
        deptSummary.tasks.push(taskSummary);
      }

      taskSummary.totalMinutes += entry.duration_minutes || 0;
      deptSummary.departmentTotalMinutes += entry.duration_minutes || 0;
      grandTotal += entry.duration_minutes || 0;

      const existingEmp = taskSummary.employees.find(e => e.name === entry.employee.name);
      if (existingEmp) {
        existingEmp.minutes += entry.duration_minutes || 0;
      } else {
        taskSummary.employees.push({
          name: entry.employee.name,
          minutes: entry.duration_minutes || 0
        });
      }
      taskSummary.employeeCount = taskSummary.employees.length;
    });

    const summaries = Array.from(departmentMap.values());
    summaries.forEach(dept => {
      dept.tasks.sort((a, b) => b.totalMinutes - a.totalMinutes);
    });

    setDepartmentSummaries(summaries);
    setGrandTotalMinutes(grandTotal);
  };

  const addDepartment = async () => {
    if (!newDeptName.trim()) return;

    await supabase.from('departments').insert({ name: newDeptName.trim() });
    setNewDeptName('');
    loadDepartments();
  };

  const addTask = async () => {
    if (!newTaskName.trim() || !newTaskDept) return;

    await supabase.from('tasks').insert({
      name: newTaskName.trim(),
      department_id: newTaskDept
    });

    setNewTaskName('');
    setNewTaskDept('');
    loadTasks();
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    await supabase.from('tasks').delete().eq('id', taskId);
    loadTasks();
  };

  const deleteDepartment = async (deptId: string) => {
    if (!confirm('Are you sure? This will delete all associated tasks!')) return;
    await supabase.from('departments').delete().eq('id', deptId);
    loadDepartments();
    loadTasks();
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const generateEmployeeCode = (name: string) => {
    const namePart = name.toLowerCase().replace(/\s+/g, '_');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `EMP_${namePart}_${randomPart}`;
  };

  const addEmployee = async () => {
    if (!newEmployeeName.trim()) return;

    const employeeCode = generateEmployeeCode(newEmployeeName.trim());

    await supabase
      .from('employees')
      .insert({ name: newEmployeeName.trim(), employee_code: employeeCode });

    setNewEmployeeName('');
    loadAllEmployees();
  };

  const deleteEmployee = async (empId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    await supabase.from('employees').delete().eq('id', empId);
    loadAllEmployees();
  };

  const downloadEmployeeCSV = () => {
    const csv = Papa.unparse({
      fields: ['name', 'employee_code'],
      data: allEmployees.map(emp => ({
        name: emp.name,
        employee_code: emp.employee_code
      }))
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadEmployeeTemplate = () => {
    const csv = Papa.unparse({
      fields: ['name'],
      data: [['John Doe'], ['Jane Smith']]
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const employees = results.data
            .filter((row: any) => row.name && row.name.trim())
            .map((row: any) => ({
              name: row.name.trim(),
              employee_code: generateEmployeeCode(row.name.trim())
            }));

          if (employees.length > 0) {
            await supabase.from('employees').insert(employees);
            loadAllEmployees();
            alert(`Successfully imported ${employees.length} employees`);
          }
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const employees = jsonData
          .filter((row: any) => row.name && row.name.trim())
          .map((row: any) => ({
            name: row.name.trim(),
            employee_code: generateEmployeeCode(row.name.trim())
          }));

        if (employees.length > 0) {
          await supabase.from('employees').insert(employees);
          loadAllEmployees();
          alert(`Successfully imported ${employees.length} employees`);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      alert('Please upload a CSV or XLSX file');
    }

    event.target.value = '';
  };

  const generatePDFReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Time Tracking Report', pageWidth / 2, yPos, { align: 'center' });

    yPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report Date: ${new Date(selectedDate).toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });

    yPos += 15;

    employees.forEach((employee, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${employee.name}`, 14, yPos);

      yPos += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Employee ID: ${employee.employee_code}`, 14, yPos);
      doc.setTextColor(0, 0, 0);

      yPos += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Time: ${formatDuration(employee.totalMinutes)}`, 14, yPos);

      if (employee.totalBreakMinutes > 0) {
        yPos += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Break Time: ${formatDuration(employee.totalBreakMinutes)}`, 14, yPos);
      }

      yPos += 8;

      const tableData = employee.entries.map((entry: any) => [
        entry.department.name,
        entry.task.name,
        new Date(entry.start_time).toLocaleTimeString(),
        entry.end_time ? new Date(entry.end_time).toLocaleTimeString() : 'In Progress',
        formatDuration(entry.duration_minutes || 0)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Department', 'Task', 'Start Time', 'End Time', 'Duration']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          yPos = data.cursor?.y || yPos;
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      if (index < employees.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, pageWidth - 14, yPos);
        yPos += 10;
      }
    });

    doc.save(`time-tracking-report-${selectedDate}.pdf`);
  };

  const getFilteredDepartmentSummaries = () => {
    if (summaryDeptFilter === 'all') {
      return departmentSummaries;
    }
    return departmentSummaries.filter(dept => dept.departmentId === summaryDeptFilter);
  };

  const getFilteredGrandTotal = () => {
    if (summaryDeptFilter === 'all') {
      return grandTotalMinutes;
    }
    const filtered = departmentSummaries.find(dept => dept.departmentId === summaryDeptFilter);
    return filtered?.departmentTotalMinutes || 0;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <Lock className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-blue-600 mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Admin Login</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">Enter your credentials to access the admin portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Enter password"
                required
              />
            </div>

            {loginError && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 sm:py-4 rounded-xl transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-8 text-white">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10" />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">Admin Portal</h1>
                  <p className="text-blue-100 mt-1 text-sm sm:text-base">Employee Time Tracking Dashboard</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full lg:w-auto">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 sm:px-4 rounded-lg text-gray-800 font-semibold border-2 border-white focus:outline-none text-sm sm:text-base"
                  />
                </div>
                <button
                  onClick={generatePDFReport}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-green-500 hover:bg-green-600 rounded-lg transition-colors font-semibold text-sm sm:text-base"
                  disabled={employees.length === 0}
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Download PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm sm:text-base"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex gap-1 p-3 sm:p-4 min-w-max">
              <button
                onClick={() => setActiveTab('individual')}
                className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base whitespace-nowrap ${
                  activeTab === 'individual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Individual
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base whitespace-nowrap ${
                  activeTab === 'summary'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Summary
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base whitespace-nowrap ${
                  activeTab === 'manage'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-4 h-4 inline mr-2" />
                Manage
              </button>
              <button
                onClick={() => setActiveTab('employees')}
                className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base whitespace-nowrap ${
                  activeTab === 'employees'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Employees
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-8">
            {activeTab === 'individual' && (
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  Individual Employee Reports
                </h2>

                {employees.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Clock className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-base sm:text-lg">No time entries for this date</p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {employees.map(employee => (
                      <div key={employee.id} className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 sm:p-6 border-2 border-blue-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                          <div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-800">{employee.name}</h3>
                            <p className="text-xs text-gray-600 mt-1 font-mono">
                              Employee ID: {employee.employee_code}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-sm text-gray-600">Total Time</p>
                            <p className="text-xl sm:text-2xl font-bold text-blue-700">
                              {formatDuration(employee.totalMinutes)}
                            </p>
                            {employee.totalBreakMinutes > 0 && (
                              <p className="text-xs text-gray-600 mt-1">
                                Break: {formatDuration(employee.totalBreakMinutes)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="bg-white rounded-lg overflow-x-auto shadow">
                          <table className="w-full min-w-max">
                            <thead className="bg-gray-50 border-b-2 border-gray-200">
                              <tr>
                                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Department</th>
                                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Task</th>
                                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Start</th>
                                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">End</th>
                                <th className="px-3 py-2 sm:px-4 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-700">Duration</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {employee.entries.map((entry: any) => (
                                <tr key={entry.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-700">{entry.department.name}</td>
                                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">{entry.task.name}</td>
                                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-600">
                                    {new Date(entry.start_time).toLocaleTimeString()}
                                  </td>
                                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-600">
                                    {entry.end_time ? new Date(entry.end_time).toLocaleTimeString() : 'In Progress'}
                                  </td>
                                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold text-blue-700 text-right">
                                    {formatDuration(entry.duration_minutes || 0)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'summary' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    Department Summary
                  </h2>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Filter:</label>
                    <select
                      value={summaryDeptFilter}
                      onChange={(e) => setSummaryDeptFilter(e.target.value)}
                      className="flex-1 sm:flex-initial px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    >
                      <option value="all">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {departmentSummaries.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-base sm:text-lg">No completed tasks for this date</p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {getFilteredDepartmentSummaries().map((deptSummary) => (
                      <div key={deptSummary.departmentId} className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-xl p-4 sm:p-6 border-2 border-blue-300 shadow-lg">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 pb-4 border-b-2 border-blue-200 gap-3">
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{deptSummary.departmentName} Department</h3>
                          <div className="text-left sm:text-right">
                            <p className="text-sm text-gray-600">Department Total</p>
                            <p className="text-2xl sm:text-3xl font-bold text-blue-700">
                              {formatDuration(deptSummary.departmentTotalMinutes)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 sm:space-y-4">
                          {deptSummary.tasks.map((task, taskIdx) => (
                            <div key={taskIdx} className="bg-white rounded-lg p-4 sm:p-5 border-2 border-gray-200 shadow">
                              <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-3">
                                <div className="flex-1">
                                  <h4 className="text-base sm:text-lg font-bold text-gray-800">{task.taskName}</h4>
                                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                    {task.employeeCount} {task.employeeCount === 1 ? 'employee' : 'employees'} worked on this task
                                  </p>
                                </div>
                                <div className="text-left sm:text-right">
                                  <p className="text-xs sm:text-sm text-gray-600">Task Total</p>
                                  <p className="text-xl sm:text-2xl font-bold text-green-700">
                                    {formatDuration(task.totalMinutes)}
                                  </p>
                                </div>
                              </div>

                              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                                  Employee Breakdown
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                                  {task.employees.map((emp, empIdx) => (
                                    <div key={empIdx} className="bg-white rounded-lg p-2 sm:p-3 border border-gray-300">
                                      <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{emp.name}</p>
                                      <p className="text-base sm:text-lg font-bold text-blue-700">
                                        {formatDuration(emp.minutes)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-6 sm:p-8 border-4 border-green-300 shadow-2xl">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <p className="text-base sm:text-lg text-gray-700 font-semibold">
                            {summaryDeptFilter === 'all' ? 'Total Hours for Entire Unit' : `Total for ${departments.find(d => d.id === summaryDeptFilter)?.name}`}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">
                            {summaryDeptFilter === 'all' ? 'All departments combined' : 'Department total'}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-3xl sm:text-5xl font-bold text-green-700">
                            {formatDuration(getFilteredGrandTotal())}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'manage' && (
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    Add New Department
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="Department name"
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={addDepartment}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors whitespace-nowrap"
                    >
                      Add Department
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {departments.map(dept => (
                      <div key={dept.id} className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 flex justify-between items-center">
                        <span className="font-semibold text-gray-800 text-sm sm:text-base">{dept.name}</span>
                        <button
                          onClick={() => deleteDepartment(dept.id)}
                          className="text-red-600 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    Add New Task
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={newTaskDept}
                      onChange={(e) => setNewTaskDept(e.target.value)}
                      className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      placeholder="Task name"
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={addTask}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors whitespace-nowrap"
                    >
                      Add Task
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    {departments.map(dept => {
                      const deptTasks = tasks.filter((t: any) => t.department_id === dept.id);
                      if (deptTasks.length === 0) return null;

                      return (
                        <div key={dept.id} className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                          <h3 className="font-bold text-gray-800 mb-3 text-sm sm:text-base">{dept.name}</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {deptTasks.map(task => (
                              <div key={task.id} className="bg-white rounded-lg p-3 border border-gray-300 flex justify-between items-center">
                                <span className="text-xs sm:text-sm text-gray-800">{task.name}</span>
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="text-red-600 hover:text-red-700 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'employees' && (
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    Manage Employees
                  </h2>

                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Import/Export Employees</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                      <button
                        onClick={downloadEmployeeTemplate}
                        className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <Download className="w-4 h-4" />
                        Download Template
                      </button>
                      <button
                        onClick={downloadEmployeeCSV}
                        className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <Download className="w-4 h-4" />
                        Export List
                      </button>
                      <label className="px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base">
                        <Plus className="w-4 h-4" />
                        Import CSV/XLSX
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-4">
                      CSV/XLSX file should have a column named "name" with employee full names. Employee IDs will be generated automatically.
                    </p>
                  </div>

                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Add Individual Employee</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={newEmployeeName}
                        onChange={(e) => setNewEmployeeName(e.target.value)}
                        placeholder="Employee full name"
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={addEmployee}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors whitespace-nowrap"
                      >
                        Add Employee
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
                    Employee List ({allEmployees.length} total)
                  </h3>

                  {allEmployees.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-base sm:text-lg">No employees registered yet</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:gap-4">
                      {allEmployees.map((employee) => (
                        <div key={employee.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-5 hover:border-blue-300 transition-colors">
                          <div className="flex justify-between items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base sm:text-lg font-bold text-gray-800 truncate">{employee.name}</h4>
                              <p className="text-xs sm:text-sm text-gray-600 font-mono mt-1 truncate">
                                ID: {employee.employee_code}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteEmployee(employee.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
