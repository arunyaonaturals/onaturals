import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Tab, Tabs, Table, TableHead,
  TableBody, TableRow, TableCell, Button, Select, MenuItem, FormControl, InputLabel,
  Alert, Divider, CircularProgress, IconButton, Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon, AttachMoney as MoneyIcon, Store as StoreIcon,
  Warning as WarningIcon, Phone as PhoneIcon, Refresh as RefreshIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { reportsAPI } from '../services/api';
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

const SalesCaptainDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('month');
  const [performance, setPerformance] = useState<any>(null);
  const [pendingReminders, setPendingReminders] = useState<any>({ reminders: [], totals: {} });
  const [collections, setCollections] = useState<any>({ collections: [], total_collected: 0 });
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [perfRes, remindersRes, collectionsRes] = await Promise.all([
        reportsAPI.getCaptainPerformance({ captain_id: user?.id, period }),
        reportsAPI.getCaptainPendingReminders({ captain_id: user?.id }),
        reportsAPI.getCaptainCollections({ captain_id: user?.id }),
      ]);
      
      setPerformance(perfRes.data.data[0] || null);
      setPendingReminders(remindersRes.data.data);
      setCollections(collectionsRes.data.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">My Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select value={period} label="Period" onChange={(e) => setPeriod(e.target.value)}>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="quarter">This Quarter</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={fetchData} title="Refresh">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Performance Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">Total Sales</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(performance?.total_sales || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {performance?.total_invoices || 0} invoices
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">Collected</Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {formatCurrency(performance?.total_collected || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {performance?.payment_collections || 0} collections
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">Pending Collection</Typography>
                  <Typography variant="h5" fontWeight="bold" color="error.main">
                    {formatCurrency(performance?.pending_collection || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {performance?.pending_invoices || 0} pending
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">Stores Served</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {performance?.stores_served || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {performance?.partial_invoices || 0} partial payments
                  </Typography>
                </Box>
                <StoreIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payment Reminders Alert */}
      {pendingReminders.totals.total_invoices > 0 && (
        <Alert 
          severity={pendingReminders.totals.high_volume_pending > 0 ? 'error' : 'warning'} 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => setTabValue(1)}>
              View All
            </Button>
          }
        >
          <Typography variant="subtitle2">
            {pendingReminders.totals.total_invoices} pending payment(s) totaling {formatCurrency(pendingReminders.totals.total_pending)}
          </Typography>
          {pendingReminders.totals.high_volume_pending > 0 && (
            <Typography variant="body2">
              {pendingReminders.totals.high_volume_pending} from high-volume stores - prioritize these!
            </Typography>
          )}
        </Alert>
      )}

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Recent Collections" />
            <Tab label={`Payment Reminders (${pendingReminders.totals.total_invoices || 0})`} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <CardContent>
            {collections.collections.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                No collections recorded yet.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Invoice</TableCell>
                    <TableCell>Store</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {collections.collections.slice(0, 20).map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{new Date(c.payment_date).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell>{c.invoice_number}</TableCell>
                      <TableCell>
                        {c.store_name}
                        <Chip 
                          label={c.volume_classification} 
                          size="small" 
                          color={getClassificationColor(c.volume_classification) as any}
                          sx={{ ml: 1 }}
                        />
                      </TableCell>
                      <TableCell>{c.payment_method?.toUpperCase()}</TableCell>
                      <TableCell align="right">{formatCurrency(c.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <CardContent>
            {pendingReminders.reminders.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                No pending payments. Great job!
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Store</TableCell>
                    <TableCell>Invoice</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Paid</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell align="center">Days</TableCell>
                    <TableCell>Contact</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingReminders.reminders.map((r: any) => (
                    <TableRow key={r.invoice_id} sx={{ 
                      bgcolor: r.volume_classification === 'high' ? 'error.50' : 
                               r.volume_classification === 'medium' ? 'warning.50' : 'inherit'
                    }}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">{r.store_name}</Typography>
                          <Chip 
                            label={r.volume_classification} 
                            size="small" 
                            color={getClassificationColor(r.volume_classification) as any}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{r.invoice_number}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(r.invoice_date).toLocaleDateString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(r.total_amount)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        {formatCurrency(r.total_paid)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                        {formatCurrency(r.balance_due)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={`${Math.floor(r.days_since_invoice)}d`} 
                          size="small"
                          color={r.days_since_invoice > 30 ? 'error' : r.days_since_invoice > 15 ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          {r.contact_person && <Typography variant="body2">{r.contact_person}</Typography>}
                          {r.store_phone && (
                            <Tooltip title="Call store">
                              <Button 
                                size="small" 
                                startIcon={<PhoneIcon />}
                                href={`tel:${r.store_phone}`}
                              >
                                {r.store_phone}
                              </Button>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Summary by Classification */}
            {pendingReminders.reminders.length > 0 && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Summary by Store Type:</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="error">
                      High Volume: {pendingReminders.totals.high_volume_pending || 0} stores
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="warning.main">
                      Medium Volume: {pendingReminders.totals.medium_volume_pending || 0} stores
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2">
                      Low Volume: {pendingReminders.totals.low_volume_pending || 0} stores
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </TabPanel>
      </Card>

      {/* Daily Summary */}
      {collections.daily_summary && collections.daily_summary.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Daily Collection Summary</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Collections</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {collections.daily_summary.slice(0, 7).map((d: any) => (
                  <TableRow key={d.date}>
                    <TableCell>{new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</TableCell>
                    <TableCell align="center">{d.collection_count}</TableCell>
                    <TableCell align="right">{formatCurrency(d.total_collected)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default SalesCaptainDashboard;
