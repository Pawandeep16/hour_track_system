import { useState, useEffect } from 'react';
import { supabase, Department, Task, Employee, TimeEntry, BreakEntry, Shift } from '../lib/supabase';
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
  Download,
  Search
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PinModal from './PinModal';

import Papa from "papaparse";
import * as XLSX from 'xlsx';

interface EmployeeWithEntries extends Employee {
  entries: Array<TimeEntry & { task: Task; department: Department; shift?: Shift }>;
  breaks: BreakEntry[];
  totalMinutes: number;
  totalBreakMinutes: number;
  shift?: Shift | null;
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

interface AdminPortalProps {
  onLoginStateChange: (isLoggedIn: boolean) => void;
}

export default function AdminPortal({ onLoginStateChange }: AdminPortalProps) {
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
  const [activeTab, setActiveTab] = useState<'individual' | 'summary' | 'manage' | 'employees' | 'shifts'>('individual');
  const [summaryDeptFilter, setSummaryDeptFilter] = useState<string>('all');
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newTempEmployeeName, setNewTempEmployeeName] = useState('');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<'all' | 'regular' | 'temp'>('all');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('06:00');
  const [newShiftEnd, setNewShiftEnd] = useState('14:00');
  const [newShiftColor, setNewShiftColor] = useState('#3b82f6');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [individualSearchQuery, setIndividualSearchQuery] = useState('');
  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [selectedEmployeeForPinReset, setSelectedEmployeeForPinReset] = useState<Employee | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      onLoginStateChange(true);
    } else {
      onLoginStateChange(false);
    }
  }, [selectedDate, isAuthenticated, onLoginStateChange]);

  useEffect(() => {
    if (isAuthenticated) {
      generateDepartmentSummaries();
    }
  }, [employeeTypeFilter]);

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
    onLoginStateChange(false);
  };

  const loadData = async () => {
    await Promise.all([
      loadDepartments(),
      loadTasks(),
      loadShifts(),
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

  const loadShifts = async () => {
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .order('start_time');
    if (data) setShifts(data);
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
          .select('*, task:tasks(*), department:departments(*), shift:shifts(*)')
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

        const firstEntry = entries && entries.length > 0 ? entries[0] : null;
        const employeeShift = firstEntry ? (firstEntry as any).shift : null;

        return {
          ...employee,
          entries: entries || [],
          breaks: breaks || [],
          totalMinutes,
          totalBreakMinutes,
          shift: employeeShift
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
      if (employeeTypeFilter === 'regular' && entry.employee.is_temp) return;
      if (employeeTypeFilter === 'temp' && !entry.employee.is_temp) return;

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

  const generateEmployeeCode = (name: string, isTemp: boolean = false) => {
    const namePart = name.toLowerCase().replace(/\s+/g, '_');
    if (isTemp) {
      return `TEMP_${namePart}`;
    }
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `EMP_${namePart}_${randomPart}`;
  };

  const addEmployee = async () => {
    if (!newEmployeeName.trim()) return;

    const employeeCode = generateEmployeeCode(newEmployeeName.trim(), false);

    await supabase
      .from('employees')
      .insert({ name: newEmployeeName.trim(), employee_code: employeeCode, is_temp: false });

    setNewEmployeeName('');
    loadAllEmployees();
  };

  const addTempEmployee = async () => {
    if (!newTempEmployeeName.trim()) return;

    const employeeCode = generateEmployeeCode(newTempEmployeeName.trim(), true);

    await supabase
      .from('employees')
      .insert({ name: newTempEmployeeName.trim(), employee_code: employeeCode, is_temp: true });

    setNewTempEmployeeName('');
    loadAllEmployees();
  };

  const deleteEmployee = async (empId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    await supabase.from('employees').delete().eq('id', empId);
    loadAllEmployees();
  };

  const handleResetEmployeePin = async (newPin: string) => {
    if (!selectedEmployeeForPinReset) return;

    const { error } = await supabase
      .from('employees')
      .update({
        security_pin: newPin,
        pin_set_at: new Date().toISOString()
      })
      .eq('id', selectedEmployeeForPinReset.id);

    if (!error) {
      setShowResetPinModal(false);
      setSelectedEmployeeForPinReset(null);
      loadAllEmployees();
      alert('Employee PIN reset successfully!');
    } else {
      alert('Failed to reset PIN. Please try again.');
    }
  };

  const openResetPinModal = (employee: Employee) => {
    setSelectedEmployeeForPinReset(employee);
    setShowResetPinModal(true);
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
              employee_code: generateEmployeeCode(row.name.trim(), false),
              is_temp: false
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
            employee_code: generateEmployeeCode(row.name.trim(), false),
            is_temp: false
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

  const handleTempFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
              employee_code: generateEmployeeCode(row.name.trim(), true),
              is_temp: true
            }));

          if (employees.length > 0) {
            await supabase.from('employees').insert(employees);
            loadAllEmployees();
            alert(`Successfully imported ${employees.length} temp employees`);
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
            employee_code: generateEmployeeCode(row.name.trim(), true),
            is_temp: true
          }));

        if (employees.length > 0) {
          await supabase.from('employees').insert(employees);
          loadAllEmployees();
          alert(`Successfully imported ${employees.length} temp employees`);
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

  const addShift = async () => {
    if (!newShiftName.trim() || !newShiftStart || !newShiftEnd) return;

    await supabase.from('shifts').insert({
      name: newShiftName.trim(),
      start_time: newShiftStart + ':00',
      end_time: newShiftEnd + ':00',
      color: newShiftColor
    });

    setNewShiftName('');
    setNewShiftStart('06:00');
    setNewShiftEnd('14:00');
    setNewShiftColor('#3b82f6');
    loadShifts();
  };

  const deleteShift = async (shiftId: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    await supabase.from('shifts').delete().eq('id', shiftId);
    loadShifts();
  };

  const generateExcelReport = () => {
    const workbook = XLSX.utils.book_new();

    const filteredDepartments = summaryDeptFilter === 'all'
      ? departmentSummaries
      : departmentSummaries.filter(dept => dept.departmentId === summaryDeptFilter);

    const departmentColors = [
      'FFE6F2FF', 'FFD4EDDA', 'FFFCE8B2', 'FFDAEEF3',
      'FFE8DAEF', 'FFFDEDC8', 'FFD4E6F1', 'FFFAD7E3'
    ];

    const detailedSummaryData: any[] = [];

    const filterLabel = summaryDeptFilter === 'all'
      ? 'All Departments'
      : departments.find(d => d.id === summaryDeptFilter)?.name || 'Unknown';

    const employeeTypeLabel = employeeTypeFilter === 'all'
      ? 'All Employees'
      : employeeTypeFilter === 'regular'
      ? 'Regular Employees Only'
      : 'Temp Employees Only';

    detailedSummaryData.push({
      'Task Name': 'REPORT FILTERS',
      'Employee Count': '',
      'Employee Names': '',
      'Total Hours': ''
    });

    detailedSummaryData.push({
      'Task Name': `Date: ${new Date(selectedDate).toLocaleDateString()}`,
      'Employee Count': '',
      'Employee Names': `Department Filter: ${filterLabel}`,
      'Total Hours': `Employee Type: ${employeeTypeLabel}`
    });

    detailedSummaryData.push({
      'Task Name': '',
      'Employee Count': '',
      'Employee Names': '',
      'Total Hours': ''
    });

    let currentRow = 4;
    const cellStyles: any = {};

    filteredDepartments.forEach((dept, deptIndex) => {
      const deptColor = departmentColors[deptIndex % departmentColors.length];

      detailedSummaryData.push({
        'Task Name': `DEPARTMENT: ${dept.departmentName.toUpperCase()}`,
        'Employee Count': '',
        'Employee Names': '',
        'Total Hours': ''
      });

      const deptHeaderRow = currentRow;
      cellStyles[`A${deptHeaderRow}`] = { fill: { fgColor: { rgb: deptColor } }, font: { bold: true, sz: 12 } };
      cellStyles[`B${deptHeaderRow}`] = { fill: { fgColor: { rgb: deptColor } }, font: { bold: true, sz: 12 } };
      cellStyles[`C${deptHeaderRow}`] = { fill: { fgColor: { rgb: deptColor } }, font: { bold: true, sz: 12 } };
      cellStyles[`D${deptHeaderRow}`] = { fill: { fgColor: { rgb: deptColor } }, font: { bold: true, sz: 12 } };
      currentRow++;

      dept.tasks.forEach(task => {
        const employeeNames = task.employees.map(emp => emp.name).join(', ');

        detailedSummaryData.push({
          'Task Name': task.taskName,
          'Employee Count': `${task.employeeCount} employee${task.employeeCount !== 1 ? 's' : ''}`,
          'Employee Names': employeeNames,
          'Total Hours': formatDuration(task.totalMinutes)
        });

        cellStyles[`A${currentRow}`] = { fill: { fgColor: { rgb: deptColor } }, font: { sz: 11 } };
        cellStyles[`B${currentRow}`] = { fill: { fgColor: { rgb: deptColor } }, font: { sz: 11 } };
        cellStyles[`C${currentRow}`] = { fill: { fgColor: { rgb: deptColor } }, font: { sz: 11 } };
        cellStyles[`D${currentRow}`] = { fill: { fgColor: { rgb: deptColor } }, font: { sz: 11, bold: true } };
        currentRow++;
      });

      detailedSummaryData.push({
        'Task Name': '',
        'Employee Count': '',
        'Employee Names': 'DEPARTMENT TOTAL:',
        'Total Hours': formatDuration(dept.departmentTotalMinutes)
      });

      cellStyles[`C${currentRow}`] = { font: { bold: true, sz: 11 } };
      cellStyles[`D${currentRow}`] = { fill: { fgColor: { rgb: 'FFFFF200' } }, font: { bold: true, sz: 11 } };
      currentRow++;

      detailedSummaryData.push({
        'Task Name': '',
        'Employee Count': '',
        'Employee Names': '',
        'Total Hours': ''
      });
      currentRow++;
    });

    const grandTotal = filteredDepartments.reduce((sum, dept) => sum + dept.departmentTotalMinutes, 0);

    detailedSummaryData.push({
      'Task Name': '',
      'Employee Count': '',
      'Employee Names': 'GRAND TOTAL:',
      'Total Hours': formatDuration(grandTotal)
    });

    cellStyles[`C${currentRow}`] = { font: { bold: true, sz: 13 } };
    cellStyles[`D${currentRow}`] = { fill: { fgColor: { rgb: 'FF00B050' } }, font: { bold: true, sz: 13, color: { rgb: 'FFFFFFFF' } } };

    const employeeData = employees.map(emp => ({
      'Employee Name': emp.name,
      'Employee ID': emp.employee_code,
      'Type': emp.is_temp ? 'Temp' : 'Regular',
      'Shift': emp.shift?.name || 'N/A',
      'Total Hours': formatDuration(emp.totalMinutes),
      'Break Time': formatDuration(emp.totalBreakMinutes),
      'Date': new Date(selectedDate).toLocaleDateString()
    }));

    const detailedData: any[] = [];
    employees.forEach(emp => {
      emp.entries.forEach((entry: any) => {
        detailedData.push({
          'Employee Name': emp.name,
          'Employee ID': emp.employee_code,
          'Type': emp.is_temp ? 'Temp' : 'Regular',
          'Shift': emp.shift?.name || 'N/A',
          'Department': entry.department.name,
          'Task': entry.task.name,
          'Start Time': new Date(entry.start_time).toLocaleTimeString(),
          'End Time': entry.end_time ? new Date(entry.end_time).toLocaleTimeString() : 'In Progress',
          'Duration': formatDuration(entry.duration_minutes || 0),
          'Date': new Date(selectedDate).toLocaleDateString()
        });
      });
    });

    const ws1 = XLSX.utils.json_to_sheet(detailedSummaryData);
    const ws2 = XLSX.utils.json_to_sheet(employeeData);
    const ws3 = XLSX.utils.json_to_sheet(detailedData);

    Object.keys(cellStyles).forEach(cell => {
      if (ws1[cell]) {
        ws1[cell].s = cellStyles[cell];
      }
    });

    ws1['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 35 }, { wch: 15 }];
    ws2['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    ws3['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];

    XLSX.utils.book_append_sheet(workbook, ws1, 'Department Summary');
    XLSX.utils.book_append_sheet(workbook, ws2, 'Employee Overview');
    XLSX.utils.book_append_sheet(workbook, ws3, 'Detailed Report');

    XLSX.writeFile(workbook, `time-tracking-report-${selectedDate}.xlsx`);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center p-4 sm:p-6 text-black">
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
    <div className="min-h-screen p-4 sm:p-6">
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
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={generateExcelReport}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors font-semibold text-sm sm:text-base"
                  disabled={employees.length === 0}
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Excel</span>
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
              <button
                onClick={() => setActiveTab('shifts')}
                className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base whitespace-nowrap ${
                  activeTab === 'shifts'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Shifts
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-8">
            {activeTab === 'individual' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    Individual Employee Reports
                  </h2>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={individualSearchQuery}
                      onChange={(e) => setIndividualSearchQuery(e.target.value)}
                      placeholder="Search employees..."
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                {employees.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Clock className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-base sm:text-lg">No time entries for this date</p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {employees
                      .filter(emp =>
                        individualSearchQuery === '' ||
                        emp.name.toLowerCase().includes(individualSearchQuery.toLowerCase()) ||
                        emp.employee_code.toLowerCase().includes(individualSearchQuery.toLowerCase())
                      )
                      .map(employee => (
                      <div key={employee.id} className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 sm:p-6 border-2 border-blue-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg sm:text-xl font-bold text-gray-800">{employee.name}</h3>
                              {employee.shift && (
                                <span
                                  className="px-3 py-1 rounded-full text-xs font-bold text-white"
                                  style={{ backgroundColor: employee.shift.color }}
                                >
                                  {employee.shift.name}
                                </span>
                              )}
                              {employee.is_temp && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                                  TEMP
                                </span>
                              )}
                            </div>
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

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Department:</label>
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
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Employee Type:</label>
                      <select
                        value={employeeTypeFilter}
                        onChange={(e) => setEmployeeTypeFilter(e.target.value as 'all' | 'regular' | 'temp')}
                        className="flex-1 sm:flex-initial px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                      >
                        <option value="all">All Employees</option>
                        <option value="regular">Regular Only</option>
                        <option value="temp">Temp Only</option>
                      </select>
                    </div>
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
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Import/Export Regular Employees</h3>
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
                        Import Regular
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-4">
                      CSV/XLSX file should have a column named "name" with employee full names. Regular employee IDs will be generated automatically (EMP_name_1234).
                    </p>
                  </div>

                  <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Import/Export Temp Employees</h3>
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
                      <label className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base">
                        <Plus className="w-4 h-4" />
                        Import Temp
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleTempFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-4">
                      CSV/XLSX file should have a column named "name" with employee full names. Temp employee IDs will be generated automatically (TEMP_name).
                    </p>
                  </div>

                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Add Regular Employee</h3>
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
                        Add Regular
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Regular employees get IDs like: EMP_john_doe_1234
                    </p>
                  </div>

                  <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Add Temporary Employee</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={newTempEmployeeName}
                        onChange={(e) => setNewTempEmployeeName(e.target.value)}
                        placeholder="Temp employee full name"
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={addTempEmployee}
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-colors whitespace-nowrap"
                      >
                        Add Temp
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Temp employees get IDs like: TEMP_john_doe
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                      Employee List ({allEmployees.filter(emp => {
                        const matchesSearch = employeeSearchQuery === '' ||
                          emp.name.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
                          emp.employee_code.toLowerCase().includes(employeeSearchQuery.toLowerCase());
                        const matchesFilter = employeeTypeFilter === 'all' ||
                          (employeeTypeFilter === 'temp' && emp.is_temp) ||
                          (employeeTypeFilter === 'regular' && !emp.is_temp);
                        return matchesSearch && matchesFilter;
                      }).length} shown)
                    </h3>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={employeeSearchQuery}
                          onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                          placeholder="Search employees..."
                          className="w-full sm:w-64 pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                      <select
                        value={employeeTypeFilter}
                        onChange={(e) => setEmployeeTypeFilter(e.target.value as 'all' | 'regular' | 'temp')}
                        className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                      >
                        <option value="all">All Types</option>
                        <option value="regular">Regular</option>
                        <option value="temp">Temp</option>
                      </select>
                    </div>
                  </div>

                  {allEmployees.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-base sm:text-lg">No employees registered yet</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:gap-4">
                      {allEmployees
                        .filter(emp => {
                          const matchesSearch = employeeSearchQuery === '' ||
                            emp.name.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
                            emp.employee_code.toLowerCase().includes(employeeSearchQuery.toLowerCase());
                          const matchesFilter = employeeTypeFilter === 'all' ||
                            (employeeTypeFilter === 'temp' && emp.is_temp) ||
                            (employeeTypeFilter === 'regular' && !emp.is_temp);
                          return matchesSearch && matchesFilter;
                        })
                        .map((employee) => (
                        <div key={employee.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-5 hover:border-blue-300 transition-colors">
                          <div className="flex justify-between items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base sm:text-lg font-bold text-gray-800 truncate">{employee.name}</h4>
                                {employee.is_temp && (
                                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                                    TEMP
                                  </span>
                                )}
                                {employee.security_pin && (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    PIN SET
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600 font-mono mt-1 truncate">
                                ID: {employee.employee_code}
                              </p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => openResetPinModal(employee)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Reset PIN"
                              >
                                <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                              <button
                                onClick={() => deleteEmployee(employee.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Employee"
                              >
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'shifts' && (
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    Manage Shifts
                  </h2>

                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Add New Shift</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <input
                        type="text"
                        value={newShiftName}
                        onChange={(e) => setNewShiftName(e.target.value)}
                        placeholder="Shift name (e.g., Day Shift)"
                        className="text-black px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="time"
                        value={newShiftStart}
                        onChange={(e) => setNewShiftStart(e.target.value)}
                        className=" text-black px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="time"
                        value={newShiftEnd}
                        onChange={(e) => setNewShiftEnd(e.target.value)}
                        className= " text-black px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="color"
                        value={newShiftColor}
                        onChange={(e) => setNewShiftColor(e.target.value)}
                        className=" text-black h-12 px-2 py-1 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none cursor-pointer"
                      />
                      <button
                        onClick={addShift}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors whitespace-nowrap"
                      >
                        Add Shift
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-4">
                      Define shift timings to automatically assign shifts based on when employees start their first task.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
                    Existing Shifts ({shifts.length} total)
                  </h3>

                  {shifts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Clock className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-base sm:text-lg">No shifts configured yet</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:gap-4">
                      {shifts.map((shift) => (
                        <div key={shift.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-5 hover:border-blue-300 transition-colors">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex items-center gap-3 flex-1">
                              <div
                                className="w-12 h-12 rounded-lg"
                                style={{ backgroundColor: shift.color }}
                              ></div>
                              <div className="flex-1">
                                <h4 className="text-base sm:text-lg font-bold text-gray-800">{shift.name}</h4>
                                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                  {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => deleteShift(shift.id)}
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

      <PinModal
        isOpen={showResetPinModal}
        onClose={() => {
          setShowResetPinModal(false);
          setSelectedEmployeeForPinReset(null);
        }}
        onSubmit={handleResetEmployeePin}
        title={`Reset PIN for ${selectedEmployeeForPinReset?.name || 'Employee'}`}
        isSetup={true}
      />
    </div>
  );
}
