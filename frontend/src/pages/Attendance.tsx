import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Grid, FormControl, InputLabel, Select, MenuItem, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { attendanceAPI, usersAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const Attendance: React.FC = () => {
  const [todayAttendance, setTodayAttendance] = useState<any>({ marked: [], unmarked: [] });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState({ status: 'present', check_in: '', check_out: '', notes: '' });
  const { isAdmin } = useAuth();

  useEffect(() => { fetchTodayAttendance(); fetchUsers(); }, []);

  const fetchTodayAttendance = async () => {
    try { const response = await attendanceAPI.getToday(); setTodayAttendance(response.data.data); }
    catch (error) { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try { const response = await usersAPI.getAll(); setUsers(response.data.data.filter((u: any) => u.is_active)); }
    catch (error) { console.error('Failed to load users'); }
  };

  const handleMarkAttendance = (user: any) => {
    setSelectedUser(user);
    setFormData({ status: 'present', check_in: '', check_out: '', notes: '' });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await attendanceAPI.mark({ user_id: selectedUser.id, date: today, ...formData });
      toast.success('Attendance marked');
      setDialogOpen(false);
      fetchTodayAttendance();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to mark attendance'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'present': return 'success'; case 'absent': return 'error'; case 'half_day': return 'warning'; case 'leave': return 'info'; default: return 'default'; }
  };

  const markedColumns: GridColDef[] = [
    { field: 'user_name', headerName: 'Name', flex: 1 },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (params) => <Chip label={params.value} color={getStatusColor(params.value)} size="small" /> },
    { field: 'check_in', headerName: 'Check In', width: 100 },
    { field: 'check_out', headerName: 'Check Out', width: 100 },
    { field: 'notes', headerName: 'Notes', flex: 1 },
  ];

  const unmarkedColumns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    {
      field: 'actions', headerName: 'Action', width: 150,
      renderCell: (params) => <Button size="small" variant="contained" onClick={() => handleMarkAttendance(params.row)}>Mark Attendance</Button>,
    },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>Attendance - {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card><CardContent><Typography color="text.secondary">Present</Typography><Typography variant="h4" color="success.main">{todayAttendance.marked.filter((a: any) => a.status === 'present').length}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card><CardContent><Typography color="text.secondary">Absent</Typography><Typography variant="h4" color="error.main">{todayAttendance.marked.filter((a: any) => a.status === 'absent').length}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card><CardContent><Typography color="text.secondary">Leave</Typography><Typography variant="h4" color="info.main">{todayAttendance.marked.filter((a: any) => a.status === 'leave').length}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card><CardContent><Typography color="text.secondary">Not Marked</Typography><Typography variant="h4" color="warning.main">{todayAttendance.unmarked.length}</Typography></CardContent></Card>
        </Grid>
      </Grid>

      {todayAttendance.unmarked.length > 0 && isAdmin && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Pending Attendance</Typography>
            <DataGrid rows={todayAttendance.unmarked} columns={unmarkedColumns} autoHeight disableRowSelectionOnClick initialState={{ pagination: { paginationModel: { pageSize: 5 } } }} pageSizeOptions={[5, 10]} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Today's Attendance</Typography>
          <DataGrid rows={todayAttendance.marked} columns={markedColumns} loading={loading} autoHeight disableRowSelectionOnClick initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} pageSizeOptions={[10, 25]} />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mark Attendance - {selectedUser?.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={formData.status} label="Status" onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <MenuItem value="present">Present</MenuItem>
                  <MenuItem value="absent">Absent</MenuItem>
                  <MenuItem value="half_day">Half Day</MenuItem>
                  <MenuItem value="leave">Leave</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}><TextField fullWidth label="Check In" type="time" value={formData.check_in} onChange={(e) => setFormData({ ...formData, check_in: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Check Out" type="time" value={formData.check_out} onChange={(e) => setFormData({ ...formData, check_out: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setDialogOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleSubmit}>Save</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default Attendance;
