import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import { exportData, ExportOptions } from '@/utils/exportUtils';
import { useAlert } from '@/hooks/useAlert';

interface ExportDropdownProps {
  data: any[];
  columns: ExportOptions['columns'];
  filename?: string;
  title?: string;
  subtitle?: string;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  data,
  columns,
  filename = 'export',
  title = 'Data Export',
  subtitle,
  disabled = false,
  size = 'sm',
  variant = 'outline'
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { showAlert } = useAlert();

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (data.length === 0) {
      showAlert('No data available to export', 'warning', 'Export Warning');
      return;
    }

    setIsExporting(true);
    
    try {
      const exportOptions: ExportOptions = {
        filename,
        title,
        subtitle,
        columns,
        data,
        orientation: 'landscape', // Better for tables with many columns
        pageSize: 'a4'
      };

      await exportData(format, exportOptions);
      
      const formatName = format === 'excel' ? 'Excel' : format.toUpperCase();
      showAlert(`Data exported to ${formatName} successfully!`, 'success', 'Export Complete');
    } catch (error) {
      console.error('Export error:', error);
      showAlert('Failed to export data. Please try again.', 'error', 'Export Failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          disabled={disabled || isExporting || data.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
        >
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('excel')}
          disabled={isExporting}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('csv')}
          disabled={isExporting}
        >
          <File className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportDropdown;
