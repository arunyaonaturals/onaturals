import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, IconButton, Grid, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { areasAPI, usersAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const Areas: React.FC = () => {
  const [areas, setAreas] = useState<any[]>([]);
  const [salesCaptains, setSalesCaptains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<any>(null);
  const { isAdmin } = useAuth();
  const [formData, setFormData] = useState({ name: '', description: '', sales_captain_id: '' });

  useEffect(() => {
    fetchAreas();
    fetchSalesCaptains();
  }, []);

  const fetchAreas = async () => {
    try {
      const response = await areasAPI.getAll();
      setAreas(response.data.data);
    } catch (error) {
      toast.error('Failed to load areas');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesCaptains = async () => {
    try {
      const response = await usersAPI.getSalesCaptains();
      setSalesCaptains(response.data.data);
    } catch (error) {
      console.error('Failed to load sales captains');
    }
  };

  const handleOpenDialog = (area?: any) => {
    if (area) {
      setEditingArea(area);
      setFormData({ name: area.name, description: area.description || '', sales_captain_id: area.sales_captain_id?.toString() || '' });
    } else {
      setEditingArea(null);
      setFormData({ name: '', description: '', sales_captain_id: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const data = { ...formData, sales_captain_id: formData.sales_captain_id ? parseInt(formData.sales_captain_id) : null };
      if (editingArea) {
        await areasAPI.update(editingArea.id, data);
        toast.success('Area updated');
      } else {
        await areasAPI.create(data);
        toast.success('Area created');
      }
      setDialogOpen(false);
      fetchAreas();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this area?')) return;
    try {
      await areasAPI.delete(id);
      toast.success('Area deleted');
      fetchAreas();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Area Name', flex: 1, minWidth: 150 },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 200 },
    { field: 'sales_captain_name', headerName: 'Sales Captain', width: 150 },
    { field: 'store_count', headerName: 'Stores', width: 100 },
    {
      field: 'actions', headerName: 'Actions', width: 120, sortable: false,
      renderCell: (params) => isAdmin && (
        <Box>
          <IconButton size="small" onClick={() => handleOpenDialog(params.row)}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Areas</Typography>
        {isAdmin && <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>Add Area</Button>}
      </Box>
      <Card>
        <DataGrid rows={areas} columns={columns} loading={loading} pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} autoHeight disableRowSelectionOnClick />
      </Card>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingArea ? 'Edit Area' : 'Add Area'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Area Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} multiline rows={2} /></Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Sales Captain</InputLabel>
                <Select value={formData.sales_captain_id} label="Sales Captain" onChange={(e) => setFormData({ ...formData, sales_captain_id: e.target.value })}>
                  <MenuItem value="">None</MenuItem>
                  {salesCaptains.map((sc) => <MenuItem key={sc.id} value={sc.id}>{sc.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>{editingArea ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Areas;
