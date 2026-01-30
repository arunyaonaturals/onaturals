import React, { useState, useEffect } from 'react';
import { 
  Box, Card, CardContent, Typography, Chip, Grid, FormControl, InputLabel, Select, MenuItem, Tab, Tabs,
  useTheme, useMediaQuery,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { dispatchAPI } from '../services/api';
import { toast } from 'react-toastify';

const Dispatches: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [smallOrders, setSmallOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => { fetchDispatches(); fetchSmallOrders(); }, []);

  const fetchDispatches = async () => {
    try { const response = await dispatchAPI.getAll(); setDispatches(response.data.data); }
    catch (error) { toast.error('Failed to load dispatches'); }
    finally { setLoading(false); }
  };

  const fetchSmallOrders = async () => {
    try { const response = await dispatchAPI.getSmallOrders(); setSmallOrders(response.data.data); }
    catch (error) { console.error('Failed to load small orders'); }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try { await dispatchAPI.updateStatus(id, status); toast.success('Status updated'); fetchDispatches(); }
    catch (error) { toast.error('Failed to update status'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'delivered': return 'success'; case 'in_transit': return 'info'; case 'ready': return 'primary'; case 'pending': return 'warning'; default: return 'default'; }
  };

  // Responsive columns
  const columns: GridColDef[] = [
    { field: 'invoice_number', headerName: 'Invoice #', width: isMobile ? 90 : 130 },
    { field: 'store_name', headerName: 'Store', flex: 1, minWidth: isMobile ? 100 : 180 },
    ...(!isTablet ? [{ field: 'area_name', headerName: 'Area', width: 120 }] : []),
    ...(!isMobile ? [{ field: 'priority', headerName: 'Priority', width: 80, renderCell: (params: any) => <Chip label={`P${params.value}`} color={params.value >= 5 ? 'error' : 'default'} size="small" /> }] : []),
    { field: 'status', headerName: 'Status', width: isMobile ? 90 : 120, renderCell: (params) => <Chip label={params.value} color={getStatusColor(params.value)} size="small" sx={{ fontSize: { xs: '0.65rem', sm: '0.8125rem' } }} /> },
    ...(!isMobile ? [{ field: 'created_at', headerName: 'Date', width: 110, valueFormatter: (params: any) => new Date(params.value).toLocaleDateString('en-IN') }] : []),
    {
      field: 'actions', headerName: 'Update', width: isMobile ? 100 : 150, sortable: false,
      renderCell: (params) => (
        <FormControl size="small" sx={{ minWidth: isMobile ? 80 : 120 }}>
          <Select 
            value={params.row.status} 
            onChange={(e) => handleStatusChange(params.row.id, e.target.value)}
            sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
          >
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="ready">Ready</MenuItem>
            <MenuItem value="in_transit">In Transit</MenuItem>
            <MenuItem value="delivered">Delivered</MenuItem>
          </Select>
        </FormControl>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" gutterBottom>Dispatches</Typography>
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={4}>
          <Card>
            <CardContent sx={{ py: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
              <Typography color="text.secondary" variant={isMobile ? "caption" : "body2"}>Pending</Typography>
              <Typography variant={isMobile ? "h5" : "h4"}>{dispatches.filter(d => d.status === 'pending').length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent sx={{ py: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
              <Typography color="text.secondary" variant={isMobile ? "caption" : "body2"}>In Transit</Typography>
              <Typography variant={isMobile ? "h5" : "h4"}>{dispatches.filter(d => d.status === 'in_transit').length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent sx={{ py: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
              <Typography color="text.secondary" variant={isMobile ? "caption" : "body2"}>Small Orders</Typography>
              <Typography variant={isMobile ? "h5" : "h4"}>{smallOrders.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <Tabs 
          value={tab} 
          onChange={(_, v) => setTab(v)} 
          sx={{ borderBottom: 1, borderColor: 'divider' }}
          variant={isMobile ? "fullWidth" : "standard"}
        >
          <Tab label={isMobile ? "All" : "All Dispatches"} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
          <Tab label={isMobile ? "Small" : "Small Orders"} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
        </Tabs>
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          {tab === 0 && (
            <DataGrid 
              rows={dispatches} 
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
          )}
          {tab === 1 && (
            <DataGrid 
              rows={smallOrders} 
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
          )}
        </Box>
      </Card>
    </Box>
  );
};

export default Dispatches;
