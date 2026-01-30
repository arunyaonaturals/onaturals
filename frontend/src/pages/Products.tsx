import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Autocomplete,
  Chip,
  useTheme,
  useMediaQuery,
  TableContainer,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Settings as RecipeIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { productsAPI, productionAPI, rawMaterialsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

interface Product {
  id: number;
  name: string;
  hsn_code: string;
  weight: number;
  weight_unit: string;
  cost: number;
  selling_price: number;
  mrp: number;
  gst_rate: number;
  category_id: number;
  category_name: string;
  stock_quantity: number;
  is_active: boolean;
}

interface RecipeItem {
  raw_material_id: number;
  raw_material_name: string;
  quantity_required: number;
  unit: string;
}

const Products: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [selectedProductForRecipe, setSelectedProductForRecipe] = useState<Product | null>(null);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [productBatches, setProductBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    hsn_code: '',
    weight: '',
    weight_unit: 'kg',
    mrp: '',
    gst_rate: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchRawMaterials();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ is_active: 'true' });
      setProducts(response.data.data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchRawMaterials = async () => {
    try {
      const response = await rawMaterialsAPI.getAll({ is_active: 'true' });
      setRawMaterials(response.data.data);
    } catch (error) {
      console.error('Failed to load raw materials');
    }
  };

  const handleViewProduct = async (product: Product) => {
    setViewingProduct(product);
    setViewDialogOpen(true);
    setLoadingBatches(true);
    try {
      const response = await productionAPI.getProductBatches(product.id);
      setProductBatches(response.data.data || []);
    } catch (error) {
      console.error('Failed to load batches');
      setProductBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleOpenRecipeDialog = async (product: Product) => {
    setSelectedProductForRecipe(product);
    try {
      const response = await productionAPI.getRecipe(product.id);
      const recipes = response.data.data || [];
      setRecipeItems(recipes.map((r: any) => ({
        raw_material_id: r.raw_material_id,
        raw_material_name: r.raw_material_name,
        quantity_required: r.quantity_required,
        unit: r.unit,
      })));
    } catch (error) {
      setRecipeItems([]);
    }
    setRecipeDialogOpen(true);
  };

  const handleAddRecipeItem = () => {
    setRecipeItems([...recipeItems, { raw_material_id: 0, raw_material_name: '', quantity_required: 0, unit: 'kg' }]);
  };

  const handleRemoveRecipeItem = (index: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== index));
  };

  const handleRecipeMaterialChange = (index: number, material: any) => {
    if (!material) return;
    const newItems = [...recipeItems];
    newItems[index] = {
      ...newItems[index],
      raw_material_id: material.id,
      raw_material_name: material.name,
      unit: material.unit,
    };
    setRecipeItems(newItems);
  };

  const handleRecipeQuantityChange = (index: number, quantity: number) => {
    const newItems = [...recipeItems];
    newItems[index].quantity_required = quantity;
    setRecipeItems(newItems);
  };

  const handleSaveRecipe = async () => {
    if (!selectedProductForRecipe) return;

    const validRecipes = recipeItems.filter(r => r.raw_material_id > 0 && r.quantity_required > 0);
    
    try {
      await productionAPI.setRecipe(selectedProductForRecipe.id, { recipes: validRecipes });
      toast.success('Recipe saved successfully');
      setRecipeDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save recipe');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchProducts();
      return;
    }
    try {
      setLoading(true);
      const response = await productsAPI.search(searchQuery);
      setProducts(response.data.data);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        hsn_code: product.hsn_code || '',
        weight: product.weight?.toString() || '',
        weight_unit: product.weight_unit || 'kg',
        mrp: product.mrp?.toString() || '',
        gst_rate: product.gst_rate?.toString() || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        hsn_code: '',
        weight: '',
        weight_unit: 'kg',
        mrp: '',
        gst_rate: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async () => {
    try {
      const data = {
        name: formData.name,
        hsn_code: formData.hsn_code,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        weight_unit: formData.weight_unit,
        mrp: formData.mrp ? parseFloat(formData.mrp) : null,
        gst_rate: formData.gst_rate ? parseFloat(formData.gst_rate) : 0,
      };

      if (editingProduct) {
        await productsAPI.update(editingProduct.id, data);
        toast.success('Product updated');
      } else {
        await productsAPI.create(data);
        toast.success('Product created');
      }

      handleCloseDialog();
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this product?')) return;
    
    try {
      await productsAPI.delete(id);
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  // Responsive columns
  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Product Name', flex: 1, minWidth: isMobile ? 150 : 250 },
    { 
      field: 'weight', 
      headerName: 'Weight', 
      width: isMobile ? 70 : 100,
      valueGetter: (params) => {
        if (!params.row.weight) return '-';
        const unit = params.row.weight_unit === 'kg' ? 'KG' : params.row.weight_unit === 'g' ? 'GMS' : params.row.weight_unit?.toUpperCase();
        return `${params.row.weight} ${unit}`;
      },
    },
    ...(!isMobile ? [{ 
      field: 'hsn_code', 
      headerName: 'HSN', 
      width: 100,
      valueGetter: (params: any) => params.row.hsn_code || '-',
    }] : []),
    { 
      field: 'mrp', 
      headerName: 'MRP', 
      width: isMobile ? 70 : 100,
      valueFormatter: (params) => params.value ? `₹${params.value}` : '-',
    },
    ...(!isTablet ? [{ 
      field: 'gst_rate', 
      headerName: 'GST%', 
      width: 80,
      valueFormatter: (params: any) => params.value ? `${params.value}%` : '0%',
    }] : []),
    {
      field: 'actions',
      headerName: 'Actions',
      width: isMobile ? 80 : 160,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {isMobile ? (
            <IconButton size="small" onClick={() => handleViewProduct(params.row)} title="View">
              <ViewIcon fontSize="small" />
            </IconButton>
          ) : (
            isAdmin && (
              <>
                <IconButton size="small" onClick={() => handleOpenRecipeDialog(params.row)} title="Set Recipe" color="primary">
                  <RecipeIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleOpenDialog(params.row)} title="Edit">
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)} title="Delete">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </>
            )
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: 2 }}>
        <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold">Products</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} fullWidth={isMobile}>
            Add Product
          </Button>
        )}
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, px: { xs: 1.5, sm: 2 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size={isMobile ? "small" : "medium"}
                placeholder="Search by name or HSN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={handleSearch} size={isMobile ? "small" : "medium"}>
                      <SearchIcon />
                    </IconButton>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <DataGrid
            rows={products}
            columns={columns}
            loading={loading}
            pageSizeOptions={[15, 25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: isMobile ? 15 : 100 } },
            }}
            autoHeight
            disableRowSelectionOnClick
            sx={{
              '& .MuiDataGrid-cell': { fontSize: { xs: '0.75rem', sm: '0.875rem' } },
              '& .MuiDataGrid-columnHeaderTitle': { fontSize: { xs: '0.75rem', sm: '0.875rem' } },
            }}
          />
        </Box>
      </Card>

      {/* View Product Dialog (Mobile) */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>{viewingProduct?.name}</DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          {viewingProduct && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Weight</Typography>
                  <Typography variant="body2">{viewingProduct.weight ? `${viewingProduct.weight} ${viewingProduct.weight_unit?.toUpperCase()}` : '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">MRP</Typography>
                  <Typography variant="body2">₹{viewingProduct.mrp || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">HSN Code</Typography>
                  <Typography variant="body2">{viewingProduct.hsn_code || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">GST Rate</Typography>
                  <Typography variant="body2">{viewingProduct.gst_rate || 0}%</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Total Stock</Typography>
                  <Typography variant="body2" fontWeight="bold">{viewingProduct.stock_quantity || 0}</Typography>
                </Grid>
              </Grid>

              {/* Batch Inventory Section */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Batch Inventory
                </Typography>
                {loadingBatches ? (
                  <Typography variant="body2" color="text.secondary">Loading batches...</Typography>
                ) : productBatches.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No batches found for this product.</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Batch #</TableCell>
                          <TableCell align="center">Produced</TableCell>
                          <TableCell align="center">Remaining</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {productBatches.map((batch) => (
                          <TableRow key={batch.id}>
                            <TableCell sx={{ fontSize: '0.8rem' }}>{batch.batch_number}</TableCell>
                            <TableCell align="center">{batch.quantity_produced}</TableCell>
                            <TableCell align="center">{batch.quantity_remaining}</TableCell>
                            <TableCell>{new Date(batch.production_date).toLocaleDateString('en-IN')}</TableCell>
                            <TableCell>
                              <Chip 
                                size="small" 
                                label={batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                                color={batch.status === 'available' ? 'success' : 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>

              {isAdmin && (
                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button variant="outlined" color="primary" startIcon={<RecipeIcon />} onClick={() => { setViewDialogOpen(false); handleOpenRecipeDialog(viewingProduct); }} fullWidth>
                    Set Recipe
                  </Button>
                  <Button variant="outlined" startIcon={<EditIcon />} onClick={() => { setViewDialogOpen(false); handleOpenDialog(viewingProduct); }} fullWidth>
                    Edit Product
                  </Button>
                  <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => { handleDelete(viewingProduct.id); setViewDialogOpen(false); }} fullWidth>
                    Delete Product
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setViewDialogOpen(false)} fullWidth={isMobile}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Product Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="HSN Code"
                value={formData.hsn_code}
                onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                required
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="MRP (₹)"
                type="number"
                value={formData.mrp}
                onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                required
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="GST %"
                type="number"
                value={formData.gst_rate}
                onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                size={isMobile ? "small" : "medium"}
                inputProps={{ min: 0, max: 28 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Weight"
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={formData.weight_unit}
                  label="Unit"
                  onChange={(e) => setFormData({ ...formData, weight_unit: e.target.value })}
                >
                  <MenuItem value="kg">KG</MenuItem>
                  <MenuItem value="g">GMS</MenuItem>
                  <MenuItem value="l">L</MenuItem>
                  <MenuItem value="ml">ML</MenuItem>
                  <MenuItem value="pcs">PCS</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={handleCloseDialog} fullWidth={isMobile}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} fullWidth={isMobile}>
            {editingProduct ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Recipe Dialog */}
      <Dialog open={recipeDialogOpen} onClose={() => setRecipeDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Recipe - {selectedProductForRecipe?.name}
          {selectedProductForRecipe?.weight && (
            <Chip 
              label={`${selectedProductForRecipe.weight} ${selectedProductForRecipe.weight_unit?.toUpperCase()}`} 
              size="small" 
              sx={{ ml: 1 }} 
            />
          )}
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1.5, sm: 3 } }}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Define raw materials for one unit of this product.
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button startIcon={<AddIcon />} onClick={handleAddRecipeItem} size={isMobile ? "small" : "medium"}>
                Add Material
              </Button>
            </Box>

            {recipeItems.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                No recipe defined. Click "Add Material" to start.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Raw Material</TableCell>
                      <TableCell align="center" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Qty</TableCell>
                      {!isMobile && <TableCell align="center">Unit</TableCell>}
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recipeItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ minWidth: isMobile ? 120 : 250 }}>
                          <Autocomplete
                            options={rawMaterials}
                            getOptionLabel={(option) => `${option.name}${isMobile ? '' : ` (${option.unit})`}`}
                            value={rawMaterials.find(rm => rm.id === item.raw_material_id) || null}
                            onChange={(_, value) => handleRecipeMaterialChange(index, value)}
                            renderInput={(params) => <TextField {...params} size="small" placeholder="Select" />}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={item.quantity_required}
                            onChange={(e) => handleRecipeQuantityChange(index, parseFloat(e.target.value) || 0)}
                            sx={{ width: { xs: 60, sm: 100 } }}
                            inputProps={{ min: 0, step: 0.001, style: { textAlign: 'center' } }}
                          />
                        </TableCell>
                        {!isMobile && <TableCell align="center">{item.unit || '-'}</TableCell>}
                        <TableCell>
                          <IconButton size="small" color="error" onClick={() => handleRemoveRecipeItem(index)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={() => setRecipeDialogOpen(false)} fullWidth={isMobile}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRecipe} fullWidth={isMobile}>
            Save Recipe
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Products;
