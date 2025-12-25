import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Radio,
    RadioGroup,
    Typography
} from '@mui/material';
import { toast } from 'react-hot-toast';

export interface ExportOptions {
    startDate: string;
    endDate: string;
    category: string;
    type: 'all' | 'income' | 'expense' | 'transfer';
    search: string;
    format: 'pdf' | 'excel';
}

interface ExportDialogProps {
    open: boolean;
    onClose: () => void;
    onExport: (options: ExportOptions) => void;
    categories?: { id: string; name: string }[];
}

export default function ExportDialog({ open, onClose, onExport, categories = [] }: ExportDialogProps) {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDayOfMonth);
    const [endDate, setEndDate] = useState(today);
    const [category, setCategory] = useState('all');
    const [type, setType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
    const [search, setSearch] = useState('');
    const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');

    const handleExport = () => {
        if (startDate > endDate) {
            toast.error("Start date cannot be after end date");
            return;
        }
        onExport({ startDate, endDate, category, type, search, format });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Export Report</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Date Range</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                type="date"
                                label="From"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                size="small"
                            />
                            <TextField
                                type="date"
                                label="To"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                size="small"
                            />
                        </Box>
                    </Box>

                    {categories.length > 0 && (
                        <FormControl fullWidth size="small">
                            <InputLabel>Category Filter</InputLabel>
                            <Select
                                value={category}
                                label="Category Filter"
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <MenuItem value="all">All Categories</MenuItem>
                                {categories.map((cat) => (
                                    <MenuItem key={cat.id} value={cat.name}>
                                        {cat.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    <FormControl fullWidth size="small">
                        <InputLabel>Transaction Type</InputLabel>
                        <Select
                            value={type}
                            label="Transaction Type"
                            onChange={(e) => setType(e.target.value as any)}
                        >
                            <MenuItem value="all">All Types</MenuItem>
                            <MenuItem value="income">Income</MenuItem>
                            <MenuItem value="expense">Expense</MenuItem>
                            <MenuItem value="transfer">Transfer</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        label="Search Query"
                        placeholder="Search title, description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        fullWidth
                        size="small"
                    />

                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Format</Typography>
                        <RadioGroup
                            row
                            value={format}
                            onChange={(e) => setFormat(e.target.value as 'pdf' | 'excel')}
                        >
                            <FormControlLabel value="pdf" control={<Radio />} label="PDF Document" />
                            <FormControlLabel value="excel" control={<Radio />} label="Excel Spreadsheet" />
                        </RadioGroup>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleExport} sx={{ bgcolor: '#06b6d4' }}>
                    Generate
                </Button>
            </DialogActions>
        </Dialog>
    );
}
