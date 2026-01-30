import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, IconButton, Grid, Chip, Divider,
  useTheme, useMediaQuery,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { vendorsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const Vendors: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [viewingVendor, setViewingVendor] = useState<any>(null);
  const { isAdmin } = useAuth();
  const [formData, setFormData] = useState({ name: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', gst_number: '', contact_person: '', payment_days: '0' });

  useEffect(() => { fetchVendors(); }, []);

  const fetchVendors = async () => {
    try { const response = await vendorsAPI.getAll({ is_active: 'true' }); setVendors(response.data.data); } 
    catch (error) { toast.error('Failed to load vendors'); } 
    finally { setLoading(false); }
  };

  const handleOpenDialog = (vendor?: any) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({ name: vendor.name, address: vendor.address || '', city: vendor.city || '', state: vendor.state || '', pincode: vendor.pincode || '', phone: vendor.phone || '', email: vendor.email || '', gst_number: vendor.gst_number || '', contact_person: vendor.contact_person || '', payment_days: vendor.payment_days?.toString() || '0' });
    } else {
      setEditingVendor(null);
      setFormData({ name: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', gst_number: '', contact_person: '', payment_days: '0' });
    }
    setDialogOpen(true);
  };

  const handleViewVendor = (vendor: any) => {
    setViewingVendor(vendor);
    setViewDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const data = { ...formData, payment_days: parseInt(formData.payment_days) || 0 };
      if (editingVendor) { await vendorsAPI.update(editingVendor.id, data); toast.success('Vendor updated'); }
      else { await vendorsAPI.create(data); toast.success('Vendor created'); }
      setDialogOpen(false); fetchVendors();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Operation failed'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this vendor?')) return;
    try { await vendorsAPI.delete(id); toast.success('Vendor deleted'); fetchVendors(); }
    catch (error) { toast.error('Failed to delete vendor'); }
  };

  // Responsive columns
  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Vendor Name', flex: 1, minWidth: isMobile ? 120 : 180 },
    { field: 'city', headerName: 'City', width: isMobile ? 80 : 120 },
    ...(!isTablet ? [{ field: 'gst_number', headerName: 'GST', width: 160 }] : []),
    ...(!isMobile ? [{ field: 'phone', headerName: 'Phone', width: 130 }] : []),
    ...(!isTablet ? [{ field: 'payment_days', headerName: 'Payment Days', width: 120 }] : []),
    ...(!isMobile ? [{ field: 'contact_person', headerName: 'Contact', width: 130 }] : []),
    { field: 'is_active', headerName: 'Status', width: isMobile ? 70 : 100, renderCell: (params) => <Chip label={params.value ? 'Active' : 'Inactive'} color={params.value ? 'success' : 'default'} size="small" sx={{ fontSize: { xs: '0.65rem', sm: '0.8125rem' } }} /> },
    {
      field: 'actions', headerName: 'Actions', width: isMobile ? 60 : 150, sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={() => handleViewVendor(params.row)} title="View">
            <ViewIcon fontSize="small" />
          </IconButton>
          {!isMobile && isAdmin && (
            <>
              <IconButton size="small" onClick={() => handleOpenDialog(params.row)} title="Edit" color="primary">
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)} title="Delete">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: 2 }}>
        <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold">Vendors</Typography>
        {isAdmin && <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} fullWidth={isMobile}>Add Vendor</Button>}
      </Box>
      
      <Card>
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <DataGrid 
            rows={vendors} 
            columns={columns} 
            loading={loading} 
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
      
      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Vendor Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required size={isMobile ? "small" : "medium"} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Payment Days" type="number" value={formData.payment_days} onChange={(e) => setFormData({ ...formData, payment_days: e.target.value })} helperText="Days after receipt" size={isMobile ? "small" : "medium"} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} multiline rows={2} size={isMobile ? "small" : "medium"} />
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
          <Button variant="contained" onClick={handleSubmit} fullWidth={isMobile}>{editingVendor ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      {/* View Vendor Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Vendor Details</DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          {viewingVendor && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6">{viewingVendor.name}</Typography>
                  <Chip label={viewingVendor.is_active ? 'Active' : 'Inactive'} color={viewingVendor.is_active ? 'success' : 'default'} size="small" sx={{ mt: 1 }} />
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Contact Person</Typography>
                  <Typography variant="body2">{viewingVendor.contact_person || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Phone</Typography>
                  <Typography variant="body2">{viewingVendor.phone || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2">{viewingVendor.email || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">GST Number</Typography>
                  <Typography variant="body2">{viewingVendor.gst_number || '-'}</Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Address</Typography>
                  <Typography variant="body2">{viewingVendor.address || '-'}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">City</Typography>
                  <Typography variant="body2">{viewingVendor.city || '-'}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">State</Typography>
                  <Typography variant="body2">{viewingVendor.state || '-'}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Pincode</Typography>
                  <Typography variant="body2">{viewingVendor.pincode || '-'}</Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Payment Terms</Typography>
                  <Typography variant="body2">{viewingVendor.payment_days || 0} days</Typography>
                </Grid>
              </Grid>

              {/* Mobile action buttons */}
              {isMobile && isAdmin && (
                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button variant="outlined" startIcon={<EditIcon />} onClick={() => { setViewDialogOpen(false); handleOpenDialog(viewingVendor); }} fullWidth>
                    Edit Vendor
                  </Button>
                  <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => { handleDelete(viewingVendor.id); setViewDialogOpen(false); }} fullWidth>
                    Delete Vendor
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={() => setViewDialogOpen(false)} fullWidth={isMobile}>Close</Button>
          {!isMobile && isAdmin && (
            <Button variant="contained" onClick={() => { setViewDialogOpen(false); handleOpenDialog(viewingVendor); }}>
              Edit Vendor
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Vendors;
