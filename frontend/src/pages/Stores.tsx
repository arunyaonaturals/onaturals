import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, IconButton, Grid, FormControl, InputLabel, Select, MenuItem, Chip,
  useTheme, useMediaQuery,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { storesAPI, areasAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const Stores: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [stores, setStores] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingStore, setViewingStore] = useState<any>(null);
  const { isAdmin, isSalesCaptain } = useAuth();

  const [formData, setFormData] = useState({
    name: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', gst_number: '', contact_person: '', area_id: '',
  });

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [totalRows, setTotalRows] = useState(0);

  useEffect(() => { fetchStores(); fetchAreas(); }, [paginationModel]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await storesAPI.getAll({
        is_active: 'true',
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize
      });
      setStores(response.data.data);
      setTotalRows(response.data.pagination?.total || response.data.data.length);
    } catch (error) { toast.error('Failed to load stores'); } finally { setLoading(false); }
  };

  const fetchAreas = async () => {
    try { const response = await areasAPI.getAll(); setAreas(response.data.data); } catch (error) { }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { fetchStores(); return; }
    try {
      setLoading(true);
      const response = await storesAPI.search(searchQuery);
      setStores(response.data.data);
      setTotalRows(response.data.data.length);
    } catch (error) { toast.error('Search failed'); } finally { setLoading(false); }
  };

  const handleViewStore = (store: any) => {
    setViewingStore(store);
    setViewDialogOpen(true);
  };

  const handleOpenDialog = (store?: any) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name, address: store.address, city: store.city || '', state: store.state || '',
        pincode: store.pincode || '', phone: store.phone || '', email: store.email || '',
        gst_number: store.gst_number || '', contact_person: store.contact_person || '', area_id: store.area_id?.toString() || '',
      });
    } else {
      setEditingStore(null);
      setFormData({ name: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', gst_number: '', contact_person: '', area_id: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const data = { ...formData, area_id: formData.area_id ? parseInt(formData.area_id) : null };
      if (editingStore) { await storesAPI.update(editingStore.id, data); toast.success('Store updated'); }
      else { await storesAPI.create(data); toast.success('Store created'); }
      setDialogOpen(false); fetchStores();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Operation failed'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deactivate this store?')) return;
    try { await storesAPI.delete(id); toast.success('Store deactivated'); fetchStores(); }
    catch (error) { toast.error('Failed to deactivate'); }
  };

  // Responsive columns
  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Store Name', flex: 1, minWidth: isMobile ? 120 : 180 },
    ...(!isMobile ? [{ field: 'address', headerName: 'Address', flex: 1, minWidth: 200 }] : []),
    { field: 'city', headerName: 'City', width: isMobile ? 80 : 120 },
    ...(!isTablet ? [{ field: 'gst_number', headerName: 'GST', width: 150 }] : []),
    ...(!isMobile ? [{ field: 'phone', headerName: 'Phone', width: 130 }] : []),
    {
      field: 'is_active',
      headerName: 'Status',
      width: isMobile ? 70 : 100,
      renderCell: (params) => <Chip label={params.value ? 'Active' : 'Inactive'} color={params.value ? 'success' : 'default'} size="small" sx={{ fontSize: { xs: '0.65rem', sm: '0.8125rem' } }} />
    },
    {
      field: 'actions', headerName: 'Actions', width: isMobile ? 60 : 120, sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {isMobile ? (
            <IconButton size="small" onClick={() => handleViewStore(params.row)}>
              <ViewIcon fontSize="small" />
            </IconButton>
          ) : (
            <>
              {isSalesCaptain && <IconButton size="small" onClick={() => handleOpenDialog(params.row)} title="Edit"><EditIcon fontSize="small" /></IconButton>}
              {isAdmin && <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)} title="Deactivate"><DeleteIcon fontSize="small" /></IconButton>}
            </>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: 2 }}>
        <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold">Stores</Typography>
        {isSalesCaptain && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} fullWidth={isMobile}>
            Add Store
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
                placeholder="Search stores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{ endAdornment: <IconButton onClick={handleSearch} size={isMobile ? "small" : "medium"}><SearchIcon /></IconButton> }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <DataGrid
            rows={stores}
            columns={columns}
            loading={loading}
            rowCount={totalRows}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50]}
            autoHeight
            disableRowSelectionOnClick
            sx={{
              '& .MuiDataGrid-cell': { fontSize: { xs: '0.75rem', sm: '0.875rem' } },
              '& .MuiDataGrid-columnHeaderTitle': { fontSize: { xs: '0.75rem', sm: '0.875rem' } },
            }}
          />
        </Box>
      </Card>

      {/* View Store Dialog (Mobile) */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{viewingStore?.name}</DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          {viewingStore && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Address</Typography>
                  <Typography variant="body2">{viewingStore.address || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">City</Typography>
                  <Typography variant="body2">{viewingStore.city || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">State</Typography>
                  <Typography variant="body2">{viewingStore.state || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Phone</Typography>
                  <Typography variant="body2">{viewingStore.phone || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2">{viewingStore.email || '-'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">GST Number</Typography>
                  <Typography variant="body2">{viewingStore.gst_number || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Contact Person</Typography>
                  <Typography variant="body2">{viewingStore.contact_person || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box><Chip label={viewingStore.is_active ? 'Active' : 'Inactive'} color={viewingStore.is_active ? 'success' : 'default'} size="small" /></Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {isSalesCaptain && (
                  <Button variant="outlined" startIcon={<EditIcon />} onClick={() => { setViewDialogOpen(false); handleOpenDialog(viewingStore); }} fullWidth>
                    Edit Store
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => { handleDelete(viewingStore.id); setViewDialogOpen(false); }} fullWidth>
                    Deactivate Store
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setViewDialogOpen(false)} fullWidth>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Store Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>{editingStore ? 'Edit Store' : 'Add Store'}</DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Store Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required size={isMobile ? "small" : "medium"} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>Area</InputLabel>
                <Select value={formData.area_id} label="Area" onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}>
                  <MenuItem value="">None</MenuItem>
                  {areas.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required multiline rows={2} size={isMobile ? "small" : "medium"} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth label="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} size={isMobile ? "small" : "medium"} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth label="State" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} size={isMobile ? "small" : "medium"} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth label="Pincode" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} size={isMobile ? "small" : "medium"} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth label="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} size={isMobile ? "small" : "medium"} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth label="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} size={isMobile ? "small" : "medium"} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth label="GST Number" value={formData.gst_number} onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })} size={isMobile ? "small" : "medium"} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Contact Person" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} size={isMobile ? "small" : "medium"} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} fullWidth={isMobile}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} fullWidth={isMobile}>{editingStore ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Stores;
