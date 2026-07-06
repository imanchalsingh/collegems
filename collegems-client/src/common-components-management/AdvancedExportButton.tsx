import React, { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Download, FileText, FileSpreadsheet, FileJson, X, CheckSquare, Square } from "lucide-react";

interface AdvancedExportButtonProps {
  /** The raw data array */
  data: any[];
  /** Title for the exported files */
  filename: string;
  /** Title drawn on the PDF document */
  pdfTitle?: string;
  /** Metadata text drawn on the PDF document */
  pdfMetadata?: string;
  /** Array of column headers */
  headers: string[];
  /** Function to map a single raw data row into an array of values matching the headers */
  dataMapper: (row: any) => any[];
}

export default function AdvancedExportButton({
  data,
  filename,
  pdfTitle = "Exported Report",
  pdfMetadata = "",
  headers,
  dataMapper
}: AdvancedExportButtonProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>(headers);

  // Reset selected fields if headers change
  useEffect(() => {
    setSelectedFields(headers);
  }, [headers]);

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const selectAll = () => setSelectedFields(headers);
  const deselectAll = () => setSelectedFields([]);

  // Compute active indices for mapping
  const getActiveData = () => {
    const activeIndices = headers.map((h, i) => selectedFields.includes(h) ? i : -1).filter(i => i !== -1);
    const mappedData = data.map(row => {
      const fullRow = dataMapper(row);
      return activeIndices.map(i => fullRow[i]);
    });
    return { activeHeaders: selectedFields, mappedData };
  };

  const exportToPDF = () => {
    if (!data || data.length === 0) {
      alert("No data available to export.");
      return;
    }
    if (selectedFields.length === 0) {
      alert("Please select at least one field to export.");
      return;
    }

    const pdf = new jsPDF("l", "mm", "a4");
    
    // Add Header
    pdf.setFontSize(18);
    pdf.setTextColor(40, 40, 40);
    pdf.text(pdfTitle, 14, 22);
    
    // Add Metadata
    if (pdfMetadata) {
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(pdfMetadata, 14, 30);
    }
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 14, pdfMetadata ? 36 : 30);

    const { activeHeaders, mappedData } = getActiveData();

    autoTable(pdf, {
      startY: pdfMetadata ? 45 : 39,
      head: [activeHeaders],
      body: mappedData,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    pdf.save(`${filename}.pdf`);
    setExportOpen(false);
  };

  const exportToExcel = () => {
    if (!data || data.length === 0) {
      alert("No data available to export.");
      return;
    }
    if (selectedFields.length === 0) {
      alert("Please select at least one field to export.");
      return;
    }

    const { activeHeaders, mappedData } = getActiveData();

    const formattedData = mappedData.map(row => {
      const obj: any = {};
      activeHeaders.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

    XLSX.writeFile(workbook, `${filename}.xlsx`);
    setExportOpen(false);
  };

  const exportToCSV = () => {
    if (!data || data.length === 0) {
      alert("No data available to export.");
      return;
    }
    if (selectedFields.length === 0) {
      alert("Please select at least one field to export.");
      return;
    }

    const { activeHeaders, mappedData } = getActiveData();

    const csvRows = [];
    csvRows.push(activeHeaders.join(","));

    mappedData.forEach(row => {
      const csvRow = row.map((value: any) => {
        const strVal = String(value || "");
        // Escape quotes and wrap in quotes if contains comma
        const escaped = strVal.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(csvRow.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setExportOpen(true)}
        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded shadow hover:bg-emerald-700 transition"
      >
        <Download className="w-4 h-4" />
        Advanced Export
      </button>
      
      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                Custom Export Builder
              </h3>
              <button
                onClick={() => setExportOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">Select Fields to Export</h4>
                <div className="flex gap-2 text-xs">
                  <button onClick={selectAll} className="text-emerald-600 hover:underline">All</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={deselectAll} className="text-gray-500 hover:underline">None</button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-4 border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                {headers.map((header) => {
                  const isSelected = selectedFields.includes(header);
                  return (
                    <label key={header} className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 bg-white group-hover:border-emerald-400'}`}>
                        {isSelected && <CheckSquare className="w-3 h-3 text-white absolute opacity-0" />}
                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={isSelected}
                        onChange={() => toggleField(header)} 
                      />
                      <span className={`text-sm select-none ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                        {header}
                      </span>
                    </label>
                  );
                })}
              </div>

              {selectedFields.length === 0 && (
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 mb-4">
                  Please select at least one field to export.
                </div>
              )}

              <h4 className="text-sm font-medium text-gray-700 mb-3">Export Format</h4>
              <div className="flex flex-col gap-2">
                <button
                  disabled={selectedFields.length === 0}
                  onClick={exportToExcel}
                  className="flex items-center gap-3 w-full p-3 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="bg-green-100 p-2 rounded text-green-600 group-hover:bg-green-200 transition">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Excel Spreadsheet</div>
                    <div className="text-xs text-gray-500">.xlsx format, best for analysis</div>
                  </div>
                </button>

                <button
                  disabled={selectedFields.length === 0}
                  onClick={exportToPDF}
                  className="flex items-center gap-3 w-full p-3 rounded-lg border border-gray-200 hover:border-red-500 hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="bg-red-100 p-2 rounded text-red-600 group-hover:bg-red-200 transition">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">PDF Document</div>
                    <div className="text-xs text-gray-500">.pdf format, best for printing</div>
                  </div>
                </button>

                <button
                  disabled={selectedFields.length === 0}
                  onClick={exportToCSV}
                  className="flex items-center gap-3 w-full p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="bg-blue-100 p-2 rounded text-blue-600 group-hover:bg-blue-200 transition">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">CSV File</div>
                    <div className="text-xs text-gray-500">.csv format, raw text data</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
