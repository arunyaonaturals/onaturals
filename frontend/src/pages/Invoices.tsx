import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, IconButton, Grid, Chip, TextField,
  FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableBody, TableRow, TableCell, TableHead, Divider, Tab, Tabs, Alert,
  useTheme, useMediaQuery, TableContainer,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { 
  Add as AddIcon, 
  PictureAsPdf as PdfIcon, 
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Cancel as CancelIcon,
  CheckCircle as ApproveIcon,
  Receipt as InvoiceIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { invoicesAPI, ordersAPI, storesAPI } from '../services/api';
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

const Invoices: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tabValue, setTabValue] = useState(0);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ payment_status: '', billing_status: '', status: '' });
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [orderViewDialogOpen, setOrderViewDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [isIGST, setIsIGST] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusType, setStatusType] = useState<'billing' | 'payment'>('billing');
  const [newStatus, setNewStatus] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({ amount: '', method: '', date: '' });
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  useEffect(() => { 
    fetchInvoices(); 
    fetchPendingOrders();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await invoicesAPI.getAll(filters);
      setInvoices(response.data.data);
    } catch (error) { toast.error('Failed to load invoices'); } finally { setLoading(false); }
  };

  const fetchPendingOrders = async () => {
    try {
      const response = await ordersAPI.getAll();
      const pending = response.data.data.filter((o: any) => ['submitted', 'approved'].includes(o.status));
      setPendingOrders(pending);
    } catch (error) { 
      console.error('Failed to load pending orders'); 
    }
  };

  const handleViewOrder = async (id: number) => {
    try {
      const response = await ordersAPI.getById(id);
      setSelectedOrder(response.data.data);
      setOrderViewDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load order details');
    }
  };

  const handleApproveOrder = async (id: number) => {
    try {
      const response = await ordersAPI.approve(id);
      toast.success('Order approved successfully');
      
      if (response.data.data?.stock_warnings) {
        response.data.data.stock_warnings.forEach((warning: string) => {
          toast.warning(warning, { autoClose: 10000 });
        });
      }
      
      fetchPendingOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve order');
    }
  };

  const handleOpenInvoiceDialog = async (order: any) => {
    try {
      setInvoiceItems([]);
      setSelectedOrder(null);
      
      const response = await ordersAPI.getById(order.id);
      const orderData = response.data.data;
      setSelectedOrder(orderData);
      
      const marginsResponse = await storesAPI.getMargins(orderData.store_id);
      const margins: any = {};
      marginsResponse.data.data.forEach((m: any) => { margins[m.product_id] = m.margin_percentage; });
      
      const initItems = orderData.items.map((item: any) => {
        const margin = margins[item.product_id] || 0;
        const mrp = item.mrp || 0;
        const unitPrice = mrp * (1 + margin / 100);
        return {
          ...item,
          margin_percentage: margin,
          unit_price: unitPrice,
          total: unitPrice * item.quantity,
          invoice_quantity: item.quantity,
          stock_available: item.stock_quantity || 0,
        };
      });
      setInvoiceItems(initItems);
      setInvoiceDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load order for invoicing');
    }
  };

  const handleInvoiceQuantityChange = (index: number, quantity: number) => {
    const newItems = [...invoiceItems];
    newItems[index].invoice_quantity = quantity;
    newItems[index].total = newItems[index].unit_price * quantity;
    setInvoiceItems(newItems);
  };

  const handleInvoiceMarginChange = (index: number, margin: number) => {
    const newItems = [...invoiceItems];
    const mrp = newItems[index].mrp || 0;
    const unitPrice = mrp * (1 + margin / 100);
    newItems[index].margin_percentage = margin;
    newItems[index].unit_price = unitPrice;
    newItems[index].total = unitPrice * newItems[index].invoice_quantity;
    setInvoiceItems(newItems);
  };

  const handleCreateInvoice = async () => {
    try {
      const data = {
        order_id: selectedOrder.id,
        items: invoiceItems
          .filter(i => i.invoice_quantity > 0)
          .map(i => ({
            product_id: i.product_id,
            quantity: i.invoice_quantity,
            margin_percentage: i.margin_percentage,
          })),
        notes: selectedOrder.notes,
        is_igst: isIGST,
      };

      const response = await invoicesAPI.createFromOrder(data);
      toast.success(`Invoice ${response.data.data.invoice_number} created!`);
      setInvoiceDialogOpen(false);
      fetchInvoices();
      fetchPendingOrders();
      setTabValue(1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    }
  };

  const handleDownloadPDF = async (id: number, invoiceNumber: string) => {
    try {
      const response = await invoicesAPI.downloadPDF(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceNumber.replace(/\//g, '-')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) { toast.error('Failed to download PDF'); }
  };

  const handleViewInvoice = async (id: number) => {
    try {
      const response = await invoicesAPI.getById(id);
      setSelectedInvoice(response.data.data);
      setViewDialogOpen(true);
    } catch (error) { toast.error('Failed to load invoice details'); }
  };

  const handleOpenStatusDialog = (invoice: any, type: 'billing' | 'payment') => {
    setSelectedInvoice(invoice);
    setStatusType(type);
    setNewStatus(type === 'billing' ? invoice.billing_status : invoice.payment_status);
    setPaymentDetails({ amount: invoice.total_amount?.toString() || '', method: 'cash', date: new Date().toISOString().split('T')[0] });
    setStatusDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedInvoice) return;
    
    try {
      if (statusType === 'billing') {
        await invoicesAPI.updateBillingStatus(selectedInvoice.id, newStatus);
        toast.success('Billing status updated');
      } else {
        await invoicesAPI.updatePaymentStatus(selectedInvoice.id, {
          payment_status: newStatus,
          payment_amount: newStatus === 'paid' ? parseFloat(paymentDetails.amount) : null,
          payment_method: newStatus === 'paid' ? paymentDetails.method : null,
          payment_date: newStatus === 'paid' ? paymentDetails.date : null,
        });
        toast.success('Payment status updated');
      }
      setStatusDialogOpen(false);
      fetchInvoices();
    } catch (error) { toast.error('Failed to update status'); }
  };

  const handleCancelInvoice = async (id: number) => {
    if (!window.confirm('Cancel this invoice?')) return;
    try {
      await invoicesAPI.cancel(id);
      toast.success('Invoice cancelled');
      fetchInvoices();
    } catch (error: any) { 
      toast.error(error.response?.data?.message || 'Failed to cancel invoice'); 
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    if (!window.confirm('PERMANENTLY DELETE this invoice?')) return;
    try {
      await invoicesAPI.delete(id);
      toast.success('Invoice deleted');
      fetchInvoices();
    } catch (error: any) { 
      toast.error(error.response?.data?.message || 'Failed to delete invoice'); 
    }
  };

  const handleFilter = () => { setLoading(true); fetchInvoices(); };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      case 'billed': return 'info';
      case 'partial': return 'secondary';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  // Responsive Invoice columns
  const columns: GridColDef[] = [
    { field: 'invoice_number', headerName: 'Invoice #', width: isMobile ? 100 : 140 },
    { field: 'store_name', headerName: 'Store', flex: 1, minWidth: isMobile ? 100 : 180 },
    ...(!isMobile ? [{ field: 'area_name', headerName: 'Area', width: 120 }] : []),
    { field: 'total_amount', headerName: 'Amount', width: isMobile ? 90 : 120, valueFormatter: (params: any) => formatCurrency(params.value) },
    ...(!isTablet ? [{ 
      field: 'status', 
      headerName: 'Status', 
      width: 100, 
      renderCell: (params: any) => (
        params.value === 'cancelled' ? (
          <Chip label="Cancelled" color="default" size="small" />
        ) : (
          <Chip label="Active" color="success" size="small" variant="outlined" />
        )
      ) 
    }] : []),
    { 
      field: 'payment_status', 
      headerName: 'Payment', 
      width: isMobile ? 80 : 110, 
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={getStatusColor(params.value)} 
          size="small" 
          onClick={() => !isMobile && handleOpenStatusDialog(params.row, 'payment')}
          sx={{ cursor: isMobile ? 'default' : 'pointer', fontSize: { xs: '0.65rem', sm: '0.8125rem' } }}
        />
      ) 
    },
    ...(!isMobile ? [{ 
      field: 'billing_status', 
      headerName: 'Billing', 
      width: 110, 
      renderCell: (params: any) => (
        <Chip 
          label={params.value} 
          color={getStatusColor(params.value)} 
          size="small" 
          onClick={() => handleOpenStatusDialog(params.row, 'billing')}
          sx={{ cursor: 'pointer' }}
        />
      ) 
    }] : []),
    ...(!isTablet ? [{ field: 'created_at', headerName: 'Date', width: 100, valueFormatter: (params: any) => new Date(params.value).toLocaleDateString('en-IN') }] : []),
    {
      field: 'actions', headerName: 'Actions', width: isMobile ? 90 : 180, sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={() => handleViewInvoice(params.row.id)} title="View">
            <ViewIcon fontSize="small" color="primary" />
          </IconButton>
          <IconButton size="small" onClick={() => handleDownloadPDF(params.row.id, params.row.invoice_number)} title="PDF">
            <PdfIcon fontSize="small" color="error" />
          </IconButton>
          {!isMobile && params.row.status !== 'cancelled' && (
            <IconButton size="small" onClick={() => handleCancelInvoice(params.row.id)} title="Cancel" color="warning">
              <CancelIcon fontSize="small" />
            </IconButton>
          )}
          {!isMobile && isAdmin && params.row.status === 'cancelled' && (
            <IconButton size="small" onClick={() => handleDeleteInvoice(params.row.id)} title="Delete" color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  // Responsive Order columns
  const orderColumns: GridColDef[] = [
    { field: 'order_number', headerName: 'Order #', width: isMobile ? 100 : 150 },
    { field: 'store_name', headerName: 'Store', flex: 1, minWidth: isMobile ? 100 : 180 },
    ...(!isMobile ? [{ field: 'store_city', headerName: 'City', width: 120 }] : []),
    {
      field: 'status',
      headerName: 'Status',
      width: isMobile ? 90 : 120,
      renderCell: (params) => (
        <Chip 
          label={params.value === 'submitted' ? 'Pending' : 'Approved'} 
          color={params.value === 'submitted' ? 'warning' : 'info'} 
          size="small" 
        />
      ),
    },
    ...(!isTablet ? [{ field: 'created_by_name', headerName: 'Sales Captain', width: 130 }] : []),
    ...(!isMobile ? [{
      field: 'created_at',
      headerName: 'Date',
      width: 100,
      valueFormatter: (params: any) => new Date(params.value).toLocaleDateString('en-IN'),
    }] : []),
    {
      field: 'actions',
      headerName: 'Actions',
      width: isMobile ? 100 : 180,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={() => handleViewOrder(params.row.id)} title="View">
            <ViewIcon fontSize="small" />
          </IconButton>
          {params.row.status === 'submitted' && (
            <IconButton size="small" onClick={() => handleApproveOrder(params.row.id)} title="Approve" color="info">
              <ApproveIcon fontSize="small" />
            </IconButton>
          )}
          {params.row.status === 'approved' && (
            <IconButton size="small" onClick={() => handleOpenInvoiceDialog(params.row)} title="Invoice" color="success">
              <InvoiceIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: 2 }}>
        <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold">Invoices</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/invoices/create')} fullWidth={isMobile}>
          Create Invoice
        </Button>
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={(_, v) => setTabValue(v)}
          variant={isMobile ? "fullWidth" : "standard"}
          sx={{ '& .MuiTab-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
        >
          <Tab label={`Orders (${pendingOrders.length})`} />
          <Tab label={`Invoices (${invoices.length})`} />
        </Tabs>
      </Card>

      {/* Tab 0: Pending Orders */}
      <TabPanel value={tabValue} index={0}>
        {pendingOrders.length === 0 ? (
          <Alert severity="info">No pending orders.</Alert>
        ) : (
          <Card>
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <DataGrid
                rows={pendingOrders}
                columns={orderColumns}
                pageSizeOptions={[10, 25]}
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
        )}
      </TabPanel>

      {/* Tab 1: Invoices */}
      <TabPanel value={tabValue} index={1}>
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5, px: { xs: 1.5, sm: 2 } }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={filters.status} label="Status" onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment</InputLabel>
                  <Select value={filters.payment_status} label="Payment" onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}>
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="partial">Partial</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {!isMobile && (
                <Grid item xs={6} sm={3} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Billing</InputLabel>
                    <Select value={filters.billing_status} label="Billing" onChange={(e) => setFilters({ ...filters, billing_status: e.target.value })}>
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="billed">Billed</MenuItem>
                      <MenuItem value="overdue">Overdue</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12} sm="auto">
                <Button variant="outlined" onClick={handleFilter} fullWidth={isMobile}>Filter</Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

      <Card sx={{ height: 650, width: '100%' }}>
        <DataGrid
          rows={invoices}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell': { fontSize: { xs: '0.75rem', sm: '0.875rem' } },
            '& .MuiDataGrid-columnHeaderTitle': { fontSize: { xs: '0.75rem', sm: '0.875rem' } },
          }}
        />
      </Card>
      </TabPanel>

      {/* View Order Dialog */}
      <Dialog open={orderViewDialogOpen} onClose={() => setOrderViewDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Order - {selectedOrder?.order_number}
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1.5, sm: 3 } }}>
          {selectedOrder && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Store</Typography>
                  <Typography variant="body2">{selectedOrder.store_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box><Chip label={selectedOrder.status} color={selectedOrder.status === 'approved' ? 'info' : 'warning'} size="small" /></Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Sales Captain</Typography>
                  <Typography variant="body2">{selectedOrder.created_by_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography variant="body2">{new Date(selectedOrder.created_at).toLocaleDateString('en-IN')}</Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">Items</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Product</TableCell>
                      {!isMobile && <TableCell>HSN</TableCell>}
                      <TableCell align="center" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Qty</TableCell>
                      {!isMobile && <TableCell align="right">MRP</TableCell>}
                      <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Stock</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{item.product_name}</TableCell>
                        {!isMobile && <TableCell>{item.hsn_code || '-'}</TableCell>}
                        <TableCell align="center" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{item.quantity}</TableCell>
                        {!isMobile && <TableCell align="right">{formatCurrency(item.mrp)}</TableCell>}
                        <TableCell align="right">
                          <Chip 
                            label={item.stock_quantity || 0} 
                            size="small" 
                            color={(item.stock_quantity || 0) >= item.quantity ? 'success' : 'error'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={() => setOrderViewDialogOpen(false)} fullWidth={isMobile}>Close</Button>
          {selectedOrder?.status === 'submitted' && (
            <Button variant="contained" color="info" onClick={() => { setOrderViewDialogOpen(false); handleApproveOrder(selectedOrder.id); }} fullWidth={isMobile}>
              Approve
            </Button>
          )}
          {selectedOrder?.status === 'approved' && (
            <Button variant="contained" color="success" onClick={() => { setOrderViewDialogOpen(false); handleOpenInvoiceDialog(selectedOrder); }} fullWidth={isMobile}>
              Create Invoice
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Create Invoice from Order Dialog */}
      <Dialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)} maxWidth="lg" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Create Invoice - {selectedOrder?.order_number}
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1.5, sm: 3 } }}>
          {selectedOrder && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Store: {selectedOrder.store_name}
              </Typography>

              <FormControl sx={{ mt: 2, mb: 2, minWidth: { xs: '100%', sm: 200 } }} size={isMobile ? "small" : "medium"}>
                <InputLabel>GST Type</InputLabel>
                <Select value={isIGST ? 'igst' : 'cgst_sgst'} label="GST Type" onChange={(e) => setIsIGST(e.target.value === 'igst')}>
                  <MenuItem value="cgst_sgst">CGST + SGST</MenuItem>
                  <MenuItem value="igst">IGST</MenuItem>
                </Select>
              </FormControl>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' } }}>Product</TableCell>
                      <TableCell align="center" sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' } }}>Stock</TableCell>
                      <TableCell align="center" sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' } }}>Qty</TableCell>
                      {!isMobile && <TableCell align="right">Margin%</TableCell>}
                      <TableCell align="right" sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' } }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoiceItems.map((item: any, index: number) => (
                      <TableRow key={index} sx={{ 
                        opacity: item.invoice_quantity === 0 ? 0.5 : 1,
                        bgcolor: (item.stock_available || 0) < item.invoice_quantity ? 'error.50' : 'inherit'
                      }}>
                        <TableCell sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' } }}>{item.product_name}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={item.stock_available || 0} 
                            size="small" 
                            color={(item.stock_available || 0) >= item.quantity ? 'success' : 'error'}
                            sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={item.invoice_quantity}
                            onChange={(e) => handleInvoiceQuantityChange(index, parseInt(e.target.value) || 0)}
                            sx={{ width: { xs: 50, sm: 80 } }}
                            inputProps={{ min: 0, max: item.quantity, style: { fontSize: isMobile ? '0.7rem' : '0.875rem', textAlign: 'center' } }}
                          />
                        </TableCell>
                        {!isMobile && (
                          <TableCell align="right">
                            <TextField
                              type="number"
                              size="small"
                              value={item.margin_percentage}
                              onChange={(e) => handleInvoiceMarginChange(index, parseFloat(e.target.value) || 0)}
                              sx={{ width: 70 }}
                              inputProps={{ min: 0 }}
                            />
                          </TableCell>
                        )}
                        <TableCell align="right" sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' } }}>{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Typography variant={isMobile ? "subtitle1" : "h6"}>
                  Subtotal: {formatCurrency(invoiceItems.reduce((sum, item) => sum + (item.invoice_quantity > 0 ? item.total : 0), 0))}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={() => setInvoiceDialogOpen(false)} fullWidth={isMobile}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleCreateInvoice} fullWidth={isMobile}>
            Create Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Invoice - {selectedInvoice?.invoice_number}
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1.5, sm: 3 } }}>
          {selectedInvoice && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Store</Typography>
                  <Typography variant="body2">{selectedInvoice.store_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography variant="body2">{new Date(selectedInvoice.created_at).toLocaleDateString('en-IN')}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Billing</Typography>
                  <Box><Chip label={selectedInvoice.billing_status} color={getStatusColor(selectedInvoice.billing_status)} size="small" /></Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Payment</Typography>
                  <Box><Chip label={selectedInvoice.payment_status} color={getStatusColor(selectedInvoice.payment_status)} size="small" /></Box>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">Items</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Product</TableCell>
                      <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Qty</TableCell>
                      <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Rate</TableCell>
                      <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedInvoice.items?.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{item.product_name}</TableCell>
                        <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{item.quantity}</TableCell>
                        <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Typography variant="body2">Subtotal: {formatCurrency(selectedInvoice.subtotal)}</Typography>
                {selectedInvoice.cgst > 0 && <Typography variant="body2">CGST: {formatCurrency(selectedInvoice.cgst)}</Typography>}
                {selectedInvoice.sgst > 0 && <Typography variant="body2">SGST: {formatCurrency(selectedInvoice.sgst)}</Typography>}
                {selectedInvoice.igst > 0 && <Typography variant="body2">IGST: {formatCurrency(selectedInvoice.igst)}</Typography>}
                <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight="bold">Total: {formatCurrency(selectedInvoice.total_amount)}</Typography>
              </Box>

              {/* Mobile action buttons */}
              {isMobile && (
                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {selectedInvoice.status !== 'cancelled' && (
                    <>
                      <Button variant="outlined" onClick={() => handleOpenStatusDialog(selectedInvoice, 'payment')} fullWidth>
                        Update Payment Status
                      </Button>
                      <Button variant="outlined" onClick={() => handleOpenStatusDialog(selectedInvoice, 'billing')} fullWidth>
                        Update Billing Status
                      </Button>
                      <Button variant="outlined" color="warning" onClick={() => { handleCancelInvoice(selectedInvoice.id); setViewDialogOpen(false); }} fullWidth>
                        Cancel Invoice
                      </Button>
                    </>
                  )}
                  {isAdmin && selectedInvoice.status === 'cancelled' && (
                    <Button variant="outlined" color="error" onClick={() => { handleDeleteInvoice(selectedInvoice.id); setViewDialogOpen(false); }} fullWidth>
                      Delete Invoice
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={() => setViewDialogOpen(false)} fullWidth={isMobile}>Close</Button>
          <Button variant="contained" onClick={() => selectedInvoice && handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoice_number)} fullWidth={isMobile}>
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Update {statusType === 'billing' ? 'Billing' : 'Payment'} Status
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Invoice: {selectedInvoice?.invoice_number}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Amount: {formatCurrency(selectedInvoice?.total_amount)}
            </Typography>
            
            <FormControl fullWidth sx={{ mt: 2 }} size={isMobile ? "small" : "medium"}>
              <InputLabel>Status</InputLabel>
              <Select value={newStatus} label="Status" onChange={(e) => setNewStatus(e.target.value)}>
                {statusType === 'billing' ? (
                  <>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="billed">Billed</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                  </>
                ) : (
                  <>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="partial">Partial</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                  </>
                )}
              </Select>
            </FormControl>

            {statusType === 'payment' && newStatus === 'paid' && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Payment Amount"
                  type="number"
                  value={paymentDetails.amount}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, amount: e.target.value })}
                  sx={{ mb: 2 }}
                  size={isMobile ? "small" : "medium"}
                />
                <FormControl fullWidth sx={{ mb: 2 }} size={isMobile ? "small" : "medium"}>
                  <InputLabel>Payment Method</InputLabel>
                  <Select 
                    value={paymentDetails.method} 
                    label="Payment Method" 
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, method: e.target.value })}
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
                  value={paymentDetails.date}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  size={isMobile ? "small" : "medium"}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={() => setStatusDialogOpen(false)} fullWidth={isMobile}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateStatus} fullWidth={isMobile}>Update</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Invoices;
