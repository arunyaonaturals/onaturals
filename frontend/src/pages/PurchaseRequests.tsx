import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, IconButton, Grid, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Table, TableHead, TableBody, TableRow, TableCell,
  Autocomplete, FormControl, InputLabel, Select, MenuItem, Divider, Tab, Tabs, Alert,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Add as AddIcon, Visibility as ViewIcon, Send as SendIcon, Delete as DeleteIcon,
  LocalShipping as ReceiveIcon, Cancel as CancelIcon, Edit as EditIcon,
} from '@mui/icons-material';
import { purchaseRequestsAPI, vendorsAPI, rawMaterialsAPI } from '../services/api';
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

interface RequestItem {
  raw_material_id: number;
  material_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
}

const PurchaseRequests: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [requests, setRequests] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  
  // Create Request State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  
  // View Request State
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  
  // Receive Dialog State
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receiveItems, setReceiveItems] = useState<any[]>([]);
  const [receiveNotes, setReceiveNotes] = useState('');
  
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchRequests();
    fetchPendingRequests();
    fetchVendors();
    fetchRawMaterials();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await purchaseRequestsAPI.getAll();
      setRequests(response.data.data);
    } catch (error) {
      toast.error('Failed to load purchase requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await purchaseRequestsAPI.getPending();
      setPendingRequests(response.data.data);
    } catch (error) {
      console.error('Failed to load pending requests');
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await vendorsAPI.getAll({ is_active: 1 });
      setVendors(response.data.data);
    } catch (error) {
      console.error('Failed to load vendors');
    }
  };

  const fetchRawMaterials = async () => {
    try {
      const response = await rawMaterialsAPI.getAll({ is_active: 1 });
      setRawMaterials(response.data.data);
    } catch (error) {
      console.error('Failed to load raw materials');
    }
  };

  const handleOpenCreateDialog = () => {
    setSelectedVendor(null);
    setItems([]);
    setExpectedDate('');
    setNotes('');
    setCreateDialogOpen(true);
  };

  const handleAddItem = () => {
    setItems([...items, { raw_material_id: 0, material_name: '', unit: '', quantity: 0, unit_price: 0, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, material: any) => {
    if (!material) return;
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      raw_material_id: material.id,
      material_name: material.name,
      unit: material.unit,
      unit_price: material.cost_per_unit || 0,
      total: newItems[index].quantity * (material.cost_per_unit || 0),
    };
    setItems(newItems);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    newItems[index].total = quantity * newItems[index].unit_price;
    setItems(newItems);
  };

  const handlePriceChange = (index: number, price: number) => {
    const newItems = [...items];
    newItems[index].unit_price = price;
    newItems[index].total = newItems[index].quantity * price;
    setItems(newItems);
  };

  const handleCreateRequest = async () => {
    if (!selectedVendor) {
      toast.error('Please select a vendor');
      return;
    }
    if (items.length === 0 || items.some(i => !i.raw_material_id || i.quantity <= 0)) {
      toast.error('Please add at least one material with valid quantity');
      return;
    }

    try {
      const data = {
        vendor_id: selectedVendor.id,
        items: items.map(i => ({
          raw_material_id: i.raw_material_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        expected_date: expectedDate || null,
        notes: notes || null,
      };

      const response = await purchaseRequestsAPI.create(data);
      toast.success(`Request ${response.data.data.request_number} created!`);
      setCreateDialogOpen(false);
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create request');
    }
  };

  const handleViewRequest = async (id: number) => {
    try {
      const response = await purchaseRequestsAPI.getById(id);
      setSelectedRequest(response.data.data);
      setViewDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load request details');
    }
  };

  const handleSubmitRequest = async (id: number) => {
    try {
      const response = await purchaseRequestsAPI.submit(id);
      toast.success(response.data.message);
      fetchRequests();
      fetchPendingRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    }
  };

  const handleCancelRequest = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    try {
      await purchaseRequestsAPI.cancel(id);
      toast.success('Request cancelled');
      fetchRequests();
      fetchPendingRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel request');
    }
  };

  const handleDeleteRequest = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    try {
      await purchaseRequestsAPI.delete(id);
      toast.success('Request deleted');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete request');
    }
  };

  const handleOpenReceiveDialog = async (request: any) => {
    try {
      const response = await purchaseRequestsAPI.getById(request.id);
      const requestData = response.data.data;
      setSelectedRequest(requestData);
      
      // Initialize receive items with pending quantities
      const initItems = requestData.items.map((item: any) => ({
        item_id: item.id,
        material_name: item.material_name,
        unit: item.unit,
        quantity_ordered: item.quantity_ordered,
        quantity_received: item.quantity_received,
        quantity_pending: item.quantity_ordered - item.quantity_received,
        quantity_to_receive: 0,
      }));
      setReceiveItems(initItems);
      setReceiveNotes('');
      setReceiveDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load request for receiving');
    }
  };

  const handleReceiveQuantityChange = (index: number, quantity: number) => {
    const newItems = [...receiveItems];
    const maxQty = newItems[index].quantity_pending;
    newItems[index].quantity_to_receive = Math.min(Math.max(0, quantity), maxQty);
    setReceiveItems(newItems);
  };

  const handleRecordReceipt = async () => {
    const itemsToReceive = receiveItems.filter(i => i.quantity_to_receive > 0);
    if (itemsToReceive.length === 0) {
      toast.error('Please enter quantity for at least one item');
      return;
    }

    try {
      const data = {
        items: itemsToReceive.map(i => ({
          item_id: i.item_id,
          quantity_received: i.quantity_to_receive,
        })),
        notes: receiveNotes,
      };

      const response = await purchaseRequestsAPI.recordReceipt(selectedRequest.id, data);
      toast.success(response.data.message);
      setReceiveDialogOpen(false);
      fetchRequests();
      fetchPendingRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to record receipt');
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'submitted': return 'warning';
      case 'partial': return 'info';
      case 'received': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'request_number', headerName: 'Request #', width: 150 },
    { field: 'vendor_name', headerName: 'Vendor', flex: 1, minWidth: 180 },
    { field: 'item_count', headerName: 'Items', width: 80, align: 'center' },
    { field: 'total_amount', headerName: 'Amount', width: 120, valueFormatter: (params) => formatCurrency(params.value) },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value} color={getStatusColor(params.value)} size="small" />
      ),
    },
    { field: 'request_date', headerName: 'Date', width: 100, valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-' },
    { field: 'expected_date', headerName: 'Expected', width: 100, valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-' },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => handleViewRequest(params.row.id)} title="View">
            <ViewIcon fontSize="small" />
          </IconButton>
          {params.row.status === 'draft' && isAdmin && (
            <>
              <IconButton size="small" onClick={() => handleSubmitRequest(params.row.id)} title="Submit" color="primary">
                <SendIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleCancelRequest(params.row.id)} title="Cancel" color="warning">
                <CancelIcon fontSize="small" />
              </IconButton>
            </>
          )}
          {['submitted', 'partial'].includes(params.row.status) && isAdmin && (
            <>
              <IconButton size="small" onClick={() => handleOpenReceiveDialog(params.row)} title="Record Receipt" color="success">
                <ReceiveIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleCancelRequest(params.row.id)} title="Cancel" color="warning">
                <CancelIcon fontSize="small" />
              </IconButton>
            </>
          )}
          {['draft', 'cancelled'].includes(params.row.status) && isAdmin && (
            <IconButton size="small" onClick={() => handleDeleteRequest(params.row.id)} title="Delete" color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  const pendingColumns: GridColDef[] = [
    { field: 'request_number', headerName: 'Request #', width: 150 },
    { field: 'vendor_name', headerName: 'Vendor', flex: 1, minWidth: 150 },
    { field: 'total_amount', headerName: 'Amount', width: 120, valueFormatter: (params) => formatCurrency(params.value) },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value === 'partial' ? 'Partial' : 'Pending'} color={params.value === 'partial' ? 'info' : 'warning'} size="small" />
      ),
    },
    { field: 'expected_date', headerName: 'Expected', width: 100, valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-' },
    {
      field: 'progress',
      headerName: 'Received',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.row.total_received || 0} / {params.row.total_ordered || 0}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => handleViewRequest(params.row.id)} title="View">
            <ViewIcon fontSize="small" />
          </IconButton>
          {isAdmin && (
            <IconButton size="small" onClick={() => handleOpenReceiveDialog(params.row)} title="Record Receipt" color="success">
              <ReceiveIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Purchase Requests</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog}>
            New Request
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label={`Pending Deliveries (${pendingRequests.length})`} />
          <Tab label={`All Requests (${requests.length})`} />
        </Tabs>
      </Card>

      {/* Tab 0: Pending Deliveries */}
      <TabPanel value={tabValue} index={0}>
        {pendingRequests.length === 0 ? (
          <Alert severity="info">No pending deliveries. All materials have been received.</Alert>
        ) : (
          <Card>
            <DataGrid
              rows={pendingRequests}
              columns={pendingColumns}
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              autoHeight
              disableRowSelectionOnClick
            />
          </Card>
        )}
      </TabPanel>

      {/* Tab 1: All Requests */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <DataGrid
            rows={requests}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            autoHeight
            disableRowSelectionOnClick
          />
        </Card>
      </TabPanel>

      {/* Create Request Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Create Purchase Request</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={vendors}
                  getOptionLabel={(option) => `${option.name} - ${option.city || ''}`}
                  value={selectedVendor}
                  onChange={(_, value) => setSelectedVendor(value)}
                  renderInput={(params) => <TextField {...params} label="Select Vendor" required />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Expected Delivery Date"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 2 }}>
              <Typography variant="h6">Materials</Typography>
              <Button startIcon={<AddIcon />} onClick={handleAddItem}>Add Material</Button>
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 250 }}>Material</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell align="center">Quantity</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Autocomplete
                        options={rawMaterials}
                        getOptionLabel={(option) => `${option.name} (${option.unit})`}
                        onChange={(_, value) => handleMaterialChange(index, value)}
                        renderInput={(params) => <TextField {...params} size="small" placeholder="Select material" />}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{item.unit || '-'}</TableCell>
                    <TableCell align="center">
                      <TextField
                        type="number"
                        size="small"
                        value={item.quantity || ''}
                        onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                        sx={{ width: 100 }}
                        inputProps={{ min: 0 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        value={item.unit_price || ''}
                        onChange={(e) => handlePriceChange(index, parseFloat(e.target.value) || 0)}
                        sx={{ width: 100 }}
                        inputProps={{ min: 0 }}
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Typography variant="h6">Total: {formatCurrency(totalAmount)}</Typography>
            </Box>

            <TextField
              fullWidth
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateRequest}>Create Request</Button>
        </DialogActions>
      </Dialog>

      {/* View Request Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Request Details - {selectedRequest?.request_number}</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">Vendor</Typography>
                  <Typography>{selectedRequest.vendor_name}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip label={selectedRequest.status} color={getStatusColor(selectedRequest.status)} size="small" />
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">Request Date</Typography>
                  <Typography>{selectedRequest.request_date ? new Date(selectedRequest.request_date).toLocaleDateString('en-IN') : '-'}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">Expected Date</Typography>
                  <Typography>{selectedRequest.expected_date ? new Date(selectedRequest.expected_date).toLocaleDateString('en-IN') : '-'}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>Items</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell>HSN</TableCell>
                    <TableCell align="center">Ordered</TableCell>
                    <TableCell align="center">Received</TableCell>
                    <TableCell align="center">Pending</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedRequest.items?.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.material_name}</TableCell>
                      <TableCell>{item.hsn_code || '-'}</TableCell>
                      <TableCell align="center">{item.quantity_ordered} {item.unit}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={`${item.quantity_received} ${item.unit}`} 
                          size="small" 
                          color={item.quantity_received >= item.quantity_ordered ? 'success' : item.quantity_received > 0 ? 'info' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center">{item.quantity_ordered - item.quantity_received} {item.unit}</TableCell>
                      <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Typography variant="h6">Total Amount: {formatCurrency(selectedRequest.total_amount)}</Typography>
              </Box>

              {selectedRequest.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                  <Typography>{selectedRequest.notes}</Typography>
                </Box>
              )}

              {selectedRequest.receipts && selectedRequest.receipts.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>Related Bills</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Receipt #</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Payment</TableCell>
                        <TableCell>Arrival</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedRequest.receipts.map((receipt: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{receipt.receipt_number}</TableCell>
                          <TableCell>{new Date(receipt.receipt_date).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell>{formatCurrency(receipt.total_amount)}</TableCell>
                          <TableCell>
                            <Chip label={receipt.payment_status} size="small" color={receipt.payment_status === 'paid' ? 'success' : 'warning'} />
                          </TableCell>
                          <TableCell>
                            <Chip label={receipt.arrival_status} size="small" color={receipt.arrival_status === 'received' ? 'success' : receipt.arrival_status === 'partial' ? 'info' : 'default'} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          {selectedRequest?.status === 'draft' && isAdmin && (
            <Button variant="contained" color="primary" onClick={() => { setViewDialogOpen(false); handleSubmitRequest(selectedRequest.id); }}>
              Submit Request
            </Button>
          )}
          {['submitted', 'partial'].includes(selectedRequest?.status) && isAdmin && (
            <Button variant="contained" color="success" onClick={() => { setViewDialogOpen(false); handleOpenReceiveDialog(selectedRequest); }}>
              Record Receipt
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Record Receipt Dialog */}
      <Dialog open={receiveDialogOpen} onClose={() => setReceiveDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Record Material Receipt - {selectedRequest?.request_number}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Enter the quantity received for each material. Leave as 0 for items not received yet.
            </Alert>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell align="center">Ordered</TableCell>
                  <TableCell align="center">Already Received</TableCell>
                  <TableCell align="center">Pending</TableCell>
                  <TableCell align="center">Receive Now</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {receiveItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.material_name}</TableCell>
                    <TableCell align="center">{item.quantity_ordered} {item.unit}</TableCell>
                    <TableCell align="center">{item.quantity_received} {item.unit}</TableCell>
                    <TableCell align="center">
                      <Chip label={`${item.quantity_pending} ${item.unit}`} size="small" color={item.quantity_pending > 0 ? 'warning' : 'success'} />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        type="number"
                        size="small"
                        value={item.quantity_to_receive || ''}
                        onChange={(e) => handleReceiveQuantityChange(index, parseFloat(e.target.value) || 0)}
                        sx={{ width: 100 }}
                        inputProps={{ min: 0, max: item.quantity_pending }}
                        disabled={item.quantity_pending === 0}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <TextField
              fullWidth
              label="Receipt Notes"
              value={receiveNotes}
              onChange={(e) => setReceiveNotes(e.target.value)}
              multiline
              rows={2}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiveDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleRecordReceipt}>
            Record Receipt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseRequests;
