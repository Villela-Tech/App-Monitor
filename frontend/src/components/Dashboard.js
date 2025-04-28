import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Box,
  CircularProgress,
  Paper,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Fade,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { motion } from 'framer-motion';
import { useNotification } from '../contexts/NotificationContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

const MotionContainer = styled(motion.div)({
  display: 'flex',
  flexDirection: 'column',
  gap: 24
});

const StatsCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'rgba(25, 118, 210, 0.05)',
  backdropFilter: 'blur(10px)',
  borderRadius: 16
}));

const GridItem = styled(Grid)(({ theme }) => ({
  width: {
    xs: '100%',
    sm: '50%',
    md: '33.333%'
  },
  padding: theme.spacing(1.5)
}));

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  backgroundColor: theme.palette.background.paper,
  borderRadius: 16,
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8]
  },
  transition: 'all 0.3s ease-in-out'
}));

const StatusIndicator = styled('div')(({ color }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: color,
  marginRight: 8
}));

const ResponsiveGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(3),
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  [theme.breakpoints.up('xl')]: {
    gridTemplateColumns: 'repeat(4, 1fr)'
  }
}));

const SearchContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  flexWrap: 'wrap',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    '& > *': {
      width: '100%'
    }
  }
}));

function Dashboard() {
  const theme = useTheme();
  const { showSuccess, showError, showInfo } = useNotification();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState(null);
  const { isSmallScreen, isMobile } = useBreakpoint();

  const fetchSites = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/sites');
      setSites(response.data);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar sites:', err);
      showError('Erro ao carregar sites. Por favor, tente novamente.');
      setError('Erro ao carregar sites. Por favor, tente novamente.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleRefresh = async (id, siteName) => {
    if (!id) return;
    try {
      showInfo(`Atualizando status de ${siteName}...`);
      await axios.post(`http://localhost:5000/api/sites/${id}/check`);
      await fetchSites();
      showSuccess(`Status de ${siteName} atualizado com sucesso!`);
    } catch (err) {
      console.error('Erro ao atualizar site:', err);
      showError(`Erro ao atualizar ${siteName}. Por favor, tente novamente.`);
    }
  };

  const handleDeleteClick = (site) => {
    setSiteToDelete(site);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!siteToDelete) return;
    try {
      await axios.delete(`http://localhost:5000/api/sites/${siteToDelete.id}`);
      showSuccess(`Site ${siteToDelete.name} deletado com sucesso!`);
      setDeleteDialogOpen(false);
      setSiteToDelete(null);
      await fetchSites();
    } catch (err) {
      console.error('Erro ao deletar site:', err);
      showError(`Erro ao deletar ${siteToDelete.name}. Por favor, tente novamente.`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'up':
        return theme.palette.success.main;
      case 'down':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'up':
        return <CheckCircleIcon color="success" />;
      case 'down':
        return <ErrorIcon color="error" />;
      default:
        return <WarningIcon color="warning" />;
    }
  };

  const filteredSites = sites.filter(site => {
    const matchesSearch = site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         site.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || site.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: sites.length,
    up: sites.filter(s => s.status === 'up').length,
    down: sites.filter(s => s.status === 'down').length,
    warning: sites.filter(s => s.sslInfo?.daysRemaining <= 30).length
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container 
      sx={{ 
        mt: { xs: 2, sm: 3, md: 4 }, 
        mb: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1, sm: 2, md: 3 }
      }}
    >
      <MotionContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        <Grid 
          container 
          spacing={{ xs: 1, sm: 2 }}
          sx={{ mb: { xs: 2, sm: 3 } }}
        >
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard>
              <CardContent sx={{ p: isSmallScreen ? 2 : 3 }}>
                <Typography variant={isSmallScreen ? "subtitle1" : "h6"} gutterBottom>
                  Total de Sites
                </Typography>
                <Typography variant={isSmallScreen ? "h5" : "h4"}>
                  {stats.total}
                </Typography>
              </CardContent>
            </StatsCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard>
              <CardContent sx={{ p: isSmallScreen ? 2 : 3 }}>
                <Typography variant={isSmallScreen ? "subtitle1" : "h6"} gutterBottom>
                  Sites Online
                </Typography>
                <Typography variant={isSmallScreen ? "h5" : "h4"} color="success.main">
                  {stats.up}
                </Typography>
              </CardContent>
            </StatsCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard>
              <CardContent sx={{ p: isSmallScreen ? 2 : 3 }}>
                <Typography variant={isSmallScreen ? "subtitle1" : "h6"} gutterBottom>
                  Sites Offline
                </Typography>
                <Typography variant={isSmallScreen ? "h5" : "h4"} color="error.main">
                  {stats.down}
                </Typography>
              </CardContent>
            </StatsCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard>
              <CardContent sx={{ p: isSmallScreen ? 2 : 3 }}>
                <Typography variant={isSmallScreen ? "subtitle1" : "h6"} gutterBottom>
                  Alertas SSL
                </Typography>
                <Typography variant={isSmallScreen ? "h5" : "h4"} color="warning.main">
                  {stats.warning}
                </Typography>
              </CardContent>
            </StatsCard>
          </Grid>
        </Grid>

        <SearchContainer sx={{ mb: { xs: 2, sm: 3 } }}>
          <TextField
            placeholder="Pesquisar sites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1 }}
            size={isSmallScreen ? "small" : "medium"}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: isMobile ? '100%' : 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
              size={isSmallScreen ? "small" : "medium"}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="up">Online</MenuItem>
              <MenuItem value="down">Offline</MenuItem>
            </Select>
          </FormControl>
        </SearchContainer>

        <ResponsiveGrid>
          {filteredSites.map((site) => (
            <motion.div
              key={site.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <StyledCard>
                <CardContent sx={{ p: isSmallScreen ? 2 : 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <StatusIndicator color={getStatusColor(site.status)} />
                    <Typography 
                      variant={isSmallScreen ? "subtitle1" : "h6"} 
                      component="div"
                      noWrap
                      sx={{ flex: 1 }}
                    >
                      {site.name}
                    </Typography>
                  </Box>
                  <Typography 
                    color="textSecondary" 
                    sx={{ 
                      wordBreak: 'break-all',
                      mb: 2,
                      fontSize: isSmallScreen ? '0.875rem' : '1rem'
                    }}
                  >
                    {site.url}
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5, 
                    flexWrap: 'wrap',
                    mb: 2
                  }}>
                    <Chip
                      icon={getStatusIcon(site.status)}
                      label={site.status.toUpperCase()}
                      color={site.status === 'up' ? 'success' : 'error'}
                      size={isSmallScreen ? "small" : "medium"}
                    />
                    {site.sslInfo && site.sslInfo.daysRemaining && (
                      <Chip
                        label={`SSL: ${site.sslInfo.daysRemaining} dias`}
                        color={site.sslInfo.daysRemaining <= 30 ? 'warning' : 'success'}
                        size={isSmallScreen ? "small" : "medium"}
                      />
                    )}
                    {site.responseTime && (
                      <Chip
                        label={`${site.responseTime}ms`}
                        color={site.responseTime < 300 ? 'success' : 'warning'}
                        size={isSmallScreen ? "small" : "medium"}
                      />
                    )}
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: 1,
                    borderTop: 1,
                    borderColor: 'divider',
                    pt: 2
                  }}>
                    <Tooltip title="Atualizar">
                      <IconButton
                        size={isSmallScreen ? "small" : "medium"}
                        onClick={() => handleRefresh(site.id, site.name)}
                      >
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Detalhes">
                      <IconButton
                        size={isSmallScreen ? "small" : "medium"}
                        component={RouterLink}
                        to={`/site/${site.id}`}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Deletar">
                      <IconButton
                        size={isSmallScreen ? "small" : "medium"}
                        onClick={() => handleDeleteClick(site)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </StyledCard>
            </motion.div>
          ))}
        </ResponsiveGrid>
      </MotionContainer>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            width: '100%',
            maxWidth: 400
          }
        }}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja deletar o site "{siteToDelete?.name}"?
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained" 
            color="error"
            startIcon={<DeleteIcon />}
          >
            Deletar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Dashboard; 