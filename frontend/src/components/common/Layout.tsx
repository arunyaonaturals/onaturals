import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  Receipt as ReceiptIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  ChevronLeft as ChevronLeftIcon,
  AccountCircle,
  Logout,
  ExpandLess,
  ExpandMore,
  Business as BusinessIcon,
  ShoppingCart as ShoppingCartIcon,
  Factory as FactoryIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const drawerWidth = 260;

interface MenuItem {
  title: string;
  path?: string;
  icon: React.ReactNode;
  children?: { title: string; path: string }[];
  roles?: string[];
}

const menuItems: MenuItem[] = [
  // Main
  { title: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { title: 'My Performance', path: '/my-dashboard', icon: <AssessmentIcon />, roles: ['sales_captain'] },
  
  // Inventory
  { title: 'Products', path: '/products', icon: <InventoryIcon /> },
  
  // Stores (Customer Management)
  {
    title: 'Stores',
    icon: <BusinessIcon />,
    children: [
      { title: 'All Stores', path: '/stores' },
      { title: 'Areas', path: '/areas' },
      { title: 'Store Analytics', path: '/store-classifications' },
    ],
  },
  
  // Sales Flow: Orders → Invoices → Payments
  {
    title: 'Sales',
    icon: <ReceiptIcon />,
    children: [
      { title: 'Orders', path: '/orders' },
      { title: 'Invoices', path: '/invoices' },
      { title: 'Payments', path: '/payments' },
    ],
  },
  
  // Purchase Flow: Vendors → Materials → Request → Bills
  {
    title: 'Purchase',
    icon: <ShoppingCartIcon />,
    children: [
      { title: 'Vendors', path: '/vendors' },
      { title: 'Raw Materials', path: '/raw-materials' },
      { title: 'Purchase Requests', path: '/purchase-requests' },
      { title: 'Purchase Bills', path: '/purchases' },
    ],
  },
  
  // Operations Flow: Production → Packing → Dispatch
  {
    title: 'Operations',
    icon: <FactoryIcon />,
    children: [
      { title: 'Production', path: '/production' },
      { title: 'Packing', path: '/packing' },
      { title: 'Dispatch', path: '/dispatch' },
    ],
  },
  
  // HR & Staff Management
  {
    title: 'Staff',
    icon: <PeopleIcon />,
    children: [
      { title: 'Staff List', path: '/staff' },
      { title: 'Attendance', path: '/attendance' },
      { title: 'Salary', path: '/salary' },
    ],
  },
  
  // Admin
  { title: 'Reports', path: '/reports', icon: <AssessmentIcon /> },
  { title: 'Settings', path: '/settings', icon: <SettingsIcon />, roles: ['admin'] },
];

const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Sales']);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopOpen(!desktopOpen);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSubmenu = (title: string) => {
    setExpandedMenus(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false); // Close drawer on mobile after navigation
    }
  };

  const isMenuVisible = (item: MenuItem) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || '');
  };

  const drawerContent = (
    <Box sx={{ overflow: 'auto', mt: isMobile ? 0 : 0 }}>
      {isMobile && (
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', mr: 2 }}>
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary">{user?.role}</Typography>
          </Box>
        </Box>
      )}
      <List>
        {menuItems.map((item) => {
          if (!isMenuVisible(item)) return null;

          if (item.children) {
            const isExpanded = expandedMenus.includes(item.title);
            return (
              <React.Fragment key={item.title}>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => toggleSubmenu(item.title)}>
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.title} />
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <ListItemButton
                        key={child.path}
                        sx={{ pl: 4 }}
                        selected={location.pathname === child.path}
                        onClick={() => handleNavigation(child.path)}
                      >
                        <ListItemText primary={child.title} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          }

          return (
            <ListItem key={item.title} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => item.path && handleNavigation(item.path)}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.title} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: '#1976d2',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: { xs: 1, sm: 2 } }}
          >
            {isMobile ? <MenuIcon /> : (desktopOpen ? <ChevronLeftIcon /> : <MenuIcon />)}
          </IconButton>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}
          >
            {isMobile ? 'Arunya ERP' : 'Arunya Consumables ERP'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {!isMobile && (
              <Typography variant="body1" sx={{ mr: 2 }}>
                {user?.name}
              </Typography>
            )}
            <IconButton color="inherit" onClick={handleMenuClick}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleMenuClose}>
                <AccountCircle sx={{ mr: 1 }} /> Profile
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} /> Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer - Temporary */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer - Persistent */}
      <Drawer
        variant="persistent"
        open={desktopOpen}
        sx={{
          display: { xs: 'none', md: 'block' },
          width: desktopOpen ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            transition: 'width 0.3s',
          },
        }}
      >
        <Toolbar />
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          width: { 
            xs: '100%', 
            md: `calc(100% - ${desktopOpen ? drawerWidth : 0}px)` 
          },
          ml: { 
            xs: 0, 
            md: desktopOpen ? 0 : `-${drawerWidth}px` 
          },
          transition: 'margin 0.3s, width 0.3s',
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
