import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Grid, Tab, Tabs, Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { reportsAPI } from '../services/api';
import { toast } from 'react-toastify';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Reports: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [salesByArea, setSalesByArea] = useState<any[]>([]);
  const [salesByCaptain, setSalesByCaptain] = useState<any[]>([]);
  const [vendorDues, setVendorDues] = useState<any>({ dues: [], total_due: 0 });
  const [pendingPayments, setPendingPayments] = useState<any>({ payments: [], total_pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      const [areaRes, captainRes, vendorRes, paymentRes] = await Promise.all([
        reportsAPI.getSalesByArea(),
        reportsAPI.getSalesByCaptain(),
        reportsAPI.getVendorDues(),
        reportsAPI.getPendingPayments(),
      ]);
      setSalesByArea(areaRes.data.data);
      setSalesByCaptain(captainRes.data.data);
      setVendorDues(vendorRes.data.data);
      setPendingPayments(paymentRes.data.data);
    } catch (error) { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>Reports & Analytics</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Sales Overview" />
        <Tab label="Payments" />
        <Tab label="Vendor Dues" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Sales by Area</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesByArea}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="area_name" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="total_sales" name="Total Sales" fill="#1976d2" />
                    <Bar dataKey="paid_amount" name="Paid" fill="#2e7d32" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Sales by Captain</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={salesByCaptain} dataKey="total_sales" nameKey="captain_name" cx="50%" cy="50%" outerRadius={100} label={(entry) => entry.captain_name}>
                      {salesByCaptain.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Sales Captain Performance</Typography>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Captain</TableCell>
                      <TableCell align="right">Invoices</TableCell>
                      <TableCell align="right">Total Sales</TableCell>
                      <TableCell align="right">Billed</TableCell>
                      <TableCell align="right">Paid</TableCell>
                      <TableCell align="right">Pending</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {salesByCaptain.map((row) => (
                      <TableRow key={row.captain_id}>
                        <TableCell>{row.captain_name}</TableCell>
                        <TableCell align="right">{row.total_invoices}</TableCell>
                        <TableCell align="right">{formatCurrency(row.total_sales)}</TableCell>
                        <TableCell align="right">{row.billed_count}</TableCell>
                        <TableCell align="right">{formatCurrency(row.paid_amount)}</TableCell>
                        <TableCell align="right">{formatCurrency(row.pending_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'warning.light' }}>
              <CardContent>
                <Typography color="warning.dark">Total Pending Payments</Typography>
                <Typography variant="h4">{formatCurrency(pendingPayments.total_pending)}</Typography>
                <Typography variant="body2">{pendingPayments.payments.length} invoices</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Pending Customer Payments</Typography>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Store</TableCell>
                      <TableCell>Area</TableCell>
                      <TableCell>Sales Captain</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingPayments.payments.slice(0, 20).map((row: any) => (
                      <TableRow key={row.invoice_id}>
                        <TableCell>{row.invoice_number}</TableCell>
                        <TableCell>{row.store_name}</TableCell>
                        <TableCell>{row.area_name}</TableCell>
                        <TableCell>{row.sales_captain_name}</TableCell>
                        <TableCell align="right">{formatCurrency(row.total_amount)}</TableCell>
                        <TableCell>{new Date(row.invoice_date).toLocaleDateString('en-IN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'error.light' }}>
              <CardContent>
                <Typography color="error.dark">Total Vendor Dues</Typography>
                <Typography variant="h4">{formatCurrency(vendorDues.total_due)}</Typography>
                <Typography variant="body2">{vendorDues.dues.length} vendors</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Vendor Payment Dues</Typography>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Vendor</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell align="right">Payment Days</TableCell>
                      <TableCell align="right">Pending Receipts</TableCell>
                      <TableCell align="right">Total Due</TableCell>
                      <TableCell>Earliest Due Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {vendorDues.dues.map((row: any) => (
                      <TableRow key={row.vendor_id}>
                        <TableCell>{row.vendor_name}</TableCell>
                        <TableCell>{row.vendor_phone}</TableCell>
                        <TableCell align="right">{row.payment_days} days</TableCell>
                        <TableCell align="right">{row.pending_receipts}</TableCell>
                        <TableCell align="right">{formatCurrency(row.total_due)}</TableCell>
                        <TableCell>{new Date(row.earliest_due_date).toLocaleDateString('en-IN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Reports;
