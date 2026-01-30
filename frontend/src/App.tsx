import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './context/AuthContext';
import Layout from './components/common/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Areas from './pages/Areas';
import Stores from './pages/Stores';
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import Vendors from './pages/Vendors';
import PurchaseReceipts from './pages/PurchaseReceipts';
import PackingOrders from './pages/PackingOrders';
import Dispatches from './pages/Dispatches';
import Attendance from './pages/Attendance';
import Salary from './pages/Salary';
import Reports from './pages/Reports';
import Orders from './pages/Orders';
import Payments from './pages/Payments';
import RawMaterials from './pages/RawMaterials';
import Production from './pages/Production';
import SalesCaptainDashboard from './pages/SalesCaptainDashboard';
import StoreClassifications from './pages/StoreClassifications';
import Settings from './pages/Settings';
import PurchaseRequests from './pages/PurchaseRequests';
import Staff from './pages/Staff';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return isAdmin ? <>{children}</> : <Navigate to="/" />;
};

const App: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="areas" element={<Areas />} />
        <Route path="stores" element={<Stores />} />
        <Route path="store-classifications" element={<StoreClassifications />} />
        <Route path="orders" element={<Orders />} />
        <Route path="my-dashboard" element={<SalesCaptainDashboard />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/create" element={<CreateInvoice />} />
        <Route path="payments" element={<Payments />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="raw-materials" element={<RawMaterials />} />
        <Route path="purchase-requests" element={<PurchaseRequests />} />
        <Route path="purchases" element={<PurchaseReceipts />} />
        <Route path="production" element={<Production />} />
        <Route path="packing" element={<PackingOrders />} />
        <Route path="dispatch" element={<Dispatches />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="salary" element={<Salary />} />
        <Route path="staff" element={<Staff />} />
        <Route path="settings" element={
          <AdminRoute>
            <Settings />
          </AdminRoute>
        } />
        <Route path="reports" element={<Reports />} />
      </Route>
    </Routes>
  );
};

export default App;
