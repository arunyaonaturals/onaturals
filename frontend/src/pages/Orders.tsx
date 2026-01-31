import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, IconButton, Grid, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Table, TableHead, TableBody, TableRow, TableCell,
  Autocomplete, FormControl, InputLabel, Select, MenuItem, Divider, TableContainer, Paper,
  useTheme, useMediaQuery,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Add as AddIcon, Visibility as ViewIcon, Edit as EditIcon, Send as SendIcon,
  Delete as DeleteIcon, Receipt as InvoiceIcon, CheckCircle as ApproveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { ordersAPI, storesAPI, productsAPI, invoicesAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

// New interface for order form items (all products pre-populated)
interface OrderFormItem {
  product_id: number;
  product_name: string;
  weight: string;
  mrp: number;
  stock_qty: number;  // Current stock at store (entered by sales captain)
  order_qty: number;  // Quantity to order
}

const Orders: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [orderFormItems, setOrderFormItems] = useState<OrderFormItem[]>([]);
  const [notes, setNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [isIGST, setIsIGST] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    fetchOrders();
    fetchStores();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = isAdmin ? await ordersAPI.getAll() : await ordersAPI.getMyOrders();
      setOrders(response.data.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    // #region agent log
    console.log('[DEBUG] fetchStores: CALLED at', new Date().toISOString());
    // #endregion
    try {
      // #region agent log
      console.log('[DEBUG] fetchStores: About to call storesAPI.getAll with pagination...');
      // #endregion
      // Use existing working endpoint with small limit (same as Stores page)
      const response = await storesAPI.getAll({ is_active: 'true', page: 1, limit: 50 });
      // #region agent log
      console.log('[DEBUG] fetchStores: API response received', { 
        success: response.data?.success, 
        dataLength: response.data?.data?.length, 
        firstStore: response.data?.data?.[0]
      });
      // #endregion
      setStores(response.data.data || []);
      // #region agent log
      console.log('[DEBUG] fetchStores: setStores completed with', response.data?.data?.length, 'stores');
      // #endregion
    } catch (error: any) {
      // #region agent log
      console.error('[DEBUG] fetchStores: CATCH ERROR', { 
        message: error?.message, 
        name: error?.name,
        response: error?.response?.data, 
        status: error?.response?.status,
        fullError: error 
      });
      // #endregion
      toast.error('Failed to load stores');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ is_active: 'true' });
      setProducts(response.data.data);
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

  // Initialize order form with ALL products
  const initOrderForm = (existingItems?: any[]) => {
    const formItems: OrderFormItem[] = products.map((p) => {
      const weightStr = p.weight ? `${p.weight} ${(p.weight_unit || 'g').toUpperCase()}` : '';
      const productName = `${p.name}${weightStr ? ' ' + weightStr : ''}`;

      // Check if this product exists in existing items (for edit mode)
      const existingItem = existingItems?.find(item => item.product_id === p.id);

      return {
        product_id: p.id,
        product_name: productName,
        weight: weightStr,
        mrp: p.mrp || 0,
        stock_qty: existingItem?.stock_qty || 0,
        order_qty: existingItem?.quantity || 0,
      };
    });
    setOrderFormItems(formItems);
  };

  const handleOpenDialog = () => {
    // #region agent log
    console.log('[DEBUG] handleOpenDialog: stores array length =', stores.length, 'first store =', stores[0]);
    // #endregion
    setSelectedStore(null);
    setNotes('');
    setEditMode(false);
    setEditingOrderId(null);
    initOrderForm();
    setDialogOpen(true);
  };

  const handleEditOrder = async (id: number) => {
    try {
      const response = await ordersAPI.getById(id);
      const orderData = response.data.data;

      // Set store
      const store = stores.find(s => s.id === orderData.store_id);
      setSelectedStore(store || null);

      // Initialize form with existing items
      initOrderForm(orderData.items);
      setNotes(orderData.notes || '');
      setEditMode(true);
      setEditingOrderId(id);
      setDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load order for editing');
    }
  };

  const handleViewOrder = async (id: number) => {
    try {
      const response = await ordersAPI.getById(id);
      setSelectedOrder(response.data.data);
      setViewDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load order details');
    }
  };

  const handleStockQtyChange = (index: number, value: number) => {
    const newItems = [...orderFormItems];
    newItems[index].stock_qty = Math.max(0, value);
    setOrderFormItems(newItems);
  };

  const handleOrderQtyChange = (index: number, value: number) => {
    const newItems = [...orderFormItems];
    newItems[index].order_qty = Math.max(0, value);
    setOrderFormItems(newItems);
  };

  const handleCreateOrder = async () => {
    if (!selectedStore) {
      toast.error('Please select a store');
      return;
    }

    // Filter items where order_qty > 0
    const itemsToOrder = orderFormItems.filter(i => i.order_qty > 0);

    if (itemsToOrder.length === 0) {
      toast.error('Please enter order quantity for at least one product');
      return;
    }

    try {
      const data = {
        store_id: selectedStore.id,
        items: itemsToOrder.map(i => ({
          product_id: i.product_id,
          quantity: i.order_qty,
          stock_qty: i.stock_qty,
        })),
        notes,
      };

      if (editMode && editingOrderId) {
        await ordersAPI.update(editingOrderId, data);
        toast.success('Order updated successfully');
      } else {
        await ordersAPI.create(data);
        toast.success('Order created successfully');
      }

      setDialogOpen(false);
      setEditMode(false);
      setEditingOrderId(null);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save order');
    }
  };

  const handleSubmitOrder = async (id: number) => {
    try {
      await ordersAPI.submit(id);
      toast.success('Order submitted successfully');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit order');
    }
  };

  const handleCancelOrder = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await ordersAPI.cancel(id);
      toast.success('Order cancelled');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this order? This cannot be undone!')) return;
    try {
      await ordersAPI.delete(id);
      toast.success('Order deleted successfully');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete order');
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

      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve order');
    }
  };

  // Invoice creation from order
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
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'submitted': return 'warning';
      case 'approved': return 'info';
      case 'invoiced': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

  // Responsive columns
  const columns: GridColDef[] = [
    { field: 'order_number', headerName: 'Order #', width: isMobile ? 100 : 150, flex: isMobile ? 0 : undefined },
    { field: 'store_name', headerName: 'Store', flex: 1, minWidth: isMobile ? 120 : 180 },
    ...(!isMobile ? [{ field: 'store_city', headerName: 'City', width: 120 }] : []),
    {
      field: 'status',
      headerName: 'Status',
      width: isMobile ? 90 : 120,
      renderCell: (params) => (
        <Chip label={params.value} color={getStatusColor(params.value)} size="small" />
      ),
    },
    ...(!isTablet ? [{ field: 'created_by_name', headerName: 'Created By', width: 130 }] : []),
    {
      field: 'created_at',
      headerName: 'Date',
      width: isMobile ? 80 : 100,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString('en-IN'),
    },
    ...(!isMobile ? [{ field: 'invoice_number', headerName: 'Invoice', width: 130, valueGetter: (params: any) => params.value || '-' }] : []),
    {
      field: 'actions',
      headerName: 'Actions',
      width: isMobile ? 100 : 280,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={() => handleViewOrder(params.row.id)} title="View">
            <ViewIcon fontSize="small" />
          </IconButton>
          {params.row.status === 'draft' && (
            <>
              {!isMobile && (
                <IconButton size="small" onClick={() => handleEditOrder(params.row.id)} title="Edit Order" color="primary">
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton size="small" onClick={() => handleSubmitOrder(params.row.id)} title="Submit Order" color="success">
                <SendIcon fontSize="small" />
              </IconButton>
              {!isMobile && (
                <IconButton size="small" onClick={() => handleDeleteOrder(params.row.id)} title="Delete Order" color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </>
          )}
          {params.row.status === 'submitted' && (
            <>
              {!isMobile && (
                <IconButton size="small" onClick={() => handleEditOrder(params.row.id)} title="Edit Order" color="primary">
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
              {isAdmin && (
                <IconButton size="small" onClick={() => handleApproveOrder(params.row.id)} title="Approve Order" color="info">
                  <ApproveIcon fontSize="small" />
                </IconButton>
              )}
              {!isMobile && (
                <>
                  <IconButton size="small" onClick={() => handleCancelOrder(params.row.id)} title="Cancel Order" color="warning">
                    <CancelIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDeleteOrder(params.row.id)} title="Delete Order" color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </>
          )}
          {params.row.status === 'approved' && (
            <>
              {isAdmin && (
                <IconButton size="small" onClick={() => handleOpenInvoiceDialog(params.row)} title="Create Invoice" color="success">
                  <InvoiceIcon fontSize="small" />
                </IconButton>
              )}
              {!isMobile && (
                <IconButton size="small" onClick={() => handleCancelOrder(params.row.id)} title="Cancel Order" color="warning">
                  <CancelIcon fontSize="small" />
                </IconButton>
              )}
            </>
          )}
          {params.row.status === 'invoiced' && isAdmin && !isMobile && (
            <IconButton size="small" onClick={() => handleDeleteOrder(params.row.id)} title="Delete Order" color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
          {params.row.status === 'cancelled' && !isMobile && (
            <IconButton size="small" onClick={() => handleDeleteOrder(params.row.id)} title="Delete Permanently" color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  const [statusFilter, setStatusFilter] = useState('');

  const filteredOrders = statusFilter
    ? orders.filter(o => o.status === statusFilter)
    : orders;

  // Count items with order_qty > 0
  const itemsToOrderCount = orderFormItems.filter(i => i.order_qty > 0).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: 2 }}>
        <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold">Orders</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog} fullWidth={isMobile}>
          New Order
        </Button>
      </Box>

      {/* Status Filter */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, px: { xs: 1.5, sm: 2 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Status</InputLabel>
                <Select value={statusFilter} label="Filter by Status" onChange={(e) => setStatusFilter(e.target.value)}>
                  <MenuItem value="">All Orders</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="submitted">Submitted</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="invoiced">Invoiced</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm="auto">
              <Chip label={`Total: ${filteredOrders.length}`} color="primary" variant="outlined" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <DataGrid
            rows={filteredOrders}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            autoHeight
            disableRowSelectionOnClick
            sx={{
              '& .MuiDataGrid-cell': {
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
              },
            }}
          />
        </Box>
      </Card>

      {/* Create/Edit Order Dialog - Responsive */}
      <Dialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditMode(false); setEditingOrderId(null); }}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6">{editMode ? 'Edit Order' : 'ORDER FORM'}</Typography>
            {itemsToOrderCount > 0 && (
              <Chip label={`${itemsToOrderCount} items`} color="primary" size="small" />
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1.5, sm: 3 } }}>
          <Box sx={{ mt: 1 }}>
            {/* Store Selection */}
            <Autocomplete
              options={stores}
              getOptionLabel={(option) => `${option.name} - ${option.city || ''}`}
              value={selectedStore}
              onChange={(_, value) => setSelectedStore(value)}
              renderInput={(params) => <TextField {...params} label="Select Store / Outlet" required size={isMobile ? "small" : "medium"} />}
              sx={{ mb: 2 }}
              filterOptions={(options, state) => {
                if (!state.inputValue) return options;
                const inputValue = state.inputValue.toLowerCase();
                return options.filter(option => {
                  const name = (option.name || '').toLowerCase();
                  const city = (option.city || '').toLowerCase();
                  return name.includes(inputValue) || city.includes(inputValue);
                });
              }}
              ListboxProps={{
                style: { maxHeight: 300 }
              }}
            />

            {/* Products Table */}
            <TableContainer component={Paper} sx={{ maxHeight: { xs: 300, sm: 400 } }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: { xs: 40, sm: 50 }, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>S.No</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>PRODUCTS</TableCell>
                    {!isMobile && <TableCell sx={{ fontWeight: 'bold', width: 100 }} align="right">MRP</TableCell>}
                    <TableCell sx={{ fontWeight: 'bold', width: { xs: 65, sm: 100 }, fontSize: { xs: '0.7rem', sm: '0.875rem' } }} align="center">Stock</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: { xs: 65, sm: 100 }, fontSize: { xs: '0.7rem', sm: '0.875rem' } }} align="center">Order</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orderFormItems.map((item, index) => (
                    <TableRow
                      key={item.product_id}
                      sx={{
                        backgroundColor: item.order_qty > 0 ? 'action.selected' : 'inherit',
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                    >
                      <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{index + 1}.</TableCell>
                      <TableCell sx={{ fontWeight: item.order_qty > 0 ? 'bold' : 'normal', fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                        {item.product_name}
                        {isMobile && <Typography variant="caption" display="block" color="text.secondary">₹{item.mrp}</Typography>}
                      </TableCell>
                      {!isMobile && <TableCell align="right">{item.mrp.toFixed(2)}</TableCell>}
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={item.stock_qty || ''}
                          onChange={(e) => handleStockQtyChange(index, parseInt(e.target.value) || 0)}
                          sx={{ width: { xs: 50, sm: 70 } }}
                          inputProps={{ min: 0, style: { textAlign: 'center', fontSize: isMobile ? '0.75rem' : '0.875rem' } }}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={item.order_qty || ''}
                          onChange={(e) => handleOrderQtyChange(index, parseInt(e.target.value) || 0)}
                          sx={{ width: { xs: 50, sm: 70 } }}
                          inputProps={{ min: 0, style: { textAlign: 'center', fontSize: isMobile ? '0.75rem' : '0.875rem' } }}
                          placeholder="0"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Notes */}
            <TextField
              fullWidth
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
              sx={{ mt: 2 }}
              size={isMobile ? "small" : "medium"}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={() => { setDialogOpen(false); setEditMode(false); setEditingOrderId(null); }} fullWidth={isMobile}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreateOrder} disabled={itemsToOrderCount === 0} fullWidth={isMobile}>
            {editMode ? 'Update Order' : 'Create Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Order Dialog - Responsive */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
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
                  <Box><Chip label={selectedOrder.status} color={getStatusColor(selectedOrder.status)} size="small" /></Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Created By</Typography>
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
                      <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>S.No</TableCell>
                      <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Product</TableCell>
                      {!isMobile && <TableCell align="right">MRP</TableCell>}
                      <TableCell align="center" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Stock</TableCell>
                      <TableCell align="center" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Order</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{index + 1}.</TableCell>
                        <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                          {item.product_name}
                          {item.weight && ` ${item.weight} ${(item.weight_unit || '').toUpperCase()}`}
                        </TableCell>
                        {!isMobile && <TableCell align="right">{formatCurrency(item.mrp)}</TableCell>}
                        <TableCell align="center" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{item.stock_qty || '-'}</TableCell>
                        <TableCell align="center" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {selectedOrder.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">Notes</Typography>
                  <Typography variant="body2">{selectedOrder.notes}</Typography>
                </Box>
              )}

              {/* Mobile action buttons in view dialog */}
              {isMobile && (
                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {selectedOrder.status === 'draft' && (
                    <>
                      <Button variant="outlined" color="primary" startIcon={<EditIcon />} onClick={() => { setViewDialogOpen(false); handleEditOrder(selectedOrder.id); }} fullWidth>
                        Edit Order
                      </Button>
                      <Button variant="contained" color="success" startIcon={<SendIcon />} onClick={() => { handleSubmitOrder(selectedOrder.id); setViewDialogOpen(false); }} fullWidth>
                        Submit Order
                      </Button>
                      <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => { handleDeleteOrder(selectedOrder.id); setViewDialogOpen(false); }} fullWidth>
                        Delete Order
                      </Button>
                    </>
                  )}
                  {selectedOrder.status === 'submitted' && (
                    <>
                      <Button variant="outlined" color="primary" startIcon={<EditIcon />} onClick={() => { setViewDialogOpen(false); handleEditOrder(selectedOrder.id); }} fullWidth>
                        Edit Order
                      </Button>
                      {isAdmin && (
                        <Button variant="contained" color="info" startIcon={<ApproveIcon />} onClick={() => { handleApproveOrder(selectedOrder.id); setViewDialogOpen(false); }} fullWidth>
                          Approve Order
                        </Button>
                      )}
                      <Button variant="outlined" color="warning" startIcon={<CancelIcon />} onClick={() => { handleCancelOrder(selectedOrder.id); setViewDialogOpen(false); }} fullWidth>
                        Cancel Order
                      </Button>
                    </>
                  )}
                  {selectedOrder.status === 'approved' && isAdmin && (
                    <Button variant="contained" color="success" startIcon={<InvoiceIcon />} onClick={() => { setViewDialogOpen(false); handleOpenInvoiceDialog(selectedOrder); }} fullWidth>
                      Create Invoice
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setViewDialogOpen(false)} fullWidth={isMobile}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create Invoice from Order Dialog - Responsive */}
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

              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Adjust quantities (set to 0 to exclude):
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' } }}>Product</TableCell>
                      {!isMobile && <TableCell>HSN</TableCell>}
                      <TableCell align="center" sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' } }}>Qty</TableCell>
                      {!isMobile && <TableCell align="right">MRP</TableCell>}
                      <TableCell align="right" sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' } }}>Margin%</TableCell>
                      <TableCell align="right" sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' } }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoiceItems.map((item: any, index: number) => (
                      <TableRow key={index} sx={{ opacity: item.invoice_quantity === 0 ? 0.5 : 1 }}>
                        <TableCell sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' } }}>{item.product_name}</TableCell>
                        {!isMobile && <TableCell>{item.hsn_code || '-'}</TableCell>}
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={item.invoice_quantity}
                            onChange={(e) => handleInvoiceQuantityChange(index, parseInt(e.target.value) || 0)}
                            sx={{ width: { xs: 45, sm: 80 } }}
                            inputProps={{ min: 0, max: item.quantity, style: { fontSize: isMobile ? '0.7rem' : '0.875rem', textAlign: 'center' } }}
                          />
                        </TableCell>
                        {!isMobile && <TableCell align="right">{formatCurrency(item.mrp)}</TableCell>}
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={item.margin_percentage}
                            onChange={(e) => handleInvoiceMarginChange(index, parseFloat(e.target.value) || 0)}
                            sx={{ width: { xs: 45, sm: 70 } }}
                            inputProps={{ min: 0, style: { fontSize: isMobile ? '0.7rem' : '0.875rem', textAlign: 'center' } }}
                          />
                        </TableCell>
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
    </Box>
  );
};

export default Orders;
