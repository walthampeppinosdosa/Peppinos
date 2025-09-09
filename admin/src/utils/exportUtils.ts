import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportColumn {
  key: string;
  label: string;
  width?: number;
  formatter?: (value: any, row: any) => string;
}

export interface ExportOptions {
  filename?: string;
  title?: string;
  subtitle?: string;
  columns: ExportColumn[];
  data: any[];
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'a3' | 'letter';
}

/**
 * Export data to PDF format
 */
export const exportToPDF = (options: ExportOptions): void => {
  const {
    filename = 'export',
    title = 'Data Export',
    subtitle,
    columns,
    data,
    orientation = 'portrait',
    pageSize = 'a4'
  } = options;

  try {
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageSize
    });

    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 20);

    // Add subtitle if provided
    let yPosition = 30;
    if (subtitle) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, 14, yPosition);
      yPosition += 10;
    }

    // Add date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, yPosition);
    yPosition += 15;

    // Prepare table data
    const tableColumns = columns.map(col => col.label);
    const tableRows = data.map(row => 
      columns.map(col => {
        const value = row[col.key];
        return col.formatter ? col.formatter(value, row) : (value || '');
      })
    );

    // Add table using autoTable
    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: yPosition,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: columns.reduce((acc, col, index) => {
        if (col.width) {
          acc[index] = { cellWidth: col.width };
        }
        return acc;
      }, {} as any),
      margin: { top: 20, right: 14, bottom: 20, left: 14 },
    });

    // Save the PDF
    doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF export');
  }
};

/**
 * Export data to Excel format
 */
export const exportToExcel = (options: ExportOptions): void => {
  const {
    filename = 'export',
    title = 'Data Export',
    columns,
    data
  } = options;

  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Prepare data for Excel
    const excelData = data.map(row => {
      const excelRow: any = {};
      columns.forEach(col => {
        const value = row[col.key];
        excelRow[col.label] = col.formatter ? col.formatter(value, row) : (value || '');
      });
      return excelRow;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = columns.map(col => ({
      wch: col.width ? col.width / 5 : 15 // Convert mm to character width approximation
    }));
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, title);

    // Save the file
    XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Error generating Excel:', error);
    throw new Error('Failed to generate Excel export');
  }
};

/**
 * Export data to CSV format
 */
export const exportToCSV = (options: ExportOptions): void => {
  const {
    filename = 'export',
    columns,
    data
  } = options;

  try {
    // Prepare CSV content
    const headers = columns.map(col => col.label);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        columns.map(col => {
          const value = row[col.key];
          const formattedValue = col.formatter ? col.formatter(value, row) : (value || '');
          // Escape quotes and wrap in quotes if contains comma or quote
          const escapedValue = String(formattedValue).replace(/"/g, '""');
          return escapedValue.includes(',') || escapedValue.includes('"') || escapedValue.includes('\n')
            ? `"${escapedValue}"`
            : escapedValue;
        }).join(',')
      )
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw new Error('Failed to generate CSV export');
  }
};

/**
 * Common export function that handles multiple formats
 */
export const exportData = (format: 'pdf' | 'excel' | 'csv', options: ExportOptions): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      switch (format) {
        case 'pdf':
          exportToPDF(options);
          break;
        case 'excel':
          exportToExcel(options);
          break;
        case 'csv':
          exportToCSV(options);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

// Utility functions for common data formatters
export const formatters = {
  currency: (value: number) => value ? `$${value.toFixed(2)}` : '$0.00',
  date: (value: string | Date) => value ? new Date(value).toLocaleDateString() : '',
  boolean: (value: boolean) => value ? 'Yes' : 'No',
  status: (value: boolean) => value ? 'Active' : 'Inactive',
  vegetarian: (value: boolean) => value ? 'Vegetarian' : 'Non-Vegetarian',
  truncate: (length: number) => (value: string) => 
    value && value.length > length ? `${value.substring(0, length)}...` : value || '',
};
