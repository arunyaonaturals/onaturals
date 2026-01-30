import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Chip, Grid, FormControl, InputLabel,
  Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Table, TableHead, TableBody, TableRow, TableCell, Divider, Alert, Tab, Tabs,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { CheckCircle as PaidIcon, Visibility as ViewIcon, Warning as OverdueIcon } from '@mui/icons-material';
import { purchaseAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const PurchaseReceipts: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [overduePayments, setOverduePayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ payment_status: '', arrival_status: '' });
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({ payment_date: '', payment_method: 'bank_transfer' });
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchReceipts();
    fetchPendingPayments();
    fetchOverduePayments();
  }, []);

  const fetchReceipts = async () => {
    try {
      const response = await purchaseAPI.getReceipts(filters);
      setReceipts(response.data.data);
    } catch (error) {
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingPayments = async () => {
    try {
      const response = await purchaseAPI.getPendingPayments();
      setPendingPayments(response.data.data);
    } catch (error) {
      console.error('Failed to load pending payments');
    }
  };

  const fetchOverduePayments = async () => {
    try {
      const response = await purchaseAPI.getOverduePayments();
      setOverduePayments(response.data.data);
    } catch (error) {
      console.error('Failed to load overdue payments');
    }
  };

  const handleOpenPayDialog = (receipt: any) => {
    setSelectedReceipt(receipt);
    setPaymentData({
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
    });
    setPayDialogOpen(true);
  };

  const handleMarkPaid = async () => {
    if (!selectedReceipt) return;
    try {
      await purchaseAPI.markPaid(selectedReceipt.id, paymentData);
      toast.success('Receipt marked as paid');
      setPayDialogOpen(false);
      fetchReceipts();
      fetchPendingPayments();
      fetchOverduePayments();
    } catch (error) {
      toast.error('Failed to update payment status');
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

  const getPaymentStatusColor = (status: string) => {
    return status === 'paid' ? 'success' : 'warning';
  };

  const getArrivalStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'success';
      case 'partial': return 'info';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'paid') return false;
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const columns: GridColDef[] = [
    { field: 'receipt_number', headerName: 'Bill #', width: 140 },
    { field: 'vendor_name', headerName: 'Vendor', flex: 1, minWidth: 180 },
    {
      field: 'receipt_date',
      headerName: 'Bill Date',
      width: 110,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString('en-IN'),
    },
    {
      field: 'due_date',
      headerName: 'Due Date',
      width: 110,
      renderCell: (params) => {
        const overdue = isOverdue(params.value, params.row.payment_status);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-'}
            {overdue && <OverdueIcon fontSize="small" color="error" />}
          </Box>
        );
      },
    },
    {
      field: 'total_amount',
      headerName: 'Amount',
      width: 120,
      valueFormatter: (params) => formatCurrency(params.value),
    },
    {
      field: 'arrival_status',
      headerName: 'Materials',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value || 'received'}
          color={getArrivalStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'payment_status',
      headerName: 'Payment',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getPaymentStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <Box>
          {params.row.payment_status === 'pending' && isAdmin && (
            <Button
              size="small"
              startIcon={<PaidIcon />}
              onClick={() => handleOpenPayDialog(params.row)}
              color="success"
            >
              Pay
            </Button>
          )}
        </Box>
      ),
    },
  ];

  const pendingColumns: GridColDef[] = [
    { field: 'receipt_number', headerName: 'Bill #', width: 140 },
    { field: 'vendor_name', headerName: 'Vendor', flex: 1, minWidth: 150 },
    { field: 'total_amount', headerName: 'Amount', width: 120, valueFormatter: (params) => formatCurrency(params.value) },
    {
      field: 'due_date',
      headerName: 'Due Date',
      width: 110,
      renderCell: (params) => {
        const overdue = isOverdue(params.value, 'pending');
        return (
          <Chip
            label={params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-'}
            color={overdue ? 'error' : 'default'}
            size="small"
          />
        );
      },
    },
    {
      field: 'days_until_due',
      headerName: 'Days',
      width: 80,
      renderCell: (params) => {
        if (!params.row.due_date) return '-';
        const days = Math.ceil((new Date(params.row.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return (
          <Chip
            label={days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
            color={days < 0 ? 'error' : days <= 7 ? 'warning' : 'default'}
            size="small"
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 130,
      sortable: false,
      renderCell: (params) => isAdmin && (
        <Button size="small" startIcon={<PaidIcon />} onClick={() => handleOpenPayDialog(params.row)} color="success">
          Pay
        </Button>
      ),
    },
  ];

  // Calculate totals
  const totalPending = pendingPayments.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const totalOverdue = overduePayments.reduce((sum, r) => sum + (r.total_amount || 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Purchase Bills</Typography>
        <Button variant="outlined" onClick={() => navigate('/raw-materials')}>
          Manage Raw Materials
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: overduePayments.length > 0 ? 'error.light' : 'grey.100' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold">{overduePayments.length}</Typography>
              <Typography>Overdue Bills</Typography>
              <Typography variant="h6" color="error.dark">{formatCurrency(totalOverdue)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'warning.light' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold">{pendingPayments.length}</Typography>
              <Typography>Pending Payments</Typography>
              <Typography variant="h6">{formatCurrency(totalPending)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'success.light' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold">{receipts.filter(r => r.payment_status === 'paid').length}</Typography>
              <Typography>Paid Bills</Typography>
              <Typography variant="h6">{formatCurrency(receipts.filter(r => r.payment_status === 'paid').reduce((sum, r) => sum + (r.total_amount || 0), 0))}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label={`Pending Payments (${pendingPayments.length})`} />
          <Tab label={`All Bills (${receipts.length})`} />
        </Tabs>
      </Card>

      {/* Tab 0: Pending Payments */}
      <TabPanel value={tabValue} index={0}>
        {overduePayments.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {overduePayments.length} bill(s) are overdue! Total: {formatCurrency(totalOverdue)}
          </Alert>
        )}
        {pendingPayments.length === 0 ? (
          <Alert severity="success">All purchase bills have been paid!</Alert>
        ) : (
          <Card>
            <DataGrid
              rows={pendingPayments}
              columns={pendingColumns}
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              autoHeight
              disableRowSelectionOnClick
            />
          </Card>
        )}
      </TabPanel>

      {/* Tab 1: All Bills */}
      <TabPanel value={tabValue} index={1}>
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Status</InputLabel>
                  <Select
                    value={filters.payment_status}
                    label="Payment Status"
                    onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item>
                <Button variant="outlined" onClick={fetchReceipts}>Filter</Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card>
          <DataGrid
            rows={receipts}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            autoHeight
            disableRowSelectionOnClick
          />
        </Card>
      </TabPanel>

      {/* Payment Dialog */}
      <Dialog open={payDialogOpen} onClose={() => setPayDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          {selectedReceipt && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Bill: {selectedReceipt.receipt_number}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Vendor: {selectedReceipt.vendor_name}
              </Typography>
              <Typography variant="h6" gutterBottom>
                Amount: {formatCurrency(selectedReceipt.total_amount)}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <TextField
                fullWidth
                label="Payment Date"
                type="date"
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />

              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentData.payment_method}
                  label="Payment Method"
                  onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                >
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleMarkPaid}>
            Mark as Paid
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseReceipts;
