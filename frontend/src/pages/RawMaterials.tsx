import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, IconButton, Grid, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Autocomplete, Alert, Tab, Tabs, Table, TableHead, TableBody, TableRow, TableCell, Divider,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Warning as WarningIcon,
  AddCircle as AddStockIcon, RemoveCircle as RemoveStockIcon, ShoppingCart as RequestIcon,
  LocalShipping as ReceiveIcon, Visibility as ViewIcon,
} from '@mui/icons-material';
import { rawMaterialsAPI, vendorsAPI, purchaseRequestsAPI } from '../services/api';
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

interface RawMaterial {
  id: number;
  name: string;
  hsn_code: string;
  unit: string;
  stock_quantity: number;
  cost_per_unit: number;
  vendor_id: number | null;
  vendor_name: string | null;
  reorder_level: number;
  is_active: number;
}

interface RequestItem {
  raw_material_id: number | null;  // null for new materials
  material_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
  is_new: boolean;  // true if this is a new material being added
  hsn_code?: string;
  reorder_level?: number;
}

const RawMaterials: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [lowStockMaterials, setLowStockMaterials] = useState<RawMaterial[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [pendingArrivals, setPendingArrivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<any[]>([]);
  
  // Material Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState({ type: 'add', quantity: 0 });
  const [formData, setFormData] = useState({
    name: '',
    hsn_code: '',
    unit: 'kg',
    stock_quantity: 0,
    cost_per_unit: 0,
    vendor_id: null as number | null,
    reorder_level: 0,
  });
  
  // Request Dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [requestItems, setRequestItems] = useState<RequestItem[]>([]);
  const [expectedDate, setExpectedDate] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  
  // Receive Dialog
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [receiveItems, setReceiveItems] = useState<any[]>([]);
  const [receiveNotes, setReceiveNotes] = useState('');
  
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchMaterials();
    fetchVendors();
    fetchLowStock();
    fetchRequests();
    fetchPendingArrivals();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await rawMaterialsAPI.getAll({ is_active: 'true' });
      setMaterials(response.data.data);
    } catch (error) {
      toast.error('Failed to load raw materials');
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStock = async () => {
    try {
      const response = await rawMaterialsAPI.getLowStock();
      setLowStockMaterials(response.data.data);
    } catch (error) {
      console.error('Failed to load low stock alerts');
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await vendorsAPI.getAll({ is_active: 'true' });
      setVendors(response.data.data);
    } catch (error) {
      console.error('Failed to load vendors');
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await rawMaterialsAPI.getAllRequests();
      setRequests(response.data.data);
    } catch (error) {
      console.error('Failed to load requests');
    }
  };

  const fetchPendingArrivals = async () => {
    try {
      const response = await rawMaterialsAPI.getPendingArrivals();
      setPendingArrivals(response.data.data);
    } catch (error) {
      console.error('Failed to load pending arrivals');
    }
  };

  // Material CRUD handlers
  const handleOpenDialog = (material?: RawMaterial) => {
    if (material) {
      setSelectedMaterial(material);
      setFormData({
        name: material.name,
        hsn_code: material.hsn_code || '',
        unit: material.unit,
        stock_quantity: material.stock_quantity,
        cost_per_unit: material.cost_per_unit,
        vendor_id: material.vendor_id,
        reorder_level: material.reorder_level,
      });
    } else {
      setSelectedMaterial(null);
      setFormData({
        name: '',
        hsn_code: '',
        unit: 'kg',
        stock_quantity: 0,
        cost_per_unit: 0,
        vendor_id: null,
        reorder_level: 0,
      });
    }
    setDialogOpen(true);
  };

  const handleOpenStockDialog = (material: RawMaterial, type: 'add' | 'remove') => {
    setSelectedMaterial(material);
    setStockAdjustment({ type, quantity: 0 });
    setStockDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }

    try {
      if (selectedMaterial) {
        await rawMaterialsAPI.update(selectedMaterial.id, formData);
        toast.success('Raw material updated successfully');
      } else {
        await rawMaterialsAPI.create(formData);
        toast.success('Raw material created successfully');
      }
      setDialogOpen(false);
      fetchMaterials();
      fetchLowStock();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save raw material');
    }
  };

  const handleStockAdjust = async () => {
    if (!selectedMaterial || stockAdjustment.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      await rawMaterialsAPI.adjustStock(selectedMaterial.id, stockAdjustment);
      toast.success(`Stock ${stockAdjustment.type === 'add' ? 'added' : 'removed'} successfully`);
      setStockDialogOpen(false);
      fetchMaterials();
      fetchLowStock();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to adjust stock');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this raw material?')) return;

    try {
      await rawMaterialsAPI.delete(id);
      toast.success('Raw material deleted successfully');
      fetchMaterials();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete raw material');
    }
  };

  // Request handlers
  const handleOpenRequestDialog = (material?: RawMaterial) => {
    setSelectedVendor(null);
    setExpectedDate('');
    setRequestNotes('');
    
    if (material) {
      // Pre-fill with the selected material
      const vendor = vendors.find(v => v.id === material.vendor_id);
      if (vendor) setSelectedVendor(vendor);
      setRequestItems([{
        raw_material_id: material.id,
        material_name: material.name,
        unit: material.unit,
        quantity: 0,
        unit_price: material.cost_per_unit,
        total: 0,
        is_new: false,
      }]);
    } else {
      setRequestItems([]);
    }
    setRequestDialogOpen(true);
  };

  const handleAddRequestItem = () => {
    setRequestItems([...requestItems, {
      raw_material_id: null,
      material_name: '',
      unit: 'kg',
      quantity: 0,
      unit_price: 0,
      total: 0,
      is_new: false,
      hsn_code: '',
      reorder_level: 10,
    }]);
  };

  const handleRemoveRequestItem = (index: number) => {
    setRequestItems(requestItems.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, value: RawMaterial | string | null) => {
    const newItems = [...requestItems];
    
    if (typeof value === 'string') {
      // User typed a new material name
      newItems[index] = {
        ...newItems[index],
        raw_material_id: null,
        material_name: value,
        is_new: true,
      };
    } else if (value) {
      // User selected an existing material
      newItems[index] = {
        ...newItems[index],
        raw_material_id: value.id,
        material_name: value.name,
        unit: value.unit,
        unit_price: value.cost_per_unit || 0,
        total: newItems[index].quantity * (value.cost_per_unit || 0),
        is_new: false,
      };
    }
    setRequestItems(newItems);
  };

  const handleNewMaterialFieldChange = (index: number, field: string, value: any) => {
    const newItems = [...requestItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    setRequestItems(newItems);
  };


  const handleCreateRequest = async () => {
    if (!selectedVendor) {
      toast.error('Please select a vendor');
      return;
    }
    if (requestItems.length === 0) {
      toast.error('Please add at least one material');
      return;
    }
    
    // Validate items
    for (const item of requestItems) {
      if (!item.material_name.trim()) {
        toast.error('Please enter material name for all items');
        return;
      }
      if (item.quantity <= 0) {
        toast.error('Please enter valid quantity for all items');
        return;
      }
    }

    try {
      const data = {
        vendor_id: selectedVendor.id,
        items: requestItems.map(i => ({
          raw_material_id: i.raw_material_id,
          material_name: i.material_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          unit: i.unit,
          is_new: i.is_new,
          hsn_code: i.hsn_code || '',
          reorder_level: i.reorder_level || 10,
        })),
        expected_date: expectedDate || null,
        notes: requestNotes || null,
      };

      const response = await purchaseRequestsAPI.create(data);
      toast.success(response.data.message);
      setRequestDialogOpen(false);
      fetchRequests();
      fetchPendingArrivals();
      fetchMaterials(); // Refresh materials in case new ones were added
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create request');
    }
  };

  // Receive handlers
  const handleOpenReceiveDialog = async (request: any) => {
    try {
      const response = await rawMaterialsAPI.getRequestById(request.id);
      const requestData = response.data.data;
      setSelectedRequest(requestData);
      
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
      toast.error('Failed to load request details');
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
      fetchPendingArrivals();
      fetchMaterials(); // Refresh stock
      fetchLowStock();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to record receipt');
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'warning';
      case 'partial': return 'info';
      case 'received': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getArrivalStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'success';
      case 'partial': return 'info';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  // Material columns
  const materialColumns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
    { field: 'hsn_code', headerName: 'HSN Code', width: 120 },
    { field: 'unit', headerName: 'Unit', width: 80 },
    {
      field: 'stock_quantity',
      headerName: 'Stock',
      width: 120,
      renderCell: (params) => {
        const isLow = params.row.stock_quantity <= params.row.reorder_level;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography color={isLow ? 'error' : 'inherit'}>
              {params.value} {params.row.unit}
            </Typography>
            {isLow && <WarningIcon color="error" fontSize="small" />}
          </Box>
        );
      },
    },
    { field: 'cost_per_unit', headerName: 'Cost/Unit', width: 120, valueFormatter: (params) => formatCurrency(params.value) },
    { field: 'vendor_name', headerName: 'Vendor', width: 150, valueGetter: (params) => params.value || '-' },
    { field: 'reorder_level', headerName: 'Reorder Level', width: 120 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 250,
      sortable: false,
      renderCell: (params) => (
        <Box>
          {isAdmin && (
            <IconButton size="small" onClick={() => handleOpenRequestDialog(params.row)} title="Request Material" color="primary">
              <RequestIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" onClick={() => handleOpenStockDialog(params.row, 'add')} title="Add Stock" color="success">
            <AddStockIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleOpenStockDialog(params.row, 'remove')} title="Remove Stock" color="warning">
            <RemoveStockIcon fontSize="small" />
          </IconButton>
          {isAdmin && (
            <>
              <IconButton size="small" onClick={() => handleOpenDialog(params.row)} title="Edit">
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleDelete(params.row.id)} title="Delete" color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      ),
    },
  ];

  // Request columns
  const requestColumns: GridColDef[] = [
    { field: 'request_number', headerName: 'Request #', width: 150 },
    { field: 'vendor_name', headerName: 'Vendor', flex: 1, minWidth: 150 },
    { field: 'total_amount', headerName: 'Amount', width: 120, valueFormatter: (params) => formatCurrency(params.value) },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value} color={getStatusColor(params.value)} size="small" />
      ),
    },
    {
      field: 'arrival_status',
      headerName: 'Arrival',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value || 'pending'} color={getArrivalStatusColor(params.value)} size="small" />
      ),
    },
    {
      field: 'payment_status',
      headerName: 'Payment',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value || 'pending'} color={params.value === 'paid' ? 'success' : 'warning'} size="small" />
      ),
    },
    { field: 'request_date', headerName: 'Date', width: 100, valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-' },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Box>
          {['submitted', 'partial'].includes(params.row.status) && isAdmin && (
            <IconButton size="small" onClick={() => handleOpenReceiveDialog(params.row)} title="Record Arrival" color="success">
              <ReceiveIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  // Pending arrivals columns
  const pendingColumns: GridColDef[] = [
    { field: 'request_number', headerName: 'Request #', width: 150 },
    { field: 'vendor_name', headerName: 'Vendor', flex: 1, minWidth: 150 },
    { field: 'item_count', headerName: 'Items', width: 70, align: 'center' },
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
    { field: 'expected_date', headerName: 'Expected', width: 100, valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-' },
    {
      field: 'arrival_status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value === 'partial' ? 'Partial' : 'Pending'} color={params.value === 'partial' ? 'info' : 'warning'} size="small" />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => isAdmin && (
        <IconButton size="small" onClick={() => handleOpenReceiveDialog(params.row)} title="Record Arrival" color="success">
          <ReceiveIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const totalRequestAmount = requestItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Raw Materials</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<RequestIcon />} onClick={() => handleOpenRequestDialog()}>
            New Request
          </Button>
        )}
      </Box>

      {lowStockMaterials.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Low Stock Alert!</Typography>
          {lowStockMaterials.slice(0, 3).map((m) => (
            <Typography key={m.id} variant="body2">
              {m.name}: {m.stock_quantity} {m.unit} (Reorder level: {m.reorder_level})
            </Typography>
          ))}
          {lowStockMaterials.length > 3 && (
            <Typography variant="body2">...and {lowStockMaterials.length - 3} more</Typography>
          )}
        </Alert>
      )}

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label={`Materials (${materials.length})`} />
          <Tab label={`Pending Arrivals (${pendingArrivals.length})`} />
          <Tab label={`All Requests (${requests.length})`} />
        </Tabs>
      </Card>

      {/* Tab 0: Materials */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <DataGrid
            rows={materials}
            columns={materialColumns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            autoHeight
            disableRowSelectionOnClick
          />
        </Card>
      </TabPanel>

      {/* Tab 1: Pending Arrivals */}
      <TabPanel value={tabValue} index={1}>
        {pendingArrivals.length === 0 ? (
          <Alert severity="success">No pending arrivals. All materials have been received.</Alert>
        ) : (
          <Card>
            <DataGrid
              rows={pendingArrivals}
              columns={pendingColumns}
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              autoHeight
              disableRowSelectionOnClick
            />
          </Card>
        )}
      </TabPanel>

      {/* Tab 2: All Requests */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <DataGrid
            rows={requests}
            columns={requestColumns}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            autoHeight
            disableRowSelectionOnClick
          />
        </Card>
      </TabPanel>

      {/* Add/Edit Material Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedMaterial ? 'Edit Raw Material' : 'Add Raw Material'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="HSN Code"
              value={formData.hsn_code}
              onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={formData.unit}
                    label="Unit"
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <MenuItem value="kg">Kilogram (kg)</MenuItem>
                    <MenuItem value="g">Gram (g)</MenuItem>
                    <MenuItem value="litre">Litre</MenuItem>
                    <MenuItem value="ml">Millilitre (ml)</MenuItem>
                    <MenuItem value="pcs">Pieces</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Cost per Unit"
                  type="number"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Initial Stock"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: parseFloat(e.target.value) || 0 })}
                  inputProps={{ min: 0 }}
                  disabled={!!selectedMaterial}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Reorder Level"
                  type="number"
                  value={formData.reorder_level}
                  onChange={(e) => setFormData({ ...formData, reorder_level: parseFloat(e.target.value) || 0 })}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </Grid>
            <Autocomplete
              options={vendors}
              getOptionLabel={(option) => option.name}
              value={vendors.find((v) => v.id === formData.vendor_id) || null}
              onChange={(_, value) => setFormData({ ...formData, vendor_id: value?.id || null })}
              renderInput={(params) => <TextField {...params} label="Preferred Vendor" />}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {selectedMaterial ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialogOpen} onClose={() => setStockDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {stockAdjustment.type === 'add' ? 'Add Stock' : 'Remove Stock'}
        </DialogTitle>
        <DialogContent>
          {selectedMaterial && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Material: {selectedMaterial.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current Stock: {selectedMaterial.stock_quantity} {selectedMaterial.unit}
              </Typography>
              <TextField
                fullWidth
                label={`Quantity to ${stockAdjustment.type}`}
                type="number"
                value={stockAdjustment.quantity}
                onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={stockAdjustment.type === 'add' ? 'success' : 'warning'}
            onClick={handleStockAdjust}
          >
            {stockAdjustment.type === 'add' ? 'Add Stock' : 'Remove Stock'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Request Dialog */}
      <Dialog open={requestDialogOpen} onClose={() => setRequestDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Create Material Request</DialogTitle>
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
              <Button startIcon={<AddIcon />} onClick={handleAddRequestItem}>Add Material</Button>
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 200 }}>Material Name</TableCell>
                  <TableCell sx={{ width: 100 }}>Unit</TableCell>
                  <TableCell align="center" sx={{ width: 100 }}>Quantity</TableCell>
                  <TableCell align="right" sx={{ width: 100 }}>Unit Price</TableCell>
                  <TableCell align="right" sx={{ width: 100 }}>Total</TableCell>
                  <TableCell sx={{ width: 50 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requestItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Autocomplete
                        freeSolo
                        options={materials}
                        getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                        value={item.is_new ? item.material_name : (materials.find(m => m.id === item.raw_material_id) || item.material_name)}
                        onChange={(_, value) => handleMaterialChange(index, value as RawMaterial | string | null)}
                        onInputChange={(_, newValue, reason) => {
                          if (reason === 'input') {
                            handleMaterialChange(index, newValue);
                          }
                        }}
                        renderInput={(params) => (
                          <TextField 
                            {...params} 
                            size="small" 
                            placeholder="Type or select material"
                            helperText={item.is_new ? "New material" : ""}
                          />
                        )}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {item.is_new ? (
                        <FormControl size="small" fullWidth>
                          <Select
                            value={item.unit}
                            onChange={(e) => handleNewMaterialFieldChange(index, 'unit', e.target.value)}
                          >
                            <MenuItem value="kg">kg</MenuItem>
                            <MenuItem value="g">g</MenuItem>
                            <MenuItem value="litre">litre</MenuItem>
                            <MenuItem value="ml">ml</MenuItem>
                            <MenuItem value="pcs">pcs</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <Typography variant="body2">{item.unit || '-'}</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        type="number"
                        size="small"
                        value={item.quantity || ''}
                        onChange={(e) => handleNewMaterialFieldChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        sx={{ width: 80 }}
                        inputProps={{ min: 0 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        value={item.unit_price || ''}
                        onChange={(e) => handleNewMaterialFieldChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        sx={{ width: 80 }}
                        inputProps={{ min: 0 }}
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={() => handleRemoveRequestItem(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Typography variant="h6">Total: {formatCurrency(totalRequestAmount)}</Typography>
            </Box>

            <TextField
              fullWidth
              label="Notes"
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              multiline
              rows={2}
              sx={{ mt: 2 }}
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              When you create this request, a purchase bill will be automatically generated for payment tracking.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateRequest}>Create Request</Button>
        </DialogActions>
      </Dialog>

      {/* Record Arrival Dialog */}
      <Dialog open={receiveDialogOpen} onClose={() => setReceiveDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Record Material Arrival - {selectedRequest?.request_number}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Enter the quantity received for each material. Stock will be updated automatically.
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
            Record Arrival
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RawMaterials;
