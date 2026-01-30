import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Button, Card, CardContent, Typography, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Chip, FormControl, InputLabel,
  Select, MenuItem, Avatar, Alert, Tab, Tabs, useTheme, useMediaQuery,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon,
  PhotoCamera as PhotoIcon, Person as PersonIcon,
} from '@mui/icons-material';
import { staffAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

interface Staff {
  id: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  aadhar_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  photo_url: string;
  role: string;
  date_of_joining: string;
  salary: number;
  bank_account_number: string;
  bank_name: string;
  ifsc_code: string;
  user_id: number;
  is_active: number;
  notes: string;
}

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

const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'sales_captain', label: 'Sales Captain' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'hr', label: 'HR' },
  { value: 'helper', label: 'Helper' },
  { value: 'driver', label: 'Driver' },
  { value: 'packing_staff', label: 'Packing Staff' },
];

const Staff: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);
  const [photoUploadStaffId, setPhotoUploadStaffId] = useState<number | null>(null);
  const [stats, setStats] = useState<any>(null);
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    aadhar_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    role: '',
    date_of_joining: '',
    salary: '',
    bank_account_number: '',
    bank_name: '',
    ifsc_code: '',
    notes: '',
  });

  useEffect(() => {
    fetchStaff();
    fetchStats();
  }, [roleFilter]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const params: any = { is_active: 'true' };
      if (roleFilter) params.role = roleFilter;
      const response = await staffAPI.getAll(params);
      setStaffList(response.data.data);
    } catch (error) {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await staffAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const handleOpenDialog = (staff?: Staff) => {
    if (staff) {
      setEditingStaff(staff);
      setFormData({
        name: staff.name || '',
        phone: staff.phone || '',
        address: staff.address || '',
        city: staff.city || '',
        state: staff.state || '',
        pincode: staff.pincode || '',
        aadhar_number: staff.aadhar_number || '',
        emergency_contact_name: staff.emergency_contact_name || '',
        emergency_contact_phone: staff.emergency_contact_phone || '',
        role: staff.role || '',
        date_of_joining: staff.date_of_joining || '',
        salary: staff.salary?.toString() || '',
        bank_account_number: staff.bank_account_number || '',
        bank_name: staff.bank_name || '',
        ifsc_code: staff.ifsc_code || '',
        notes: staff.notes || '',
      });
    } else {
      setEditingStaff(null);
      setFormData({
        name: '', phone: '', address: '', city: '', state: '', pincode: '',
        aadhar_number: '', emergency_contact_name: '', emergency_contact_phone: '',
        role: '', date_of_joining: '', salary: '', bank_account_number: '',
        bank_name: '', ifsc_code: '', notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStaff(null);
  };

  const handleViewStaff = (staff: Staff) => {
    setViewingStaff(staff);
    setViewDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.role) {
      toast.error('Name, phone, and role are required');
      return;
    }

    try {
      const data = {
        ...formData,
        salary: formData.salary ? parseFloat(formData.salary) : null,
      };

      if (editingStaff) {
        await staffAPI.update(editingStaff.id, data);
        toast.success('Staff member updated successfully');
      } else {
        await staffAPI.create(data);
        toast.success('Staff member added successfully');
      }
      handleCloseDialog();
      fetchStaff();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate this staff member?')) return;
    try {
      await staffAPI.delete(id);
      toast.success('Staff member deactivated');
      fetchStaff();
      fetchStats();
    } catch (error) {
      toast.error('Failed to deactivate staff member');
    }
  };

  const handlePhotoUpload = (staffId: number) => {
    setPhotoUploadStaffId(staffId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !photoUploadStaffId) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      await staffAPI.uploadPhoto(photoUploadStaffId, formData);
      toast.success('Photo uploaded successfully');
      fetchStaff();
      if (viewingStaff && viewingStaff.id === photoUploadStaffId) {
        const response = await staffAPI.getById(photoUploadStaffId);
        setViewingStaff(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to upload photo');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setPhotoUploadStaffId(null);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'error';
      case 'sales_captain': return 'success';
      case 'accountant': return 'primary';
      case 'hr': return 'secondary';
      case 'driver': return 'info';
      case 'packing_staff': return 'warning';
      default: return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    const found = ROLES.find(r => r.value === role);
    return found ? found.label : role;
  };

  const columns: GridColDef[] = [
    {
      field: 'photo',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (params) => (
        <Avatar
          src={params.row.photo_url ? `${process.env.REACT_APP_API_URL?.replace('/api', '')}${params.row.photo_url}` : undefined}
          sx={{ width: 40, height: 40 }}
        >
          {params.row.name?.charAt(0).toUpperCase()}
        </Avatar>
      ),
    },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'phone', headerName: 'Phone', width: isMobile ? 100 : 130 },
    ...(!isMobile ? [{
      field: 'role',
      headerName: 'Role',
      width: 130,
      renderCell: (params: any) => (
        <Chip
          label={getRoleLabel(params.value)}
          color={getRoleColor(params.value) as any}
          size="small"
        />
      ),
    }] : []),
    ...(!isTablet ? [{ field: 'city', headerName: 'City', width: 120 }] : []),
    ...(!isTablet ? [{
      field: 'date_of_joining',
      headerName: 'Joined',
      width: 110,
      valueFormatter: (params: any) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-',
    }] : []),
    {
      field: 'actions',
      headerName: 'Actions',
      width: isMobile ? 100 : 150,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={() => handleViewStaff(params.row)} title="View">
            <ViewIcon fontSize="small" />
          </IconButton>
          {isAdmin && (
            <>
              <IconButton size="small" onClick={() => handleOpenDialog(params.row)} title="Edit" color="primary">
                <EditIcon fontSize="small" />
              </IconButton>
              {!isMobile && (
                <IconButton size="small" onClick={() => handleDelete(params.row.id)} title="Delete" color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold">Staff Management</Typography>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            fullWidth={isMobile}
          >
            Add Staff
          </Button>
        )}
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={4} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: { xs: 1.5, sm: 2 } }}>
                <Typography variant="caption" color="text.secondary">Total</Typography>
                <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold">{stats.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          {stats.by_role?.slice(0, isMobile ? 3 : 5).map((item: any) => (
            <Grid item xs={6} sm={4} md={2} key={item.role}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: { xs: 1.5, sm: 2 } }}>
                  <Typography variant="caption" color="text.secondary">{getRoleLabel(item.role)}</Typography>
                  <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold">{item.count}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filter */}
      <Box sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter by Role</InputLabel>
          <Select
            value={roleFilter}
            label="Filter by Role"
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <MenuItem value="">All Roles</MenuItem>
            {ROLES.map(role => (
              <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Staff List */}
      <Card>
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <DataGrid
            rows={staffList}
            columns={columns}
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

      {/* Hidden file input for photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* View Staff Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={viewingStaff?.photo_url ? `${process.env.REACT_APP_API_URL?.replace('/api', '')}${viewingStaff.photo_url}` : undefined}
              sx={{ width: 60, height: 60 }}
            >
              {viewingStaff?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6">{viewingStaff?.name}</Typography>
              {viewingStaff && (
                <Chip label={getRoleLabel(viewingStaff.role)} color={getRoleColor(viewingStaff.role) as any} size="small" />
              )}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewingStaff && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Phone</Typography>
                  <Typography variant="body1">{viewingStaff.phone || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Aadhar Number</Typography>
                  <Typography variant="body1">{viewingStaff.aadhar_number || '-'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Address</Typography>
                  <Typography variant="body1">
                    {[viewingStaff.address, viewingStaff.city, viewingStaff.state, viewingStaff.pincode].filter(Boolean).join(', ') || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Emergency Contact</Typography>
                  <Typography variant="body1">
                    {viewingStaff.emergency_contact_name ? `${viewingStaff.emergency_contact_name} - ${viewingStaff.emergency_contact_phone}` : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Date of Joining</Typography>
                  <Typography variant="body1">
                    {viewingStaff.date_of_joining ? new Date(viewingStaff.date_of_joining).toLocaleDateString('en-IN') : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Salary</Typography>
                  <Typography variant="body1">
                    {viewingStaff.salary ? `₹${viewingStaff.salary.toLocaleString('en-IN')}` : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Bank Details</Typography>
                  <Typography variant="body1">
                    {viewingStaff.bank_name ? `${viewingStaff.bank_name} - ${viewingStaff.bank_account_number}` : '-'}
                  </Typography>
                </Grid>
                {viewingStaff.notes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                    <Typography variant="body1">{viewingStaff.notes}</Typography>
                  </Grid>
                )}
              </Grid>

              {isAdmin && (
                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<PhotoIcon />}
                    onClick={() => handlePhotoUpload(viewingStaff.id)}
                    fullWidth
                  >
                    {viewingStaff.photo_url ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => { setViewDialogOpen(false); handleOpenDialog(viewingStaff); }}
                    fullWidth
                  >
                    Edit Details
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => { handleDelete(viewingStaff.id); setViewDialogOpen(false); }}
                    fullWidth
                  >
                    Deactivate
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

      {/* Add/Edit Staff Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Basic Info */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom>Basic Information</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required size={isMobile ? "small" : "medium"}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {ROLES.map(role => (
                    <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Aadhar Card Number"
                value={formData.aadhar_number}
                onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>

            {/* Address */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 1 }}>Address</Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                multiline
                rows={2}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                label="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Pincode"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>

            {/* Emergency Contact */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 1 }}>Emergency Contact</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Name"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Phone"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>

            {/* Employment Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 1 }}>Employment Details</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Joining"
                type="date"
                value={formData.date_of_joining}
                onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                InputLabelProps={{ shrink: true }}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Salary (₹)"
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>

            {/* Bank Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 1 }}>Bank Details</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Bank Name"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Account Number"
                value={formData.bank_account_number}
                onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="IFSC Code"
                value={formData.ifsc_code}
                onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={2}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={handleCloseDialog} fullWidth={isMobile}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} fullWidth={isMobile}>
            {editingStaff ? 'Update' : 'Add Staff'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Staff;
