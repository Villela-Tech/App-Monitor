import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import api from '../config/api';
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
import AddIcon from '@mui/icons-material/Add';
import PublicIcon from '@mui/icons-material/Public';
import { motion } from 'framer-motion';
import { useNotification } from '../contexts/NotificationContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ShieldIcon from '@mui/icons-material/Shield';
import ListAltIcon from '@mui/icons-material/ListAlt';

const MotionContainer = styled(motion.div)({
  display: 'flex',
  flexDirection: 'column',
  gap: 24
});

const StatsCard = styled(Card)(({ theme }) => ({
  background: 'rgba(20, 28, 36, 0.95)',
  color: '#fff',
  borderRadius: 16,
  boxShadow: 'none',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2, 3),
  border: '1px solid rgba(255,255,255,0.05)',
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
  background: 'rgba(20, 28, 33, 0.85)',
  backdropFilter: 'blur(12px) saturate(180%)',
  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
  color: '#fff',
  borderRadius: 20,
  boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255,255,255,0.06)',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.25s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 6px 25px 0 rgba(0, 0, 0, 0.3)',
  }
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
  gap: theme.spacing(2.5),
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  [theme.breakpoints.up('xl')]: {
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))'
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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState(null);
  const { isSmallScreen, isMobile } = useBreakpoint();
  const [websocket, setWebsocket] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchSites = useCallback(async () => {
    try {
      const response = await axios.get(api.sites.list());
      setSites(response.data);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar sites:', err);
      showError('Erro ao carregar sites. Por favor, tente novamente.');
      setError('Erro ao carregar sites. Por favor, tente novamente.');
      setLoading(false);
    }
  }, [showError]);

  // Atualização automática dos dados
  useEffect(() => {
    // Primeira carga dos dados
    fetchSites();

    const updateInterval = setInterval(() => {
      fetchSites();
    }, 5000); // Atualiza a cada 5 segundos

    return () => clearInterval(updateInterval);
  }, [fetchSites]);

  // Atualização via WebSocket
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let isConnecting = false;
    let isUnmounting = false;

    const connect = () => {
      if (isConnecting || isUnmounting) return;
      
      isConnecting = true;
      ws = new WebSocket(api.websocket.connect());

      ws.onopen = () => {
        console.log('WebSocket conectado');
        setWebsocket(ws);
        isConnecting = false;
        // Carregar dados iniciais
        fetchSites();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'siteUpdate') {
            setSites(prevSites => {
              return prevSites.map(site => {
                if (site.id === data.siteId) {
                  return { ...site, ...data.data };
                }
                return site;
              });
            });
          }
        } catch (error) {
          console.error('Erro ao processar mensagem do WebSocket:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Erro no WebSocket:', error);
        if (!isUnmounting) {
          setWebsocket(null);
          // Tentar reconectar em caso de erro
          reconnectTimeout = setTimeout(connect, 5000);
        }
      };

      ws.onclose = () => {
        if (!isUnmounting) {
          setWebsocket(null);
          // Tentar reconectar em caso de fechamento
          if (!isConnecting) {
            reconnectTimeout = setTimeout(connect, 5000);
          }
        }
      };
    };

    connect();

    return () => {
      isUnmounting = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [fetchSites]);

  const handleRefresh = async (id, siteName) => {
    try {
      await axios.post(api.sites.check(id));
      showSuccess(`Verificação iniciada para ${siteName}`);
    } catch (error) {
      console.error('Erro ao verificar site:', error);
      showError('Erro ao verificar site');
    }
  };

  const handleDeleteClick = (site) => {
    setSiteToDelete(site);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(api.sites.delete(siteToDelete.id));
      setSites(sites.filter(site => site.id !== siteToDelete.id));
      setDeleteDialogOpen(false);
      setSiteToDelete(null);
      showSuccess('Site deletado com sucesso');
    } catch (error) {
      console.error('Erro ao deletar site:', error);
      showError('Erro ao deletar site');
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
    const matchesCategory = categoryFilter === 'all' || site.category === categoryFilter;
    const matchesType = typeFilter === 'all' || site.type === typeFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesType;
  });

  const stats = {
    total: sites.length,
    up: sites.filter(s => s.status === 'up').length,
    down: sites.filter(s => s.status === 'down').length,
    warning: sites.filter(s => s.sslInfo?.daysRemaining <= 30).length,
    ips: sites.filter(s => s.type === 'ip').length
  };

  // Função para obter o favicon de um site ou ícone para IP
  const getFavicon = (url, type) => {
    if (type === 'ip') {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23b0b8c1'%3E%3Cpath d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z'/%3E%3C/svg%3E";
    }
    
    try {
      const hostname = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    } catch (e) {
      return null;
    }
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
        mt: { xs: 0, sm: 0, md: 0 }, 
        mb: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1, sm: 2, md: 3 },
        pt: { xs: 3, sm: 4, md: 5 },
        position: 'relative',
        minHeight: '100vh',
        '::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          background: 'radial-gradient(circle at 60% 20%, #1e3f4a22 0%, transparent 60%), radial-gradient(circle at 20% 80%, #12324222 0%, transparent 70%)',
          pointerEvents: 'none',
        }
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

        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)'
            },
            gap: { xs: 2, md: 3 },
            mb: { xs: 3, sm: 4 }
          }}
        >
          <StatsCard>
            <Box sx={{ mr: 2, color: '#7b8a99', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40 }}>
              <ListAltIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#7b8a99', mb: 0.5 }}>
                Total de Sites/IPs
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stats.total}
              </Typography>
            </Box>
          </StatsCard>

          <StatsCard>
            <Box sx={{ mr: 2, color: '#1aa053', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', bgcolor: 'rgba(26, 160, 83, 0.1)' }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#7b8a99', mb: 0.5 }}>
                Sites Online
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1aa053' }}>
                {stats.up}
              </Typography>
            </Box>
          </StatsCard>

          <StatsCard>
            <Box sx={{ mr: 2, color: '#d63939', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', bgcolor: 'rgba(214, 57, 57, 0.1)' }}>
              <HighlightOffIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#7b8a99', mb: 0.5 }}>
                Sites Offline
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#d63939' }}>
                {stats.down}
              </Typography>
            </Box>
          </StatsCard>

          <StatsCard>
            <Box sx={{ mr: 2, color: '#f59f00', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', bgcolor: 'rgba(245, 159, 0, 0.1)' }}>
              <ShieldIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#7b8a99', mb: 0.5 }}>
                Alertas SSL
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f59f00' }}>
                {stats.warning}
              </Typography>
            </Box>
          </StatsCard>
        </Box>

        <Box sx={{ 
          backgroundColor: 'rgba(20, 28, 36, 0.95)', 
          borderRadius: 30, 
          mb: 4,
          border: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          p: { xs: 1.5, sm: 2 },
          boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, pl: 1.5 }}>
            <SearchIcon sx={{ mr: 1.5, color: '#7b8a99' }} />
            <TextField
              placeholder="Pesquisar sites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="standard"
              fullWidth
              InputProps={{
                disableUnderline: true,
                sx: { 
                  color: '#fff',
                  fontSize: '1rem',
                  '& input::placeholder': {
                    color: '#7b8a99',
                    opacity: 1
                  }
                }
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, ml: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ color: '#7b8a99', fontSize: '0.75rem', mb: 0.5 }}>
                Status
              </Typography>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                displayEmpty
                variant="standard"
                disableUnderline
                sx={{ 
                  color: '#fff',
                  fontSize: '0.875rem',
                  '& .MuiSelect-select': { 
                    paddingBottom: 0,
                    display: 'flex',
                    alignItems: 'center'
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#7b8a99'
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: 'rgba(30, 40, 50, 0.95)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 1
                    }
                  }
                }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="up">Online</MenuItem>
                <MenuItem value="down">Offline</MenuItem>
              </Select>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#7b8a99', fontSize: '0.75rem', mb: 0.5 }}>
                Categoria
              </Typography>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                displayEmpty
                variant="standard"
                disableUnderline
                sx={{ 
                  color: '#fff',
                  fontSize: '0.875rem',
                  '& .MuiSelect-select': { 
                    paddingBottom: 0,
                    display: 'flex',
                    alignItems: 'center'
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#7b8a99'
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: 'rgba(30, 40, 50, 0.95)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 1
                    }
                  }
                }}
              >
                <MenuItem value="all">Todas</MenuItem>
                <MenuItem value="website">Website</MenuItem>
                <MenuItem value="application">Aplicação</MenuItem>
                <MenuItem value="api">API</MenuItem>
                <MenuItem value="domain">Domínio</MenuItem>
                <MenuItem value="other">Outro</MenuItem>
              </Select>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#7b8a99', fontSize: '0.75rem', mb: 0.5 }}>
                Tipo
              </Typography>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                displayEmpty
                variant="standard"
                disableUnderline
                sx={{ 
                  color: '#fff',
                  fontSize: '0.875rem',
                  '& .MuiSelect-select': { 
                    paddingBottom: 0,
                    display: 'flex',
                    alignItems: 'center'
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#7b8a99'
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: 'rgba(30, 40, 50, 0.95)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 1
                    }
                  }
                }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="url">Sites</MenuItem>
                <MenuItem value="ip">IPs</MenuItem>
              </Select>
            </Box>
          </Box>
        </Box>

        <ResponsiveGrid>
          {filteredSites.map((site) => (
            <motion.div
              key={site.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <StyledCard>
                <CardContent sx={{ p: isSmallScreen ? 2.5 : 3, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: 180 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, width: '100%' }}>
                    <Box 
                      component="img"
                      src={getFavicon(site.url, site.type)}
                      alt=""
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23b0b8c1'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z'/%3E%3C/svg%3E";
                      }}
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        mr: 1.5,
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        padding: '2px'
                      }}
                    />
                    <Typography 
                      variant={isSmallScreen ? 'subtitle1' : 'h6'} 
                      component="div"
                      noWrap
                      sx={{ fontWeight: 700, flex: 1 }}
                    >
                      {site.name}
                    </Typography>
                  </Box>
                  <Typography 
                    color="#b0b8c1" 
                    sx={{ 
                      wordBreak: 'break-all', 
                      mb: 2, 
                      fontSize: isSmallScreen ? '0.85rem' : '0.95rem', 
                      fontWeight: 400 
                    }}
                  >
                    {site.url}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 1 }}>
                    <Chip
                      icon={<span style={{ 
                        width: 10, 
                        height: 10, 
                        backgroundColor: site.status === 'up' ? '#19c37d' : '#ff3b3b', 
                        borderRadius: '50%',
                        display: 'inline-block'
                      }} />}
                      label={site.status.toUpperCase()}
                      sx={{
                        bgcolor: 'rgba(34, 38, 43, 0.95)',
                        color: site.status === 'up' ? '#19c37d' : '#ff3b3b',
                        fontWeight: 700,
                        px: 1.5,
                        py: 0.5,
                        fontSize: '0.8rem',
                        borderRadius: 1.5,
                        height: 24
                      }}
                      size="small"
                    />
                    <Box>
                      <IconButton
                        size="small"
                        aria-label="Ver detalhes"
                        component={RouterLink}
                        to={`/site/${site.id}`}
                        sx={{ 
                          color: 'rgba(255,255,255,0.7)', 
                          '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                          padding: 0.5,
                          mr: 0.5
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Deletar site"
                        onClick={() => handleDeleteClick(site)}
                        sx={{ 
                          color: 'rgba(255,255,255,0.7)', 
                          '&:hover': { color: '#ff5252', bgcolor: 'rgba(255,0,0,0.1)' },
                          padding: 0.5
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: site.responseTime > 1000 ? '#ffd600' : '#fff',
                      mt: 0.5,
                      fontSize: isSmallScreen ? '1.8rem' : '2rem',
                      letterSpacing: 0
                    }}
                  >
                    {site.responseTime}ms
                  </Typography>
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