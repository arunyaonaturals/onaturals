import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Grid, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tab, Tabs,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { PictureAsPdf as PdfIcon, Add as AddIcon } from '@mui/icons-material';
import { salaryAPI, usersAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const Salary: React.FC = () => {
  const [structures, setStructures] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({ user_id: '', basic_salary: '', hra: '0', da: '0', other_allowances: '0', pf_deduction: '0', esi_deduction: '0', other_deductions: '0' });
  const { isAdmin } = useAuth();

  useEffect(() => { fetchStructures(); fetchPayments(); fetchUsers(); }, []);

  const fetchStructures = async () => {
    try { const response = await salaryAPI.getStructures(); setStructures(response.data.data); }
    catch (error) { toast.error('Failed to load salary structures'); }
    finally { setLoading(false); }
  };

  const fetchPayments = async () => {
    try { const response = await salaryAPI.getPayments(); setPayments(response.data.data); }
    catch (error) { console.error('Failed to load payments'); }
  };

  const fetchUsers = async () => {
    try { const response = await usersAPI.getAll(); setUsers(response.data.data.filter((u: any) => u.is_active)); }
    catch (error) { console.error('Failed to load users'); }
  };

  const handleDownloadPayslip = async (id: number, userName: string, month: number, year: number) => {
    try {
      const response = await salaryAPI.downloadPayslip(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a'); link.href = url;
      link.setAttribute('download', `payslip_${userName}_${month}_${year}.pdf`);
      document.body.appendChild(link); link.click(); link.remove();
    } catch (error) { toast.error('Failed to download payslip'); }
  };

  const handleSubmit = async () => {
    try {
      await salaryAPI.createStructure({
        user_id: parseInt(formData.user_id),
        basic_salary: parseFloat(formData.basic_salary),
        hra: parseFloat(formData.hra) || 0,
        da: parseFloat(formData.da) || 0,
        other_allowances: parseFloat(formData.other_allowances) || 0,
        pf_deduction: parseFloat(formData.pf_deduction) || 0,
        esi_deduction: parseFloat(formData.esi_deduction) || 0,
        other_deductions: parseFloat(formData.other_deductions) || 0,
      });
      toast.success('Salary structure created');
      setDialogOpen(false);
      fetchStructures();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to create'); }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);

  const structureColumns: GridColDef[] = [
    { field: 'user_name', headerName: 'Employee', flex: 1 },
    { field: 'basic_salary', headerName: 'Basic', width: 110, valueFormatter: (params) => formatCurrency(params.value) },
    { field: 'hra', headerName: 'HRA', width: 100, valueFormatter: (params) => formatCurrency(params.value) },
    { field: 'da', headerName: 'DA', width: 100, valueFormatter: (params) => formatCurrency(params.value) },
    { field: 'pf_deduction', headerName: 'PF', width: 100, valueFormatter: (params) => formatCurrency(params.value) },
    { field: 'gross_salary', headerName: 'Gross', width: 120, valueFormatter: (params) => formatCurrency(params.value) },
    { field: 'net_salary', headerName: 'Net Salary', width: 120, valueFormatter: (params) => formatCurrency(params.value) },
  ];

  const paymentColumns: GridColDef[] = [
    { field: 'user_name', headerName: 'Employee', flex: 1 },
    { field: 'month', headerName: 'Month', width: 80 },
    { field: 'year', headerName: 'Year', width: 80 },
    { field: 'net_salary', headerName: 'Amount', width: 120, valueFormatter: (params) => formatCurrency(params.value) },
    { field: 'status', headerName: 'Status', width: 100, renderCell: (params) => <Chip label={params.value} color={params.value === 'paid' ? 'success' : 'warning'} size="small" /> },
    { field: 'payment_date', headerName: 'Date', width: 110, valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('en-IN') : '-' },
    {
      field: 'actions', headerName: 'Payslip', width: 100,
      renderCell: (params) => params.row.status === 'paid' && (
        <Button size="small" onClick={() => handleDownloadPayslip(params.row.id, params.row.user_name, params.row.month, params.row.year)}><PdfIcon color="error" /></Button>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Salary Management</Typography>
        {isAdmin && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>Add Salary Structure</Button>}
      </Box>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Salary Structures" />
          <Tab label="Payment History" />
        </Tabs>
        {tab === 0 && <DataGrid rows={structures} columns={structureColumns} loading={loading} pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} autoHeight disableRowSelectionOnClick />}
        {tab === 1 && <DataGrid rows={payments} columns={paymentColumns} loading={loading} pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} autoHeight disableRowSelectionOnClick />}
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Salary Structure</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField select fullWidth label="Employee" value={formData.user_id} onChange={(e) => setFormData({ ...formData, user_id: e.target.value })} SelectProps={{ native: true }}>
                <option value=""></option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField fullWidth label="Basic Salary" type="number" value={formData.basic_salary} onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })} required /></Grid>
            <Grid item xs={6}><TextField fullWidth label="HRA" type="number" value={formData.hra} onChange={(e) => setFormData({ ...formData, hra: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="DA" type="number" value={formData.da} onChange={(e) => setFormData({ ...formData, da: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Other Allowances" type="number" value={formData.other_allowances} onChange={(e) => setFormData({ ...formData, other_allowances: e.target.value })} /></Grid>
            <Grid item xs={4}><TextField fullWidth label="PF Deduction" type="number" value={formData.pf_deduction} onChange={(e) => setFormData({ ...formData, pf_deduction: e.target.value })} /></Grid>
            <Grid item xs={4}><TextField fullWidth label="ESI Deduction" type="number" value={formData.esi_deduction} onChange={(e) => setFormData({ ...formData, esi_deduction: e.target.value })} /></Grid>
            <Grid item xs={4}><TextField fullWidth label="Other Deductions" type="number" value={formData.other_deductions} onChange={(e) => setFormData({ ...formData, other_deductions: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setDialogOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleSubmit}>Create</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default Salary;
