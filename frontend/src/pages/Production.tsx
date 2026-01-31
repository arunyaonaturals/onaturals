import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, IconButton, Grid, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Tab, Tabs, Table, TableHead, TableBody, TableRow,
  TableCell, Autocomplete, Alert, LinearProgress, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Add as AddIcon, PlayArrow as StartIcon, CheckCircle as CompleteIcon, Cancel as CancelIcon,
  Visibility as ViewIcon, Factory as FactoryIcon, Inventory as BatchIcon,
} from '@mui/icons-material';
import { productionAPI, productsAPI } from '../services/api';
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

const Production: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [productionOrders, setProductionOrders] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [orderDemand, setOrderDemand] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantityToProduce, setQuantityToProduce] = useState(0);
  const [quantityProduced, setQuantityProduced] = useState(0);
  const [batchFilter, setBatchFilter] = useState<string>('available');
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchData();
  }, [tabValue, batchFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tabValue === 0) {
        // Fetch pending orders (demand from sales captains)
        const response = await productionAPI.getOrderDemand();
        setOrderDemand(response.data.data);
      } else if (tabValue === 1) {
        const response = await productionAPI.getSuggestions();
        setSuggestions(response.data.data);
      } else if (tabValue === 2) {
        const response = await productionAPI.getAll();
        setProductionOrders(response.data.data);
      } else if (tabValue === 3) {
        const params: any = {};
        if (batchFilter) params.status = batchFilter;
        const response = await productionAPI.getAllBatches(params);
        setBatches(response.data.data);
      }

      const productsRes = await productsAPI.getAll({ is_active: 'true' });
      setProducts(productsRes.data.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (suggestion?: any) => {
    if (suggestion) {
      setSelectedProduct(products.find(p => p.id === suggestion.product_id) || null);
      setQuantityToProduce(suggestion.can_produce || suggestion.production_needed);
    } else {
      setSelectedProduct(null);
      setQuantityToProduce(0);
    }
    setDialogOpen(true);
  };

  const handleViewOrder = async (id: number) => {
    try {
      const response = await productionAPI.getById(id);
      setSelectedOrder(response.data.data);
      setViewDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load production order details');
    }
  };

  const handleCreateProduction = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }
    if (quantityToProduce <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      await productionAPI.create({
        product_id: selectedProduct.id,
        quantity_to_produce: quantityToProduce,
      });
      toast.success('Production order created successfully');
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create production order');
    }
  };

  const handleStartProduction = async (id: number) => {
    try {
      await productionAPI.start(id);
      toast.success('Production started');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start production');
    }
  };

  const handleOpenCompleteDialog = (order: any) => {
    setSelectedOrder(order);
    setQuantityProduced(order.quantity_to_produce);
    setCompleteDialogOpen(true);
  };

  const handleCompleteProduction = async () => {
    if (!selectedOrder) return;

    try {
      await productionAPI.complete(selectedOrder.id, { quantity_produced: quantityProduced });
      toast.success('Production completed successfully');
      setCompleteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete production');
    }
  };

  const handleCancelProduction = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this production order?')) return;

    try {
      await productionAPI.cancel(id);
      toast.success('Production cancelled');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel production');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'in_progress': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      case 'available': return 'success';
      case 'depleted': return 'default';
      case 'expired': return 'error';
      case 'recalled': return 'error';
      default: return 'default';
    }
  };

  const batchColumns: GridColDef[] = [
    { field: 'batch_number', headerName: 'Batch #', width: 180 },
    { field: 'product_name', headerName: 'Product', flex: 1, minWidth: 200 },
    { field: 'quantity_produced', headerName: 'Produced', width: 100, align: 'center' },
    { field: 'quantity_remaining', headerName: 'Remaining', width: 100, align: 'center' },
    {
      field: 'production_date',
      headerName: 'Production Date',
      width: 130,
      valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value.charAt(0).toUpperCase() + params.value.slice(1)}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    { field: 'production_order_number', headerName: 'Order #', width: 150 },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 100,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString('en-IN'),
    },
  ];

  const ordersColumns: GridColDef[] = [
    { field: 'order_number', headerName: 'Order #', width: 150 },
    { field: 'product_name', headerName: 'Product', flex: 1, minWidth: 200 },
    { field: 'quantity_to_produce', headerName: 'Target Qty', width: 100, align: 'center' },
    { field: 'quantity_produced', headerName: 'Produced', width: 100, align: 'center' },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value} color={getStatusColor(params.value)} size="small" />
      ),
    },
    { field: 'created_by_name', headerName: 'Created By', width: 130 },
    {
      field: 'created_at',
      headerName: 'Date',
      width: 100,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString('en-IN'),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => handleViewOrder(params.row.id)} title="View">
            <ViewIcon fontSize="small" />
          </IconButton>
          {params.row.status === 'pending' && isAdmin && (
            <>
              <IconButton size="small" onClick={() => handleStartProduction(params.row.id)} title="Start" color="primary">
                <StartIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleCancelProduction(params.row.id)} title="Cancel" color="error">
                <CancelIcon fontSize="small" />
              </IconButton>
            </>
          )}
          {params.row.status === 'in_progress' && isAdmin && (
            <IconButton size="small" onClick={() => handleOpenCompleteDialog(params.row)} title="Complete" color="success">
              <CompleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Production</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            New Production Order
          </Button>
        )}
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label={`Order Demand (${orderDemand.length})`} />
          <Tab label="Suggested Production" />
          <Tab label="Production Orders" />
          <Tab label="Batch Inventory" icon={<BatchIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab 0: Order Demand from Sales Captains */}
      <TabPanel value={tabValue} index={0}>
        {loading ? (
          <LinearProgress />
        ) : orderDemand.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No pending orders from sales captains. When orders are placed, they will appear here.
          </Alert>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Below are pending/approved orders from Sales Captains. Review the demand and create production orders as needed.
            </Alert>
            <Grid container spacing={2}>
              {orderDemand.map((order: any) => (
                <Grid item xs={12} key={order.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box>
                          <Typography variant="h6">{order.order_number}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Store: {order.store_name} | Sales Captain: {order.created_by_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Order Date: {new Date(order.created_at).toLocaleDateString('en-IN')}
                          </Typography>
                        </Box>
                        <Chip
                          label={order.status}
                          color={order.status === 'approved' ? 'success' : 'warning'}
                          size="small"
                        />
                      </Box>

                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Product</TableCell>
                            <TableCell align="center">Ordered</TableCell>
                            <TableCell align="center">Stock Available</TableCell>
                            <TableCell align="center">Shortage</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {order.items?.map((item: any) => {
                            const shortage = Math.max(0, item.quantity - (item.stock_quantity || 0));
                            return (
                              <TableRow key={item.id}>
                                <TableCell>{item.product_name}</TableCell>
                                <TableCell align="center">{item.quantity}</TableCell>
                                <TableCell align="center">{Math.max(0, item.stock_quantity || 0)}</TableCell>
                                <TableCell align="center">
                                  {shortage > 0 ? (
                                    <Chip label={shortage} color="error" size="small" />
                                  ) : (
                                    <Chip label="OK" color="success" size="small" />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </TabPanel>

      {/* Tab 1: Suggested Production */}
      <TabPanel value={tabValue} index={1}>
        {loading ? (
          <LinearProgress />
        ) : suggestions.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No production suggestions at this time. All products have sufficient stock for pending orders.
          </Alert>
        ) : (
          <Card>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="center">Current Stock</TableCell>
                  <TableCell align="center">Required</TableCell>
                  <TableCell align="center">To Produce</TableCell>
                  <TableCell align="center">Can Produce</TableCell>
                  <TableCell align="center">Status</TableCell>
                  {isAdmin && <TableCell align="center">Action</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {suggestions.map((item) => (
                  <TableRow
                    key={item.product_id}
                    sx={{
                      backgroundColor: item.stock_sufficient ? 'success.light' : 'inherit',
                      '&:hover': { backgroundColor: item.stock_sufficient ? 'success.main' : 'action.hover' }
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">{item.product_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.weight} {item.weight_unit}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        color={Math.max(0, item.current_stock) === 0 ? 'error.main' : 'text.primary'}
                        fontWeight="bold"
                      >
                        {Math.max(0, item.current_stock)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{item.total_required}</TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        color={item.production_needed > 0 ? 'warning.main' : 'text.primary'}
                        fontWeight={item.production_needed > 0 ? 'bold' : 'normal'}
                      >
                        {item.production_needed}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        color={item.can_produce >= item.production_needed ? 'success.main' : 'error.main'}
                      >
                        {item.can_produce}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {item.stock_sufficient ? (
                        <Chip label="Ready" color="success" size="small" />
                      ) : !item.has_recipe ? (
                        <Chip label="No Recipe" color="error" size="small" />
                      ) : item.can_produce >= item.production_needed ? (
                        <Chip label="Can Produce" color="warning" size="small" />
                      ) : (
                        <Chip label="Low Materials" color="error" size="small" />
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell align="center">
                        {!item.stock_sufficient && item.has_recipe && item.can_produce > 0 && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<FactoryIcon />}
                            onClick={() => handleOpenDialog(item)}
                          >
                            Produce
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </TabPanel>

      {/* Tab 2: Production Orders */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <DataGrid
            rows={productionOrders}
            columns={ordersColumns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            autoHeight
            disableRowSelectionOnClick
          />
        </Card>
      </TabPanel>

      {/* Tab 3: Batch Inventory */}
      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Product Batches</Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={batchFilter}
                  label="Status"
                  onChange={(e) => setBatchFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="depleted">Depleted</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <DataGrid
              rows={batches}
              columns={batchColumns}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              autoHeight
              disableRowSelectionOnClick
            />
          </CardContent>
        </Card>
      </TabPanel>

      {/* Create Production Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Production Order</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Autocomplete
              options={products}
              getOptionLabel={(option) => `${option.name} - ${option.weight || ''} ${(option.weight_unit || '').toUpperCase()}`}
              value={selectedProduct}
              onChange={(_, value) => setSelectedProduct(value)}
              renderInput={(params) => <TextField {...params} label="Select Product" />}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Quantity to Produce"
              type="number"
              value={quantityToProduce}
              onChange={(e) => setQuantityToProduce(parseInt(e.target.value) || 0)}
              inputProps={{ min: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateProduction}>
            Create Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Production Order Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Production Order - {selectedOrder?.order_number}</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Product</Typography>
                  <Typography>{selectedOrder.product_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip label={selectedOrder.status} color={getStatusColor(selectedOrder.status)} size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Target Quantity</Typography>
                  <Typography>{selectedOrder.quantity_to_produce}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Produced Quantity</Typography>
                  <Typography>{selectedOrder.quantity_produced || 0}</Typography>
                </Grid>
              </Grid>

              {selectedOrder.materials && selectedOrder.materials.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>Materials</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Raw Material</TableCell>
                        <TableCell align="right">Required</TableCell>
                        <TableCell align="right">Used</TableCell>
                        <TableCell align="right">Available</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.materials.map((mat: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{mat.raw_material_name}</TableCell>
                          <TableCell align="right">{mat.quantity_required} {mat.unit}</TableCell>
                          <TableCell align="right">{mat.quantity_used || 0} {mat.unit}</TableCell>
                          <TableCell align="right">{mat.available_stock} {mat.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Complete Production Dialog */}
      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Complete Production</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Order: {selectedOrder.order_number}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Product: {selectedOrder.product_name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Target: {selectedOrder.quantity_to_produce} units
              </Typography>
              <TextField
                fullWidth
                label="Actual Quantity Produced"
                type="number"
                value={quantityProduced}
                onChange={(e) => setQuantityProduced(parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
                sx={{ mt: 2 }}
                helperText="Enter the actual quantity produced. Raw materials will be deducted proportionally."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleCompleteProduction}>
            Complete Production
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Production;
