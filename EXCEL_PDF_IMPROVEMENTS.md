# Excel and PDF Export Improvements - Implementation Guide

## Excel Export Enhancements

### Required Features:
1. **Color Coding**
   - Header row: Blue background with white text
   - Department sections: Alternating light colors (light blue, light green)
   - Total rows: Yellow/gold background
   - Shift indicators: Color-coded cells based on shift colors

2. **Merged Cells**
   - Employee names should be merged across their time entries
   - Department headers should span full width
   - Summary sections should have merged title cells

3. **Proper Formatting**
   - Bold headers
   - Currency/number formatting for hours
   - Date formatting
   - Cell borders
   - Auto-column width

### Implementation in AdminPortal.tsx:

```typescript
const generateExcelReport = () => {
  const wb = XLSX.utils.book_new();

  // Filter employees based on current filters
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = individualSearchQuery === '' ||
      emp.name.toLowerCase().includes(individualSearchQuery.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(individualSearchQuery.toLowerCase());
    const matchesFilter = employeeTypeFilter === 'all' ||
      (employeeTypeFilter === 'temp' && emp.is_temp) ||
      (employeeTypeFilter === 'regular' && !emp.is_temp);
    return matchesSearch && matchesFilter;
  });

  const wsData: any[] = [];

  // Title Row
  wsData.push([`Hour Tracking Report: ${startDate} to ${endDate}`]);
  wsData.push([]);

  // Headers
  wsData.push(['Employee', 'Department', 'Task', 'Date', 'Start', 'End', 'Duration', 'Break Time']);

  filteredEmployees.forEach(employee => {
    const startRow = wsData.length;

    employee.entries.forEach((entry, index) => {
      wsData.push([
        index === 0 ? employee.name : '', // Only show name on first row
        entry.department.name,
        entry.task.name,
        entry.entry_date,
        new Date(entry.start_time).toLocaleTimeString(),
        entry.end_time ? new Date(entry.end_time).toLocaleTimeString() : 'In Progress',
        formatDuration(entry.duration_minutes || 0),
        ''
      ]);
    });

    // Add break time row
    if (employee.totalBreakMinutes > 0) {
      wsData.push(['', '', '', '', '', 'Break Time:', formatDuration(employee.totalBreakMinutes), '']);
    }

    // Add total row
    wsData.push(['', '', '', '', '', 'Total Hours:', formatDuration(employee.totalMinutes), '']);
    wsData.push([]); // Empty row between employees
  });

  // Grand total
  wsData.push(['', '', '', '', '', 'GRAND TOTAL:', formatDuration(grandTotalMinutes), '']);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Apply styling (requires xlsx with style support or xlsx-js-style)
  // Merge cells for employee names
  // Apply colors and formatting

  XLSX.utils.book_append_sheet(wb, ws, 'Hours Report');
  XLSX.writeFile(wb, `hours_report_${startDate}_to_${endDate}.xlsx`);
};
```

### Alternative: Use xlsx-js-style for better formatting:
```bash
npm install xlsx-js-style
```

Then use it to apply colors and merged cells properly.

## PDF Export Enhancements

### Required Features:
1. **Respect Active Filters**
   - Individual tab: Use individualSearchQuery and employeeTypeFilter
   - Summary tab: Use summarySearchQuery and summaryDeptFilter
   - Only export data that matches current view

2. **Color Coding**
   - Use department colors
   - Use shift colors
   - Highlight totals

3. **Better Layout**
   - Page headers with date range
   - Section breaks between employees
   - Summary tables
   - Page numbers

### Implementation in AdminPortal.tsx:

```typescript
const generatePDFReport = () => {
  const doc = new jsPDF();

  // Filter data based on current active tab and filters
  let dataToExport;
  let title;

  if (activeTab === 'individual') {
    dataToExport = employees.filter(emp => {
      const matchesSearch = individualSearchQuery === '' ||
        emp.name.toLowerCase().includes(individualSearchQuery.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(individualSearchQuery.toLowerCase());
      const matchesFilter = employeeTypeFilter === 'all' ||
        (employeeTypeFilter === 'temp' && emp.is_temp) ||
        (employeeTypeFilter === 'regular' && !emp.is_temp);
      return matchesSearch && matchesFilter;
    });
    title = 'Individual Hours Report';
  } else if (activeTab === 'summary') {
    dataToExport = departmentSummaries.filter(dept => {
      if (summaryDeptFilter !== 'all' && dept.departmentId !== summaryDeptFilter) {
        return false;
      }
      if (summarySearchQuery === '') return true;
      return dept.departmentName.toLowerCase().includes(summarySearchQuery.toLowerCase()) ||
        dept.tasks.some(task => task.taskName.toLowerCase().includes(summarySearchQuery.toLowerCase()));
    });
    title = 'Department Summary Report';
  }

  // Add header
  doc.setFontSize(20);
  doc.text(title, 14, 22);
  doc.setFontSize(10);
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

  // Generate tables based on activeTab
  if (activeTab === 'individual') {
    let yPosition = 45;

    dataToExport.forEach((employee, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Employee header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(employee.name, 14, yPosition);
      yPosition += 7;

      // Employee table
      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Department', 'Task', 'Start', 'End', 'Duration']],
        body: employee.entries.map(entry => [
          entry.entry_date,
          entry.department.name,
          entry.task.name,
          new Date(entry.start_time).toLocaleTimeString(),
          entry.end_time ? new Date(entry.end_time).toLocaleTimeString() : 'In Progress',
          formatDuration(entry.duration_minutes || 0)
        ]),
        foot: [[
          '', '', '', '', 'Total:',
          formatDuration(employee.totalMinutes)
        ]],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        footStyles: { fillColor: [241, 196, 15], textColor: [0, 0, 0] }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    });
  } else if (activeTab === 'summary') {
    // Similar implementation for summary view
  }

  doc.save(`${title.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.pdf`);
};
```

## Key Implementation Points:

1. **Always check active filters before exporting**
2. **Use current tab state to determine what to export**
3. **Apply consistent color schemes**
4. **Include metadata (date range, generation time)**
5. **Handle pagination properly in PDF**
6. **Format numbers and dates consistently**

## Testing Checklist:

- [ ] Excel exports with merged cells
- [ ] Excel has color coding
- [ ] Excel respects filters
- [ ] PDF respects individual search filter
- [ ] PDF respects employee type filter
- [ ] PDF respects summary filters
- [ ] Both formats include correct date ranges
- [ ] File names include date ranges
- [ ] Colors are consistent with UI
