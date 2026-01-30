import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, IconButton, Grid, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Table, TableHead, TableBody, TableRow, TableCell,
  FormControl, InputLabel, Select, MenuItem, Divider, Tab, Tabs, TableContainer,
  useTheme, useMediaQuery,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Visibility as ViewIcon, Payment as PaymentIcon,
} from '@mui/icons-material';
import { paymentsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

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

const Payments: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tabValue, setTabValue] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [myCollections, setMyCollections] = useState<any[]>([]);
  const [collectionSummary, setCollectionSummary] = useState({ total_collected: 0, payment_count: 0 });
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoicePayments, setInvoicePayments] = useState<any[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: '',
  });
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchData();
  }, [tabValue]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tabValue === 0) {
        const response = await paymentsAPI.getPending();
        setPendingInvoices(response.data.data);
      } else {
        const response = await paymentsAPI.getMyCollections();
        setMyCollections(response.data.data);
        setCollectionSummary(response.data.summary || { total_collected: 0, payment_count: 0 });
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentDialog = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      amount: invoice.balance?.toString() || (invoice.total_amount - (invoice.total_paid || 0)).toString(),
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: '',
    });
    setPaymentDialogOpen(true);
  };

  const handleOpenHistoryDialog = async (invoice: any) => {
    try {
      const response = await paymentsAPI.getInvoicePayments(invoice.id);
      setSelectedInvoice({ ...invoice, ...response.data.data.invoice });
      setInvoicePayments(response.data.data.payments);
      setHistoryDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load payment history');
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    try {
      await paymentsAPI.record({
        invoice_id: selectedInvoice.id,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
        reference_number: paymentForm.reference_number || null,
        notes: paymentForm.notes || null,
      });
      toast.success('Payment recorded');
      setPaymentDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'partial': return 'warning';
      case 'pending': return 'error';
      default: return 'default';
    }
  };

  // Responsive pending columns
  const pendingColumns: GridColDef[] = [
    { field: 'invoice_number', headerName: 'Invoice #', width: isMobile ? 100 : 140 },
    { field: 'store_name', headerName: 'Store', flex: 1, minWidth: isMobile ? 100 : 180 },
    ...(!isMobile ? [{ field: 'store_city', headerName: 'City', width: 120 }] : []),
    ...(!isTablet ? [{ field: 'total_amount', headerName: 'Total', width: 120, valueFormatter: (params: any) => formatCurrency(params.value) }] : []),
    { 
      field: 'balance', 
      headerName: 'Balance', 
      width: isMobile ? 90 : 120, 
      valueGetter: (params) => params.row.total_amount - (params.row.total_paid || 0),
      valueFormatter: (params) => formatCurrency(params.value),
    },
    {
      field: 'payment_status',
      headerName: 'Status',
      width: isMobile ? 80 : 100,
      renderCell: (params) => (
        <Chip label={params.value} color={getPaymentStatusColor(params.value)} size="small" sx={{ fontSize: { xs: '0.65rem', sm: '0.8125rem' } }} />
      ),
    },
    ...(!isMobile ? [{
      field: 'created_at',
      headerName: 'Date',
      width: 100,
      valueFormatter: (params: any) => new Date(params.value).toLocaleDateString('en-IN'),
    }] : []),
    {
      field: 'actions',
      headerName: 'Actions',
      width: isMobile ? 80 : 150,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={() => handleOpenPaymentDialog(params.row)} title="Record Payment" color="success">
            <PaymentIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleOpenHistoryDialog(params.row)} title="View History">
            <ViewIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  // Responsive collections columns
  const collectionsColumns: GridColDef[] = [
    { field: 'invoice_number', headerName: 'Invoice #', width: isMobile ? 100 : 140 },
    { field: 'store_name', headerName: 'Store', flex: 1, minWidth: isMobile ? 100 : 180 },
    { field: 'amount', headerName: 'Amount', width: isMobile ? 90 : 120, valueFormatter: (params) => formatCurrency(params.value) },
    { field: 'payment_method', headerName: 'Method', width: isMobile ? 70 : 120, valueFormatter: (params) => params.value?.toUpperCase() },
    ...(!isMobile ? [{ field: 'reference_number', headerName: 'Reference', width: 130, valueGetter: (params: any) => params.value || '-' }] : []),
    {
      field: 'payment_date',
      headerName: 'Date',
      width: isMobile ? 80 : 110,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString('en-IN'),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold">Payments</Typography>
      </Box>

      <Card sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={(_, v) => setTabValue(v)}
          variant={isMobile ? "fullWidth" : "standard"}
          sx={{ '& .MuiTab-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
        >
          <Tab label={`Pending (${pendingInvoices.length})`} />
          <Tab label="My Collections" />
        </Tabs>
      </Card>

      <TabPanel value={tabValue} index={0}>
        <Card>
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <DataGrid
              rows={pendingInvoices}
              columns={pendingColumns}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              autoHeight
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-cell': { fontSize: { xs: '0.75rem', sm: '0.875rem' } },
                '& .MuiDataGrid-columnHeaderTitle': { fontSize: { xs: '0.75rem', sm: '0.875rem' } },
              }}
            />
          </Box>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: { xs: 1.5, sm: 2 } }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Total Collected</Typography>
                <Typography variant={isMobile ? "h6" : "h5"} color="success.main">
                  {formatCurrency(collectionSummary.total_collected || 0)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Payment Count</Typography>
                <Typography variant={isMobile ? "h6" : "h5"}>{collectionSummary.payment_count || 0}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        <Card>
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <DataGrid
              rows={myCollections}
              columns={collectionsColumns}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              autoHeight
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-cell': { fontSize: { xs: '0.75rem', sm: '0.875rem' } },
                '& .MuiDataGrid-columnHeaderTitle': { fontSize: { xs: '0.75rem', sm: '0.875rem' } },
              }}
            />
          </Box>
        </Card>
      </TabPanel>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Record Payment</DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          {selectedInvoice && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Invoice: {selectedInvoice.invoice_number}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Store: {selectedInvoice.store_name}
              </Typography>
              <Typography variant="body2">
                Total: {formatCurrency(selectedInvoice.total_amount)}
              </Typography>
              <Typography variant="body2">
                Paid: {formatCurrency(selectedInvoice.total_paid || 0)}
              </Typography>
              <Typography variant={isMobile ? "subtitle1" : "h6"} color="error.main" sx={{ mt: 1 }}>
                Balance: {formatCurrency(selectedInvoice.total_amount - (selectedInvoice.total_paid || 0))}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <TextField
                fullWidth
                label="Payment Amount"
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                sx={{ mb: 2 }}
                inputProps={{ min: 0, step: 0.01 }}
                size={isMobile ? "small" : "medium"}
              />

              <FormControl fullWidth sx={{ mb: 2 }} size={isMobile ? "small" : "medium"}>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentForm.payment_method}
                  label="Payment Method"
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Payment Date"
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                sx={{ mb: 2 }}
                InputLabelProps={{ shrink: true }}
                size={isMobile ? "small" : "medium"}
              />

              <TextField
                fullWidth
                label="Reference Number"
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                sx={{ mb: 2 }}
                placeholder="UPI ID, Cheque No., etc."
                size={isMobile ? "small" : "medium"}
              />

              <TextField
                fullWidth
                label="Notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                multiline
                rows={2}
                size={isMobile ? "small" : "medium"}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={() => setPaymentDialogOpen(false)} fullWidth={isMobile}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleRecordPayment} fullWidth={isMobile}>
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Payment History - {selectedInvoice?.invoice_number}
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1.5, sm: 3 } }}>
          {selectedInvoice && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Total</Typography>
                  <Typography variant={isMobile ? "subtitle1" : "h6"}>{formatCurrency(selectedInvoice.total_amount)}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Paid</Typography>
                  <Typography variant={isMobile ? "subtitle1" : "h6"} color="success.main">
                    {formatCurrency(selectedInvoice.total_paid || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Balance</Typography>
                  <Typography variant={isMobile ? "subtitle1" : "h6"} color="error.main">
                    {formatCurrency(selectedInvoice.total_amount - (selectedInvoice.total_paid || 0))}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box>
                    <Chip
                      label={selectedInvoice.payment_status}
                      color={getPaymentStatusColor(selectedInvoice.payment_status)}
                      size="small"
                    />
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle1" gutterBottom fontWeight="medium">Records</Typography>
              {invoicePayments.length === 0 ? (
                <Typography color="text.secondary">No payments recorded.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Date</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Amount</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Method</TableCell>
                        {!isMobile && <TableCell>Reference</TableCell>}
                        {!isMobile && <TableCell>By</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoicePayments.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{new Date(payment.payment_date).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{payment.payment_method?.toUpperCase()}</TableCell>
                          {!isMobile && <TableCell>{payment.reference_number || '-'}</TableCell>}
                          {!isMobile && <TableCell>{payment.collected_by_name}</TableCell>}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={() => setHistoryDialogOpen(false)} fullWidth={isMobile}>Close</Button>
          <Button variant="contained" onClick={() => {
            setHistoryDialogOpen(false);
            handleOpenPaymentDialog(selectedInvoice);
          }} fullWidth={isMobile}>
            Add Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Payments;
