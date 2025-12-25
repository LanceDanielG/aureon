import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Transaction } from './transactionService';
import type { Bill } from './billService';
import { currencyService } from './currencyService';
import { format } from 'date-fns';

export interface ExportFilterOptions {
    dateRange?: { start: Date; end: Date };
    category?: string;
    type?: string;
    search?: string;
}

class ExportService {
    // --- TRANSACTIONS ---

    exportTransactionsToPDF(transactions: Transaction[], options?: ExportFilterOptions) {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text('Transaction Report', 14, 22);

        // Metadata (Date Range & Category)
        doc.setFontSize(10);
        let metadataY = 28;

        doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 14, metadataY);
        metadataY += 6;

        if (options?.dateRange) {
            const rangeStr = `${format(options.dateRange.start, 'MMM d, yyyy')} - ${format(options.dateRange.end, 'MMM d, yyyy')}`;
            doc.text(`Period: ${rangeStr}`, 14, metadataY);
            metadataY += 6;
        }

        if (options?.category && options.category !== 'all') {
            doc.text(`Category: ${options.category}`, 14, metadataY);
            metadataY += 6;
        }

        if (options?.type && options.type !== 'all') {
            doc.text(`Type: ${options.type.charAt(0).toUpperCase() + options.type.slice(1)}`, 14, metadataY);
            metadataY += 6;
        }

        if (options?.search) {
            doc.text(`Search: "${options.search}"`, 14, metadataY);
            metadataY += 6;
        }

        const startY = metadataY + 2;

        // Table Data
        const tableData = transactions.map(tx => [
            format(new Date(tx.date), 'PP'),
            tx.title,
            tx.flow === 'income' ? `+${currencyService.formatForPDF(Math.abs(tx.amount), tx.currency || 'USD')}` : `-${currencyService.formatForPDF(Math.abs(tx.amount), tx.currency || 'USD')}`,
            tx.flow.toUpperCase(),
            tx.subtitle || '-'
        ]);

        autoTable(doc, {
            startY: startY,
            head: [['Date', 'Title', 'Amount', 'Type', 'Category/Details']],
            body: tableData,
            styles: { fontSize: 9 }, // No custom font, default Helvetica
            headStyles: { fillColor: [6, 182, 212] }, // Cyan-500
        });

        doc.save(`transactions_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    }

    exportTransactionsToExcel(transactions: Transaction[]) {
        const worksheetData = transactions.map(tx => ({
            Date: format(new Date(tx.date), 'yyyy-MM-dd'),
            Title: tx.title,
            Amount: tx.amount,
            Currency: tx.currency || 'USD',
            Type: tx.flow,
            Category: tx.subtitle || 'General',
            Description: tx.subtitle
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
        XLSX.writeFile(workbook, `transactions_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    }

    // --- BILLS ---

    exportBillsToPDF(bills: Bill[], options?: ExportFilterOptions) {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Scheduled Bills Report', 14, 22);

        doc.setFontSize(10);
        let metadataY = 28;

        doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 14, metadataY);
        metadataY += 6;

        if (options?.category && options.category !== 'all') {
            doc.text(`Category: ${options.category}`, 14, metadataY);
            metadataY += 6;
        }

        const startY = metadataY + 2;

        const tableData = bills.map(bill => [
            format(new Date(bill.dueDate), 'PP'),
            bill.title,
            currencyService.formatForPDF(bill.amount, bill.currency || 'USD'),
            bill.category,
            bill.frequency,
            bill.isPaid ? 'PAID' : 'PENDING'
        ]);

        autoTable(doc, {
            startY: startY,
            head: [['Due Date', 'Title', 'Amount', 'Category', 'Frequency', 'Status']],
            body: tableData,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [6, 182, 212] },
        });

        doc.save(`bills_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    }

    exportBillsToExcel(bills: Bill[]) {
        const worksheetData = bills.map(bill => ({
            DueDate: format(new Date(bill.dueDate), 'yyyy-MM-dd'),
            Title: bill.title,
            Amount: bill.amount,
            Currency: bill.currency || 'USD',
            Category: bill.category,
            Frequency: bill.frequency,
            Status: bill.isPaid ? 'Paid' : 'Pending',
            AutoDeduct: bill.autoDeduct ? 'Yes' : 'No'
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Bills");
        XLSX.writeFile(workbook, `bills_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    }
}

export const exportService = new ExportService();
