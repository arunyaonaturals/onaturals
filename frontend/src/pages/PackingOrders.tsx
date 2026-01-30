import React, { useState, useEffect } from 'react';
import { Box, Button, Card, Typography, Chip, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { packingAPI } from '../services/api';
import { toast } from 'react-toastify';

const PackingOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try { const response = await packingAPI.getAll(); setOrders(response.data.data); }
    catch (error) { toast.error('Failed to load packing orders'); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try { await packingAPI.updateStatus(id, status); toast.success('Status updated'); fetchOrders(); }
    catch (error) { toast.error('Failed to update status'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'completed': return 'success'; case 'in_progress': return 'info'; case 'pending': return 'warning'; default: return 'default'; }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'invoice_number', headerName: 'Invoice #', width: 130 },
    { field: 'store_name', headerName: 'Store', flex: 1, minWidth: 180 },
    { field: 'priority', headerName: 'Priority', width: 100, renderCell: (params) => <Chip label={`P${params.value}`} color={params.value >= 5 ? 'error' : 'default'} size="small" /> },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (params) => <Chip label={params.value} color={getStatusColor(params.value)} size="small" /> },
    { field: 'created_by_name', headerName: 'Created By', width: 130 },
    { field: 'created_at', headerName: 'Date', width: 120, valueFormatter: (params) => new Date(params.value).toLocaleDateString('en-IN') },
    {
      field: 'actions', headerName: 'Update Status', width: 150, sortable: false,
      renderCell: (params) => (
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={params.row.status} onChange={(e) => handleStatusChange(params.row.id, e.target.value)}>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
          </Select>
        </FormControl>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>Packing Orders</Typography>
      <Card><DataGrid rows={orders} columns={columns} loading={loading} pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} autoHeight disableRowSelectionOnClick /></Card>
    </Box>
  );
};

export default PackingOrders;
