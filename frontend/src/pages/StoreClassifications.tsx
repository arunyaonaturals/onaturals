import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Table, TableHead, TableBody,
  TableRow, TableCell, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, Alert, IconButton,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Refresh as RefreshIcon, Settings as SettingsIcon, TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { reportsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const StoreClassifications: React.FC = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [thresholds, setThresholds] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filter, setFilter] = useState<string>('');
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchData();
    fetchThresholds();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter) params.classification = filter;
      const response = await reportsAPI.getStoreClassifications(params);
      setStores(response.data.data.stores);
      setSummary(response.data.data.summary);
    } catch (error) {
      toast.error('Failed to load store classifications');
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

  const handleUpdateClassifications = async () => {
    try {
      const response = await reportsAPI.updateStoreClassifications();
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error('Failed to update classifications');
    }
  };

  const handleSaveThresholds = async () => {
    try {
      await reportsAPI.updateClassificationThresholds(thresholds);
      toast.success('Thresholds updated successfully');
      setSettingsOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update thresholds');
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Store Name', flex: 1, minWidth: 200 },
    { field: 'city', headerName: 'City', width: 120 },
    { field: 'area_name', headerName: 'Area', width: 150 },
    { field: 'sales_captain_name', headerName: 'Sales Captain', width: 150 },
    {
      field: 'volume_classification',
      headerName: 'Classification',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value?.toUpperCase() || 'LOW'}
          color={getClassificationColor(params.value) as any}
          size="small"
        />
      ),
    },
    {
      field: 'last_30_days_sales',
      headerName: '30-Day Sales',
      width: 140,
      align: 'right',
      valueFormatter: (params) => formatCurrency(params.value || 0),
    },
    {
      field: 'last_30_days_orders',
      headerName: 'Orders',
      width: 80,
      align: 'center',
    },
    { field: 'phone', headerName: 'Phone', width: 130 },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Store Classifications</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {isAdmin && (
            <>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setSettingsOpen(true)}
              >
                Thresholds
              </Button>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={handleUpdateClassifications}
              >
                Recalculate All
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold">{summary?.high_count || 0}</Typography>
              <Typography>High Volume Stores</Typography>
              {thresholds && (
                <Typography variant="caption">
                  Sales &ge; {formatCurrency(thresholds.high_volume_min)}/month
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold">{summary?.medium_count || 0}</Typography>
              <Typography>Medium Volume Stores</Typography>
              {thresholds && (
                <Typography variant="caption">
                  Sales &ge; {formatCurrency(thresholds.medium_volume_min)}/month
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'grey.300' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold">{summary?.low_count || 0}</Typography>
              <Typography>Low Volume Stores</Typography>
              {thresholds && (
                <Typography variant="caption">
                  Sales &lt; {formatCurrency(thresholds.medium_volume_min)}/month
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Classification</InputLabel>
            <Select
              value={filter}
              label="Filter by Classification"
              onChange={(e) => setFilter(e.target.value)}
            >
              <MenuItem value="">All Stores</MenuItem>
              <MenuItem value="high">High Volume</MenuItem>
              <MenuItem value="medium">Medium Volume</MenuItem>
              <MenuItem value="low">Low Volume</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Store List */}
      <Card>
        <DataGrid
          rows={stores}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          autoHeight
          disableRowSelectionOnClick
        />
      </Card>

      {/* Threshold Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Classification Thresholds</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Alert severity="info">
              Stores are classified based on their total sales over the specified period.
            </Alert>
            <TextField
              fullWidth
              label="High Volume Minimum (INR)"
              type="number"
              value={thresholds?.high_volume_min || ''}
              onChange={(e) => setThresholds({ ...thresholds, high_volume_min: parseFloat(e.target.value) })}
              helperText="Stores with sales at or above this amount are classified as High Volume"
            />
            <TextField
              fullWidth
              label="Medium Volume Minimum (INR)"
              type="number"
              value={thresholds?.medium_volume_min || ''}
              onChange={(e) => setThresholds({ ...thresholds, medium_volume_min: parseFloat(e.target.value) })}
              helperText="Stores with sales at or above this amount (but below High) are classified as Medium Volume"
            />
            <TextField
              fullWidth
              label="Calculation Period (Days)"
              type="number"
              value={thresholds?.period_days || ''}
              onChange={(e) => setThresholds({ ...thresholds, period_days: parseInt(e.target.value) })}
              helperText="Number of days to look back when calculating sales volume"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveThresholds}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StoreClassifications;
