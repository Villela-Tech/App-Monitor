import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Paper,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Button,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  FormControlLabel,
  Switch,
  FormGroup
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import TimelineIcon from '@mui/icons-material/Timeline';
import { styled } from '@mui/material/styles';
import { useNotification } from '../contexts/NotificationContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { MotionContainer } from '../components/MotionContainer';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DomainVerificationIcon from '@mui/icons-material/DomainVerification';
import SecurityIcon from '@mui/icons-material/Security';
import { alpha } from '@mui/material/styles';
import { LineChart } from '@mui/x-charts';

const StyledGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(3),
  gridTemplateColumns: {
    xs: '1fr',
    md: 'repeat(2, 1fr)'
  }
}));

const ResponsiveContainer = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
  }
}));

const ResponsiveCard = styled(Card)(({ theme }) => ({
  margin: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    margin: theme.spacing(1),
  }
}));

const GridContainer = styled(Grid)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(1),
  }
}));

const StyledGridItem = styled(Grid)(({ theme }) => ({
  flex: '1 1 300px',
  [theme.breakpoints.down('sm')]: {
    flex: '1 1 100%',
  }
}));

const NotificationSwitch = styled(Switch)(({ theme }) => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: theme.palette.primary.main,
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity),
    },
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: theme.palette.primary.main,
  },
}));

function SiteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openSettingsDialog, setOpenSettingsDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    url: '',
    email: ''
  });
  const [notificationSettings, setNotificationSettings] = useState({
    downtime: false,
    sslExpiry: false,
    domainExpiry: false
  });
  const { showSuccess, showError, showInfo } = useNotification();
  const { isSmallScreen, isMobile } = useBreakpoint();

  const fetchSite = useCallback(async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/sites/${id}`);
      setSite(response.data);
      setEditForm({
        name: response.data.name,
        url: response.data.url,
        email: response.data.notifications?.email || ''
      });
      setNotificationSettings({
        downtime: response.data.notifications?.downtime || false,
        sslExpiry: response.data.notifications?.sslExpiry || false,
        domainExpiry: response.data.notifications?.domainExpiry || false
      });
    } catch (error) {
      console.error('Erro ao carregar detalhes do site:', error);
      showError('Erro ao carregar detalhes do site. Por favor, tente novamente.');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showError]);

  useEffect(() => {
    fetchSite();
  }, [fetchSite]);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      showInfo('Atualizando status do site...');
      await axios.post(`http://localhost:5000/api/sites/${id}/check`);
      await fetchSite();
      showSuccess('Status do site atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar site:', error);
      showError('Erro ao atualizar site. Por favor, tente novamente.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/sites/${id}`);
      showSuccess('Site deletado com sucesso!');
      navigate('/');
    } catch (error) {
      console.error('Erro ao deletar site:', error);
      showError('Erro ao deletar site. Por favor, tente novamente.');
    }
  };

  const handleEdit = async () => {
    try {
      await axios.put(`http://localhost:5000/api/sites/${id}`, editForm);
      setOpenEditDialog(false);
      showSuccess('Site atualizado com sucesso!');
      await fetchSite();
    } catch (error) {
      console.error('Erro ao editar site:', error);
      showError('Erro ao editar site. Por favor, tente novamente.');
    }
  };

  const handleSettingsSave = async () => {
    try {
      await axios.put(`http://localhost:5000/api/sites/${id}/notifications`, notificationSettings);
      setOpenSettingsDialog(false);
      showSuccess('Configurações de notificação atualizadas com sucesso!');
      await fetchSite();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      showError('Erro ao salvar configurações. Por favor, tente novamente.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'up':
        return 'success';
      case 'down':
        return 'error';
      default:
        return 'default';
    }
  };

  const getResponseTimeColor = (time) => {
    if (time < 300) return 'success';
    if (time < 1000) return 'warning';
    return 'error';
  };

  const formatDate = (date) => {
    if (!date || new Date(date).getTime() <= 0) {
      return 'Não disponível';
    }
    return new Date(date).toLocaleDateString();
  };

  const getDaysRemaining = (info) => {
    if (!info?.daysRemaining || info.daysRemaining < 0) {
      return 'Não disponível';
    }
    return `${info.daysRemaining} dias restantes`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!site) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Site não encontrado</Alert>
      </Container>
    );
  }

  return (
    <ResponsiveContainer>
      <Box sx={{ mb: isSmallScreen ? 2 : 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          size={isSmallScreen ? "small" : "medium"}
          sx={{ mb: 2 }}
        >
          Voltar
        </Button>
        <Typography variant={isSmallScreen ? "h5" : "h4"} component="h1" gutterBottom>
          {site.name}
        </Typography>
      </Box>

      <GridContainer container>
        <StyledGridItem>
          <ResponsiveCard>
            <CardHeader 
              title="Status do Site"
              titleTypography={{ variant: isSmallScreen ? 'h6' : 'h5' }}
            />
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" gutterBottom>
                  Status
                </Typography>
                <Chip
                  label={site.status.toUpperCase()}
                  color={getStatusColor(site.status)}
                  sx={{ mr: 1 }}
                />
              </Box>
              {site.responseTime && (
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" gutterBottom>
                    Tempo de Resposta
                  </Typography>
                  <Chip
                    label={`${site.responseTime}ms`}
                    color={getResponseTimeColor(site.responseTime)}
                    sx={{ mr: 1 }}
                  />
                </Box>
              )}
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Última verificação: {new Date(site.lastCheck).toLocaleString()}
              </Typography>
            </CardContent>
          </ResponsiveCard>
        </StyledGridItem>

        <StyledGridItem>
          <ResponsiveCard>
            <CardHeader 
              title="Certificado SSL"
              titleTypography={{ variant: isSmallScreen ? 'h6' : 'h5' }}
            />
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" gutterBottom>
                  Certificado SSL
                </Typography>
                {site.sslInfo && (
                  <Chip
                    label={getDaysRemaining(site.sslInfo)}
                    color={site.sslInfo.daysRemaining <= 30 ? 'warning' : 'success'}
                    size="small"
                  />
                )}
              </Box>
              {site.sslInfo ? (
                <>
                  <Typography variant="body2" color="textSecondary">
                    Válido até: {formatDate(site.sslInfo.validTo)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Emissor: {site.sslInfo.issuer || 'Não disponível'}
                  </Typography>
                </>
              ) : (
                <Alert severity="error" sx={{ mt: 1 }}>
                  Informações SSL não disponíveis
                </Alert>
              )}
            </CardContent>
          </ResponsiveCard>
        </StyledGridItem>

        <StyledGridItem>
          <ResponsiveCard>
            <CardHeader 
              title="Informações do Domínio"
              titleTypography={{ variant: isSmallScreen ? 'h6' : 'h5' }}
            />
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" gutterBottom>
                  Informações do Domínio
                </Typography>
                {site.domainInfo && (
                  <Chip
                    label={getDaysRemaining(site.domainInfo)}
                    color={site.domainInfo.daysRemaining <= 30 ? 'warning' : 'success'}
                    size="small"
                  />
                )}
              </Box>
              {site.domainInfo ? (
                <>
                  <Typography variant="body2" color="textSecondary">
                    Expira em: {formatDate(site.domainInfo.expiryDate)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Registrador: {site.domainInfo.registrar || 'Não disponível'}
                  </Typography>
                </>
              ) : (
                <Alert severity="error" sx={{ mt: 1 }}>
                  Informações do domínio não disponíveis
                </Alert>
              )}
            </CardContent>
          </ResponsiveCard>
        </StyledGridItem>

        <StyledGridItem>
          <ResponsiveCard>
            <CardHeader 
              title="Configurações de Notificação"
              titleTypography={{ variant: isSmallScreen ? 'h6' : 'h5' }}
            />
            <CardContent>
              <FormGroup>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <NotificationsActiveIcon color="action" sx={{ mr: 1 }} />
                  <FormControlLabel
                    control={
                      <NotificationSwitch
                        checked={notificationSettings.downtime}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, downtime: e.target.checked }))}
                        size={isSmallScreen ? "small" : "medium"}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Notificar quando o site estiver fora do ar
                      </Typography>
                    }
                  />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SecurityIcon color="action" sx={{ mr: 1 }} />
                  <FormControlLabel
                    control={
                      <NotificationSwitch
                        checked={notificationSettings.sslExpiry}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, sslExpiry: e.target.checked }))}
                        size={isSmallScreen ? "small" : "medium"}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Notificar quando o certificado SSL estiver próximo de expirar
                      </Typography>
                    }
                  />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DomainVerificationIcon color="action" sx={{ mr: 1 }} />
                  <FormControlLabel
                    control={
                      <NotificationSwitch
                        checked={notificationSettings.domainExpiry}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, domainExpiry: e.target.checked }))}
                        size={isSmallScreen ? "small" : "medium"}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Notificar quando o domínio estiver próximo de expirar
                      </Typography>
                    }
                  />
                </Box>
              </FormGroup>
            </CardContent>
          </ResponsiveCard>
        </StyledGridItem>

        <StyledGridItem>
          <ResponsiveCard>
            <CardHeader 
              title="Tempo de Resposta"
              titleTypography={{ variant: isSmallScreen ? 'h6' : 'h5' }}
            />
            <CardContent>
              {site.responseTime ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2 
                }}>
                  <Typography variant="h3" color={getResponseTimeColor(site.responseTime)}>
                    {site.responseTime}
                    <Typography component="span" variant="h6" color="textSecondary">
                      ms
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Última verificação: {new Date(site.lastCheck).toLocaleString()}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Tempo de resposta não disponível
                </Typography>
              )}
            </CardContent>
          </ResponsiveCard>
        </StyledGridItem>
      </GridContainer>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Tooltip title="Atualizar Status">
            <IconButton onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar Site">
            <IconButton onClick={() => setOpenEditDialog(true)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Deletar Site">
            <IconButton color="error" onClick={handleDelete}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Box>
          <Tooltip title="Configurar Notificações">
            <IconButton size="small" onClick={() => setOpenSettingsDialog(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Editar Site</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome"
            type="text"
            fullWidth
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="URL"
            type="url"
            fullWidth
            value={editForm.url}
            onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancelar</Button>
          <Button onClick={handleEdit} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openSettingsDialog} onClose={() => setOpenSettingsDialog(false)}>
        <DialogTitle>Configurar Notificações</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Ativar notificações para:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant={notificationSettings.downtime ? "contained" : "outlined"}
                onClick={() => setNotificationSettings(prev => ({ ...prev, downtime: !prev.downtime }))}
                fullWidth
              >
                Downtime
              </Button>
              <Button
                variant={notificationSettings.sslExpiry ? "contained" : "outlined"}
                onClick={() => setNotificationSettings(prev => ({ ...prev, sslExpiry: !prev.sslExpiry }))}
                fullWidth
              >
                Expiração SSL
              </Button>
              <Button
                variant={notificationSettings.domainExpiry ? "contained" : "outlined"}
                onClick={() => setNotificationSettings(prev => ({ ...prev, domainExpiry: !prev.domainExpiry }))}
                fullWidth
              >
                Expiração Domínio
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSettingsDialog(false)}>Cancelar</Button>
          <Button onClick={handleSettingsSave} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>
    </ResponsiveContainer>
  );
}

export default SiteDetails; 