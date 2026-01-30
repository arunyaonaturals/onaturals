import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Tab, Tabs, Table, TableHead, TableBody,
  TableRow, TableCell, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, IconButton, Chip,
  Switch, FormControlLabel, Divider, Alert, List, ListItem, ListItemText, ListItemIcon,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon,
  Storage as StorageIcon, Code as CodeIcon, Info as InfoIcon, People as PeopleIcon,
  Settings as SettingsIcon, Business as BusinessIcon, Security as SecurityIcon,
} from '@mui/icons-material';
import { usersAPI, reportsAPI } from '../services/api';
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
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  phone: string;
  role: string;
  is_active: number;
  created_at: string;
}

const APP_VERSION = '1.0.0';
const RELEASE_DATE = '2026-01-28';

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [thresholds, setThresholds] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff',
    is_active: true,
  });
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchThresholds();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchThresholds = async () => {
    try {
      const response = await reportsAPI.getClassificationThresholds();
      setThresholds(response.data.data);
    } catch (error) {
      console.error('Failed to load thresholds');
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        name: user.name,
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        role: user.role,
        is_active: user.is_active === 1,
      });
    } else {
      setEditingUser(null);
      setFormData({ username: '', name: '', email: '', phone: '', password: '', role: 'staff', is_active: true });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.username.trim()) {
        toast.error('Username is required');
        return;
      }
      if (!formData.name.trim()) {
        toast.error('Name is required');
        return;
      }
      
      const data = {
        ...formData,
        username: formData.username.toLowerCase().trim(),
        name: formData.name.trim(),
        is_active: formData.is_active ? 1 : 0,
      };
      
      if (editingUser) {
        if (!data.password) delete (data as any).password;
        await usersAPI.update(editingUser.id, data);
        toast.success('User updated successfully');
      } else {
        if (!data.password) {
          toast.error('Password is required for new users');
          return;
        }
        await usersAPI.create(data);
        toast.success('User created successfully');
      }
      handleCloseDialog();
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await usersAPI.delete(id);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleSaveThresholds = async () => {
    try {
      await reportsAPI.updateClassificationThresholds(thresholds);
      toast.success('Thresholds updated successfully');
    } catch (error) {
      toast.error('Failed to update thresholds');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'accountant': return 'primary';
      case 'sales_captain': return 'success';
      case 'packing': return 'warning';
      default: return 'default';
    }
  };

  const userColumns: GridColDef[] = [
    { field: 'username', headerName: 'Username', width: 130 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'phone', headerName: 'Phone', width: 130 },
    {
      field: 'role',
      headerName: 'Role',
      width: 130,
      renderCell: (params) => (
        <Chip label={params.value?.replace('_', ' ').toUpperCase()} color={getRoleColor(params.value) as any} size="small" />
      ),
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value ? 'Active' : 'Inactive'} color={params.value ? 'success' : 'default'} size="small" variant="outlined" />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => handleOpenDialog(params.row)} color="primary">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleDelete(params.row.id)} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You don't have permission to access settings.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Settings</Typography>
      </Box>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab icon={<PeopleIcon />} label="Users" iconPosition="start" />
            <Tab icon={<BusinessIcon />} label="Business" iconPosition="start" />
            <Tab icon={<InfoIcon />} label="System Info" iconPosition="start" />
          </Tabs>
        </Box>

        {/* Users Tab */}
        <TabPanel value={tabValue} index={0}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">User Management</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                Add User
              </Button>
            </Box>
            <DataGrid
              rows={users}
              columns={userColumns}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              autoHeight
              disableRowSelectionOnClick
            />
          </CardContent>
        </TabPanel>

        {/* Business Settings Tab */}
        <TabPanel value={tabValue} index={1}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Store Classification Thresholds</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure how stores are classified based on their monthly sales volume.
            </Typography>
            
            {thresholds && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="High Volume Minimum (INR)"
                    type="number"
                    value={thresholds.high_volume_min || ''}
                    onChange={(e) => setThresholds({ ...thresholds, high_volume_min: parseFloat(e.target.value) })}
                    helperText="Stores with sales >= this amount are High Volume"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Medium Volume Minimum (INR)"
                    type="number"
                    value={thresholds.medium_volume_min || ''}
                    onChange={(e) => setThresholds({ ...thresholds, medium_volume_min: parseFloat(e.target.value) })}
                    helperText="Stores with sales >= this amount are Medium Volume"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Calculation Period (Days)"
                    type="number"
                    value={thresholds.period_days || ''}
                    onChange={(e) => setThresholds({ ...thresholds, period_days: parseInt(e.target.value) })}
                    helperText="Days to look back for sales calculation"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" onClick={handleSaveThresholds}>
                    Save Thresholds
                  </Button>
                </Grid>
              </Grid>
            )}

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" gutterBottom>Classification Summary</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>High Volume:</strong> Sales &ge; {formatCurrency(thresholds?.high_volume_min || 100000)} per {thresholds?.period_days || 30} days
              </Typography>
              <Typography variant="body2">
                <strong>Medium Volume:</strong> Sales &ge; {formatCurrency(thresholds?.medium_volume_min || 50000)} per {thresholds?.period_days || 30} days
              </Typography>
              <Typography variant="body2">
                <strong>Low Volume:</strong> Sales &lt; {formatCurrency(thresholds?.medium_volume_min || 50000)} per {thresholds?.period_days || 30} days
              </Typography>
            </Alert>
          </CardContent>
        </TabPanel>

        {/* System Info Tab */}
        <TabPanel value={tabValue} index={2}>
          <CardContent>
            <Grid container spacing={4}>
              {/* Application Info */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <InfoIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Application</Typography>
                    </Box>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="Application Name" secondary="Arunya ERP" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Version" secondary={APP_VERSION} />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Release Date" secondary={RELEASE_DATE} />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Environment" secondary={process.env.NODE_ENV || 'development'} />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Frontend Info */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CodeIcon sx={{ mr: 1, color: 'info.main' }} />
                      <Typography variant="h6">Frontend</Typography>
                    </Box>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="Framework" secondary="React 18.x" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="UI Library" secondary="Material-UI (MUI) v5" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Language" secondary="TypeScript" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="State Management" secondary="React Context API" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Routing" secondary="React Router v6" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="HTTP Client" secondary="Axios" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Backend Info */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <StorageIcon sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="h6">Backend</Typography>
                    </Box>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="Runtime" secondary="Node.js" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Framework" secondary="Express.js" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Language" secondary="TypeScript" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Database" secondary="SQLite (sql.js)" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Authentication" secondary="JWT (JSON Web Tokens)" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="PDF Generation" secondary="PDFKit" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Security Info */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <SecurityIcon sx={{ mr: 1, color: 'warning.main' }} />
                      <Typography variant="h6">Security</Typography>
                    </Box>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="Password Hashing" secondary="bcrypt" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Token Type" secondary="JWT with expiration" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Role-Based Access" secondary="Admin, Accountant, Sales Captain, Packing, Staff" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="API Protection" secondary="Authentication middleware" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Features Summary */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <SettingsIcon sx={{ mr: 1, color: 'secondary.main' }} />
                      <Typography variant="h6">Modules</Typography>
                    </Box>
                    <Grid container spacing={2}>
                      {[
                        { name: 'Products & Categories', status: 'active' },
                        { name: 'Sales & Invoicing', status: 'active' },
                        { name: 'Order Management', status: 'active' },
                        { name: 'Payment Collection', status: 'active' },
                        { name: 'Store Classification', status: 'active' },
                        { name: 'Purchase & Vendors', status: 'active' },
                        { name: 'Raw Materials', status: 'active' },
                        { name: 'Production', status: 'active' },
                        { name: 'Packing Orders', status: 'active' },
                        { name: 'Dispatch Management', status: 'active' },
                        { name: 'Attendance', status: 'active' },
                        { name: 'Salary Management', status: 'active' },
                        { name: 'Reports & Analytics', status: 'active' },
                        { name: 'User Management', status: 'active' },
                      ].map((module) => (
                        <Grid item xs={6} sm={4} md={3} key={module.name}>
                          <Chip
                            label={module.name}
                            color={module.status === 'active' ? 'success' : 'default'}
                            variant="outlined"
                            size="small"
                            sx={{ width: '100%' }}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>
      </Card>

      {/* User Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
              required
              helperText="Used for login (lowercase only)"
              disabled={!!editingUser}
            />
            <TextField
              fullWidth
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Email (optional)"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextField
              fullWidth
              label={editingUser ? 'Password (leave blank to keep current)' : 'Password'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="accountant">Accountant</MenuItem>
                <MenuItem value="sales_captain">Sales Captain</MenuItem>
                <MenuItem value="staff">Staff</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
