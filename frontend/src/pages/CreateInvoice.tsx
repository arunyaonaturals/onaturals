import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Grid, FormControl, InputLabel, Select, MenuItem,
  TextField, Table, TableHead, TableBody, TableRow, TableCell, IconButton, Divider, Paper, Autocomplete,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { invoicesAPI, storesAPI, productsAPI } from '../services/api';
import { toast } from 'react-toastify';

interface InvoiceItem {
  product_id: number;
  product_name: string;
  weight: string;
  hsn_code: string;
  quantity: number;
  mrp: number;
  gst_rate: number;
  margin_percentage: number;
  unit_price: number;
  total: number;
}

const CreateInvoice: React.FC = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');
  const [isIGST, setIsIGST] = useState(false);
  const [loading, setLoading] = useState(false);
  const [storeMargins, setStoreMargins] = useState<any>({});
  const navigate = useNavigate();

  useEffect(() => { fetchStores(); fetchProducts(); }, []);

  const fetchStores = async () => {
    try {
      const response = await storesAPI.getAll({ is_active: 'true' });
      setStores(response.data.data);
    } catch (error) { toast.error('Failed to load stores'); }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ is_active: 'true' });
      setProducts(response.data.data);
    } catch (error) { toast.error('Failed to load products'); }
  };

  const fetchStoreMargins = async (storeId: number) => {
    try {
      const response = await storesAPI.getMargins(storeId);
      const margins: any = {};
      response.data.data.forEach((m: any) => { margins[m.product_id] = m.margin_percentage; });
      setStoreMargins(margins);
    } catch (error) { console.error('Failed to load margins'); }
  };

  const handleStoreChange = (store: any) => {
    setSelectedStore(store);
    if (store) fetchStoreMargins(store.id);
    else setStoreMargins({});
  };

  const handleAddItem = () => {
    setItems([...items, { product_id: 0, product_name: '', weight: '', hsn_code: '', quantity: 1, mrp: 0, gst_rate: 0, margin_percentage: 0, unit_price: 0, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, product: any) => {
    if (!product) return;
    const margin = storeMargins[product.id] || 0;
    const mrp = product.mrp || product.cost || 0;
    const unitPrice = mrp * (1 + margin / 100);
    const weightStr = product.weight ? `${product.weight} ${(product.weight_unit || 'g').toUpperCase()}` : '';
    const newItems = [...items];
    newItems[index] = {
      product_id: product.id,
      product_name: product.name,
      weight: weightStr,
      hsn_code: product.hsn_code || '',
      quantity: newItems[index].quantity || 1,
      mrp: mrp,
      gst_rate: product.gst_rate || 0,
      margin_percentage: margin,
      unit_price: unitPrice,
      total: unitPrice * (newItems[index].quantity || 1),
    };
    setItems(newItems);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    newItems[index].total = newItems[index].unit_price * quantity;
    setItems(newItems);
  };

  const handleMarginChange = (index: number, margin: number) => {
    const newItems = [...items];
    const unitPrice = newItems[index].mrp * (1 + margin / 100);
    newItems[index].margin_percentage = margin;
    newItems[index].unit_price = unitPrice;
    newItems[index].total = unitPrice * newItems[index].quantity;
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    let cgst = 0, sgst = 0, igst = 0;
    
    // Calculate GST per item based on its GST rate
    items.forEach(item => {
      const itemGstRate = item.gst_rate || 0;
      const itemGstAmount = item.total * (itemGstRate / 100);
      if (isIGST) {
        igst += itemGstAmount;
      } else {
        cgst += itemGstAmount / 2;
        sgst += itemGstAmount / 2;
      }
    });
    
    // Calculate round off
    const totalBeforeRoundOff = subtotal + cgst + sgst + igst;
    const roundOff = Math.round(totalBeforeRoundOff) - totalBeforeRoundOff;
    const total = totalBeforeRoundOff + roundOff;
    
    return { subtotal, cgst, sgst, igst, roundOff, total };
  };

  const handleSubmit = async () => {
    if (!selectedStore) { toast.error('Please select a store'); return; }
    if (items.length === 0 || items.some(i => !i.product_id)) { toast.error('Please add at least one product'); return; }

    setLoading(true);
    try {
      const data = {
        store_id: selectedStore.id,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, margin_percentage: i.margin_percentage })),
        notes,
        is_igst: isIGST,
      };
      const response = await invoicesAPI.create(data);
      toast.success(`Invoice ${response.data.data.invoice_number} created successfully!`);
      navigate('/invoices');
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to create invoice'); }
    finally { setLoading(false); }
  };

  const totals = calculateTotals();
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>Create Invoice</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Store Selection</Typography>
              <Autocomplete
                options={stores}
                getOptionLabel={(option) => `${option.name} - ${option.city || ''}`}
                value={selectedStore}
                onChange={(_, value) => handleStoreChange(value)}
                renderInput={(params) => <TextField {...params} label="Select Store" />}
                sx={{ mb: 3 }}
              />
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Products</Typography>
                <Button startIcon={<AddIcon />} onClick={handleAddItem}>Add Product</Button>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Weight</TableCell>
                    <TableCell>HSN</TableCell>
                    <TableCell align="center">GST %</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">MRP</TableCell>
                    <TableCell align="right">Margin %</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ minWidth: 200 }}>
                        <Autocomplete
                          options={products}
                          getOptionLabel={(option) => `${option.name} - ${option.weight || ''} ${(option.weight_unit || '').toUpperCase()}`}
                          onChange={(_, value) => handleProductChange(index, value)}
                          renderInput={(params) => <TextField {...params} size="small" placeholder="Select product" />}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{item.weight || '-'}</TableCell>
                      <TableCell>{item.hsn_code || '-'}</TableCell>
                      <TableCell align="center">{item.gst_rate ? `${item.gst_rate}%` : '-'}</TableCell>
                      <TableCell align="right">
                        <TextField type="number" size="small" value={item.quantity} onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)} sx={{ width: 70 }} inputProps={{ min: 1 }} />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(item.mrp)}</TableCell>
                      <TableCell align="right">
                        <TextField type="number" size="small" value={item.margin_percentage} onChange={(e) => handleMarginChange(index, parseFloat(e.target.value) || 0)} sx={{ width: 70 }} inputProps={{ min: 0 }} />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)}><DeleteIcon /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TextField fullWidth label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={2} sx={{ mt: 3 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Invoice Summary</Typography>
              <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                <Typography variant="body2" color="white">Invoice Number</Typography>
                <Typography variant="h6" color="white">Auto-Generated</Typography>
                <Typography variant="caption" color="white">(Will be assigned on save)</Typography>
              </Box>
              {selectedStore && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Store</Typography>
                  <Typography variant="body1">{selectedStore.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{selectedStore.address}</Typography>
                  {selectedStore.gst_number && (
                    <Typography variant="body2" color="text.secondary">GST: {selectedStore.gst_number}</Typography>
                  )}
                </Box>
              )}
              <Divider sx={{ my: 2 }} />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>GST Type</InputLabel>
                <Select value={isIGST ? 'igst' : 'cgst_sgst'} label="GST Type" onChange={(e) => setIsIGST(e.target.value === 'igst')}>
                  <MenuItem value="cgst_sgst">CGST + SGST (Intra-state)</MenuItem>
                  <MenuItem value="igst">IGST (Inter-state)</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Subtotal:</Typography>
                <Typography>{formatCurrency(totals.subtotal)}</Typography>
              </Box>
              {!isIGST ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>CGST:</Typography>
                    <Typography>{formatCurrency(totals.cgst)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>SGST:</Typography>
                    <Typography>{formatCurrency(totals.sgst)}</Typography>
                  </Box>
                </>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>IGST:</Typography>
                  <Typography>{formatCurrency(totals.igst)}</Typography>
                </Box>
              )}
              {totals.roundOff !== 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Round Off:</Typography>
                  <Typography>{totals.roundOff >= 0 ? '+' : ''}{totals.roundOff.toFixed(2)}</Typography>
                </Box>
              )}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6">{formatCurrency(totals.total)}</Typography>
              </Box>
              <Button variant="contained" fullWidth size="large" onClick={handleSubmit} disabled={loading || !selectedStore || items.length === 0}>
                {loading ? 'Creating...' : 'Create Invoice'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CreateInvoice;
