import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  LocalShipping as ShippingIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  Factory as FactoryIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { reportsAPI, purchaseAPI, rawMaterialsAPI } from '../services/api';
import { toast } from 'react-toastify';

interface DashboardData {
  sales: {
    total_invoices: number;
    total_sales: number;
    pending_payments: number;
  };
  dispatch: {
    pending_dispatches: number;
    small_orders: number;
  };
  vendor: {
    pending_vendor_payments: number;
    total_vendor_dues: number;
  };
  attendance: {
    present_today: number;
    absent_today: number;
  };
  packing: {
    pending_packing: number;
  };
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, subtitle, icon, color }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography color="text.secondary" variant="body2" gutterBottom noWrap>
              {title}
            </Typography>
            <Typography 
              variant={isMobile ? "h5" : "h4"} 
              component="div" 
              fontWeight="bold"
              sx={{ wordBreak: 'break-word' }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} noWrap>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}20`,
              borderRadius: 2,
              p: { xs: 0.75, sm: 1 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ml: 1,
              flexShrink: 0,
            }}
          >
            {React.cloneElement(icon as React.ReactElement, { 
              sx: { color, fontSize: { xs: 24, sm: 32 } } 
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

interface PaymentReminders {
  overdue: { count: number; total: number };
  due_this_week: { count: number; total: number };
}

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState<PaymentReminders | null>(null);
  const [overduePayments, setOverduePayments] = useState<any[]>([]);
  const [lowStockMaterials, setLowStockMaterials] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    fetchPaymentReminders();
    fetchLowStockAlerts();
  }, []);

  const fetchDashboardData = async (retry = false) => {
    try {
      const response = await reportsAPI.getDashboard();
      setData(response.data.data);
    } catch (error) {
      if (!retry) {
        // First load can be slow (migrations); retry once after 3s
        setTimeout(() => fetchDashboardData(true), 3000);
        return;
      }
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentReminders = async () => {
    try {
      const [remindersRes, overdueRes] = await Promise.all([
        purchaseAPI.getPaymentReminders(),
        purchaseAPI.getOverduePayments(),
      ]);
      setPaymentReminders(remindersRes.data.data);
      setOverduePayments(overdueRes.data.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to load payment reminders');
    }
  };

  const fetchLowStockAlerts = async () => {
    try {
      const response = await rawMaterialsAPI.getLowStock();
      setLowStockMaterials(response.data.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to load low stock alerts');
    }
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          First load may take 10–15 seconds…
        </Typography>
      </Box>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <Box>
      <Typography variant={isMobile ? "h5" : "h4"} gutterBottom fontWeight="bold">
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 2, sm: 4 } }}>
        Welcome to Arunya Consumables ERP System
      </Typography>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Sales Stats */}
        <Grid item xs={6} sm={6} md={4}>
          <StatCard
            title="Total Invoices (This Month)"
            value={data?.sales?.total_invoices || 0}
            subtitle={`Sales: ${formatCurrency(data?.sales?.total_sales || 0)}`}
            icon={<ReceiptIcon />}
            color="#1976d2"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4}>
          <StatCard
            title="Pending Payments"
            value={formatCurrency(data?.sales?.pending_payments || 0)}
            subtitle="From customers"
            icon={<MoneyIcon />}
            color="#ed6c02"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4}>
          <StatCard
            title="Vendor Dues"
            value={formatCurrency(data?.vendor?.total_vendor_dues || 0)}
            subtitle={`${data?.vendor?.pending_vendor_payments || 0} pending`}
            icon={<WarningIcon />}
            color="#d32f2f"
          />
        </Grid>

        {/* Dispatch Stats */}
        <Grid item xs={6} sm={6} md={4}>
          <StatCard
            title="Pending Dispatches"
            value={data?.dispatch?.pending_dispatches || 0}
            subtitle={`${data?.dispatch?.small_orders || 0} small orders`}
            icon={<ShippingIcon />}
            color="#2e7d32"
          />
        </Grid>

        <Grid item xs={6} sm={6} md={4}>
          <StatCard
            title="Pending Packing"
            value={data?.packing?.pending_packing || 0}
            subtitle="Orders to pack"
            icon={<InventoryIcon />}
            color="#9c27b0"
          />
        </Grid>

        {/* Attendance */}
        <Grid item xs={6} sm={6} md={4}>
          <StatCard
            title="Today's Attendance"
            value={`${data?.attendance?.present_today || 0} Present`}
            subtitle={`${data?.attendance?.absent_today || 0} Absent`}
            icon={<PeopleIcon />}
            color="#0288d1"
          />
        </Grid>
      </Grid>

      {/* Alerts Section */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 1, sm: 2 } }}>
        {/* Vendor Payment Reminders */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ScheduleIcon sx={{ color: 'warning.main', mr: 1, fontSize: { xs: 20, sm: 24 } }} />
                <Typography variant={isMobile ? "subtitle1" : "h6"}>Vendor Payment Reminders</Typography>
              </Box>
              
              {paymentReminders && (paymentReminders.overdue.count > 0 || paymentReminders.due_this_week.count > 0) ? (
                <>
                  {paymentReminders.overdue.count > 0 && (
                    <Alert severity="error" sx={{ mb: 2, '& .MuiAlert-message': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
                      <Typography variant="subtitle2">
                        {paymentReminders.overdue.count} Overdue - {formatCurrency(paymentReminders.overdue.total)}
                      </Typography>
                    </Alert>
                  )}
                  {paymentReminders.due_this_week.count > 0 && (
                    <Alert severity="warning" sx={{ mb: 2, '& .MuiAlert-message': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
                      <Typography variant="subtitle2">
                        {paymentReminders.due_this_week.count} Due This Week - {formatCurrency(paymentReminders.due_this_week.total)}
                      </Typography>
                    </Alert>
                  )}
                  
                  {overduePayments.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>Top Overdue:</Typography>
                      <List dense disablePadding>
                        {overduePayments.map((payment) => (
                          <ListItem key={payment.id} sx={{ px: 0, py: 0.5 }}>
                            <ListItemText
                              primary={payment.vendor_name}
                              secondary={`Due: ${new Date(payment.due_date).toLocaleDateString('en-IN')}`}
                              primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                            <Chip 
                              label={formatCurrency(payment.total_amount)} 
                              size="small" 
                              color="error" 
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                  
                  <Button 
                    size="small" 
                    onClick={() => window.location.href = '/purchases'}
                    sx={{ mt: 1 }}
                    fullWidth={isMobile}
                  >
                    View All Payments
                  </Button>
                </>
              ) : (
                <Typography color="text.secondary" variant="body2">No pending vendor payments</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Low Stock Alerts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FactoryIcon sx={{ color: 'error.main', mr: 1, fontSize: { xs: 20, sm: 24 } }} />
                <Typography variant={isMobile ? "subtitle1" : "h6"}>Low Stock Raw Materials</Typography>
              </Box>
              
              {lowStockMaterials.length > 0 ? (
                <>
                  <Alert severity="warning" sx={{ mb: 2, '& .MuiAlert-message': { fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}>
                    {lowStockMaterials.length} raw material(s) below reorder level
                  </Alert>
                  <List dense disablePadding>
                    {lowStockMaterials.map((material) => (
                      <ListItem key={material.id} sx={{ px: 0, py: 0.5 }}>
                        <ListItemText
                          primary={material.name}
                          secondary={`Stock: ${material.stock_quantity} ${material.unit}`}
                          primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <Chip 
                          label="Low" 
                          size="small" 
                          color="error" 
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Button 
                    size="small" 
                    onClick={() => window.location.href = '/raw-materials'}
                    sx={{ mt: 1 }}
                    fullWidth={isMobile}
                  >
                    View All Materials
                  </Button>
                </>
              ) : (
                <Typography color="text.secondary" variant="body2">All raw materials are sufficiently stocked</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ mt: { xs: 3, sm: 4 } }}>
        <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom fontWeight="medium">
          Quick Actions
        </Typography>
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          {[
            { icon: <ReceiptIcon />, label: 'New Order', path: '/orders', color: 'primary.main' },
            { icon: <FactoryIcon />, label: 'Production', path: '/production', color: 'secondary.main' },
            { icon: <ShippingIcon />, label: 'Dispatches', path: '/dispatch', color: 'success.main' },
            { icon: <MoneyIcon />, label: 'Payments', path: '/payments', color: 'warning.main' },
            { icon: <PeopleIcon />, label: 'Attendance', path: '/attendance', color: 'info.main' },
          ].map((action) => (
            <Grid item xs={4} sm={4} md="auto" key={action.path}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 4 },
                  transition: 'box-shadow 0.3s',
                  height: '100%',
                }}
                onClick={() => window.location.href = action.path}
              >
                <CardContent sx={{ 
                  textAlign: 'center', 
                  py: { xs: 2, sm: 3 }, 
                  px: { xs: 1, sm: 4 },
                  '&:last-child': { pb: { xs: 2, sm: 3 } }
                }}>
                  {React.cloneElement(action.icon as React.ReactElement, { 
                    sx: { fontSize: { xs: 28, sm: 40 }, color: action.color, mb: 0.5 } 
                  })}
                  <Typography variant={isMobile ? "caption" : "body1"} sx={{ display: 'block' }}>
                    {action.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default Dashboard;
