import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../config/api';
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
  FormGroup,
  InputLabel,
  Select,
  MenuItem,
  FormControl
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
import DnsIcon from '@mui/icons-material/Dns';
import RouterIcon from '@mui/icons-material/Router';
import StorageIcon from '@mui/icons-material/Storage';
import LanguageIcon from '@mui/icons-material/Language';
import PublicIcon from '@mui/icons-material/Public';

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
    email: '',
    category: 'website'
  });
  const [notificationSettings, setNotificationSettings] = useState({
    downtime: false,
    sslExpiry: false,
    domainExpiry: false
  });
  const { showSuccess, showError, showInfo } = useNotification();
  const { isSmallScreen, isMobile } = useBreakpoint();
  const [metrics, setMetrics] = useState({
    responseTimeData: [],
    timestamps: []
  });
  const [ws, setWs] = useState(null);
  const [hasAnomaly, setHasAnomaly] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await axios.get(api.sites.metrics(id));
      if (response.data && response.data.responseTimeData) {
        setMetrics(response.data);
      }
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    }
  }, [id]);

  const fetchSite = useCallback(async () => {
    try {
      const response = await axios.get(api.sites.get(id));
      setSite(response.data);
      setEditForm({
        name: response.data.name,
        url: response.data.url,
        email: response.data.notifications?.email || '',
        category: response.data.category || 'website'
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
    fetchMetrics();

    const updateInterval = setInterval(() => {
      fetchSite();
      fetchMetrics();
    }, 5000);

    return () => clearInterval(updateInterval);
  }, [fetchSite, fetchMetrics]);

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
        setWs(ws);
        isConnecting = false;
        fetchSite();
        fetchMetrics();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'siteUpdate' && data.siteId === parseInt(id)) {
            setSite(prevSite => ({
              ...prevSite,
              ...data.data
            }));
            setHasAnomaly(data.data.isAnomalous);
            fetchMetrics();
          }
        } catch (error) {
          console.error('Erro ao processar mensagem do WebSocket:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Erro no WebSocket:', error);
        if (!isUnmounting) {
          setWs(null);
          reconnectTimeout = setTimeout(connect, 5000);
        }
      };

      ws.onclose = () => {
        if (!isUnmounting) {
          setWs(null);
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
  }, [id, fetchSite, fetchMetrics]);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      showInfo('Atualizando status do site...');
      await axios.post(api.sites.check(id));
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
      await axios.delete(api.sites.delete(id));
      showSuccess('Site deletado com sucesso!');
      navigate('/');
    } catch (error) {
      console.error('Erro ao deletar site:', error);
      showError('Erro ao deletar site. Por favor, tente novamente.');
    }
  };

  const handleEdit = async () => {
    try {
      await axios.put(api.sites.update(id), editForm);
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
      await axios.put(api.sites.notifications(id), notificationSettings);
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

  const handleCheckPorts = async () => {
    try {
      showInfo('Verificando portas...');
      const response = await axios.post(api.sites.checkPorts(id));
      setSite(prevSite => ({
        ...prevSite,
        ipInfo: {
          ...(prevSite.ipInfo || {}),
          ports: response.data.ports,
          lastPortCheck: new Date().toISOString()
        }
      }));
      showSuccess('Portas verificadas com sucesso!');
    } catch (error) {
      console.error('Erro ao verificar portas:', error);
      showError('Erro ao verificar portas');
    }
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

  const renderActions = () => (
    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
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
  );

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant={isSmallScreen ? "h5" : "h4"} component="h1">
            {site.name} {site.type === 'ip' ? '(IP)' : '(Site)'}
          </Typography>
          <Chip
            label={site.category}
            color="primary"
            size={isSmallScreen ? "small" : "medium"}
          />
          {hasAnomaly && (
            <Chip
              label="Anomalia Detectada"
              color="error"
              size={isSmallScreen ? "small" : "medium"}
            />
          )}
        </Box>
      </Box>

      <GridContainer container>
        <StyledGridItem>
          <ResponsiveCard>
            <CardHeader 
              title={site.type === 'ip' ? "Status do IP" : "Status do Site"}
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
                    {site.type === 'ip' ? 'Latência' : 'Tempo de Resposta'}
                  </Typography>
                  <Chip
                    label={`${site.responseTime}ms`}
                    color={getResponseTimeColor(site.responseTime)}
                    sx={{ mr: 1 }}
                  />
                </Box>
              )}
              {site.type === 'ip' && site.ipInfo?.packetLoss !== undefined && (
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" gutterBottom>
                    Perda de Pacotes
                  </Typography>
                  <Chip
                    label={`${site.ipInfo.packetLoss}%`}
                    color={site.ipInfo.packetLoss > 0 ? 'warning' : 'success'}
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

        {site.type === 'ip' && (
          <StyledGridItem>
            <ResponsiveCard>
              <CardHeader 
                title="Informações do IP"
                titleTypography={{ variant: isSmallScreen ? 'h6' : 'h5' }}
                avatar={<PublicIcon />}
              />
              <CardContent>
                {site.ipInfo ? (
                  <Box>
                    <Typography variant="body1" gutterBottom>
                      <strong>IP:</strong> {site.url}
                    </Typography>
                    {site.ipInfo.country && (
                      <Typography variant="body1" gutterBottom>
                        <strong>País:</strong> {site.ipInfo.country} ({site.ipInfo.countryCode})
                      </Typography>
                    )}
                    {site.ipInfo.city && (
                      <Typography variant="body1" gutterBottom>
                        <strong>Localização:</strong> {site.ipInfo.city}, {site.ipInfo.regionName}
                      </Typography>
                    )}
                    {site.ipInfo.isp && (
                      <Typography variant="body1" gutterBottom>
                        <strong>ISP:</strong> {site.ipInfo.isp}
                      </Typography>
                    )}
                    {site.ipInfo.org && (
                      <Typography variant="body1" gutterBottom>
                        <strong>Organização:</strong> {site.ipInfo.org}
                      </Typography>
                    )}
                    {site.ipInfo.reverseDns && (
                      <Typography variant="body1" gutterBottom>
                        <strong>DNS Reverso:</strong> {site.ipInfo.reverseDns}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Alert severity="info">
                    Informações do IP não disponíveis
                  </Alert>
                )}
              </CardContent>
            </ResponsiveCard>
          </StyledGridItem>
        )}

        {site.type === 'ip' && (
          <StyledGridItem>
            <ResponsiveCard>
              <CardHeader 
                title="Portas"
                titleTypography={{ variant: isSmallScreen ? 'h6' : 'h5' }}
                avatar={<RouterIcon />}
                action={
                  <Tooltip title="Verificar portas">
                    <IconButton onClick={handleCheckPorts}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                }
              />
              <CardContent>
                {site.ipInfo?.ports ? (
                  <Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Última verificação: {new Date(site.ipInfo.lastPortCheck || site.lastCheck).toLocaleString()}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {Object.entries(site.ipInfo.ports).map(([port, info]) => (
                        <Chip
                          key={port}
                          label={`${port}: ${info.status}`}
                          color={info.status === 'open' ? 'success' : 'default'}
                          size="small"
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Informações de portas não disponíveis
                    </Alert>
                    <Button 
                      variant="outlined" 
                      startIcon={<RefreshIcon />}
                      onClick={handleCheckPorts}
                    >
                      Verificar Portas
                    </Button>
                  </Box>
                )}
              </CardContent>
            </ResponsiveCard>
          </StyledGridItem>
        )}

        {site.type !== 'ip' && (
          <>
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
                      <Typography variant="body2" color="textSecondary">
                        Proprietário: {site.domainInfo.owner || 'Não disponível'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Email: {site.domainInfo.email || 'Não disponível'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        País: {site.domainInfo.country || 'Não disponível'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Criado em: {formatDate(site.domainInfo.creationDate)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Última atualização: {formatDate(site.domainInfo.updatedDate)}
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        Nameservers:
                      </Typography>
                      {Array.isArray(site.domainInfo.nameservers) ? (
                        site.domainInfo.nameservers.map((ns, index) => (
                          <Typography key={index} variant="body2" color="textSecondary">
                            • {ns}
                          </Typography>
                        ))
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          Não disponível
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      Informações do domínio não disponíveis
                    </Alert>
                  )}
                </CardContent>
              </ResponsiveCard>
            </StyledGridItem>
          </>
        )}

        <StyledGridItem>
          <ResponsiveCard>
            <CardHeader 
              title="Registros DNS"
              titleTypography={{ variant: isSmallScreen ? 'h6' : 'h5' }}
              avatar={<DnsIcon />}
            />
            <CardContent>
              {site.dnsInfo ? (
                <>
                  {site.dnsInfo.a && site.dnsInfo.a.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Registros A:
                      </Typography>
                      {site.dnsInfo.a.map((record, index) => (
                        <Chip
                          key={index}
                          label={record}
                          size="small"
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}

                  {site.dnsInfo.aaaa && site.dnsInfo.aaaa.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Registros AAAA:
                      </Typography>
                      {site.dnsInfo.aaaa.map((record, index) => (
                        <Chip
                          key={index}
                          label={record}
                          size="small"
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}

                  {site.dnsInfo.mx && site.dnsInfo.mx.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Registros MX:
                      </Typography>
                      {site.dnsInfo.mx.map((record, index) => (
                        <Chip
                          key={index}
                          label={`${record.exchange} (${record.priority})`}
                          size="small"
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}

                  {site.dnsInfo.ns && site.dnsInfo.ns.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Registros NS:
                      </Typography>
                      {site.dnsInfo.ns.map((record, index) => (
                        <Chip
                          key={index}
                          label={record}
                          size="small"
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Propagação DNS:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {site.dnsInfo.propagation.map((check, index) => (
                      <Chip
                        key={index}
                        label={check.server}
                        color={check.propagated ? 'success' : 'error'}
                        size="small"
                      />
                    ))}
                  </Box>

                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
                    Última verificação: {new Date(site.dnsInfo.lastCheck).toLocaleString()}
                  </Typography>
                </>
              ) : (
                <Alert severity="error">
                  Informações de DNS não disponíveis
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
              {site?.responseTime ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2 
                }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                    <CircularProgress
                      variant="determinate"
                      value={Math.min((site.responseTime / 1000) * 100, 100)}
                      size={120}
                      thickness={8}
                      sx={{
                        color: site.responseTime < 300 ? theme.palette.success.main :
                              site.responseTime < 1000 ? theme.palette.warning.main :
                              theme.palette.error.main
                      }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column'
                      }}
                    >
                      <Typography variant="h4" component="div" color="text.primary">
                        {site.responseTime}
                      </Typography>
                      <Typography variant="caption" component="div" color="text.secondary">
                        ms
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ width: '100%', textAlign: 'center' }}>
                    <Typography 
                      variant="body1" 
                      color={
                        site.responseTime < 300 ? 'success.main' :
                        site.responseTime < 1000 ? 'warning.main' :
                        'error.main'
                      }
                      fontWeight="bold"
                    >
                      {site.responseTime < 300 ? 'Excelente' :
                       site.responseTime < 1000 ? 'Regular' :
                       'Lento'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Última verificação: {new Date(site.lastCheck).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    Aguardando primeira verificação...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    O tempo de resposta será medido em breve
                  </Typography>
                </Box>
              )}
            </CardContent>
          </ResponsiveCard>
        </StyledGridItem>

        <StyledGridItem>
          <ResponsiveCard>
            <CardHeader 
              title="Histórico de Desempenho"
              titleTypography={{ variant: isSmallScreen ? 'h6' : 'h5' }}
            />
            <CardContent>
              {metrics.responseTimeData.length > 0 ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Acompanhe o desempenho do site nas últimas 24 horas
                  </Typography>
                  <Box sx={{ width: '100%', height: 300, position: 'relative' }}>
                    <LineChart
                      xAxis={[{ 
                        data: metrics.timestamps,
                        scaleType: 'band',
                        label: 'Horário',
                        tickLabelStyle: {
                          angle: 45,
                          textAnchor: 'start',
                          fontSize: 12
                        }
                      }]}
                      yAxis={[{
                        label: 'Tempo (ms)',
                        min: 0,
                        max: Math.max(...metrics.responseTimeData.map(d => d.responseTime || 0)) + 100,
                        tickCount: 5
                      }]}
                      series={[
                        {
                          data: metrics.responseTimeData.map(d => d.responseTime || 0),
                          area: true,
                          color: theme.palette.primary.main,
                          label: 'Tempo de resposta',
                          showMark: true,
                          valueFormatter: (value) => `${value}ms`,
                          curve: "natural",
                          area: {
                            opacity: 0.2
                          },
                          line: {
                            strokeWidth: 2
                          }
                        }
                      ]}
                      height={300}
                      margin={{ left: 60, right: 20, top: 20, bottom: 50 }}
                      sx={{
                        '.MuiLineElement-root': {
                          strokeWidth: 2,
                        },
                        '.MuiChartsAxis-label': {
                          fontSize: '0.875rem',
                          fontWeight: 500
                        },
                        '.MuiChartsAxis-tick': {
                          stroke: theme.palette.text.secondary
                        },
                        '.MuiChartsAxis-line': {
                          stroke: theme.palette.divider,
                          strokeWidth: 1
                        },
                        '.MuiChartsAxis-tickLabel': {
                          fill: theme.palette.text.secondary
                        }
                      }}
                    />
                  </Box>
                  <Box sx={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 2,
                    mt: 3,
                    flexWrap: 'wrap'
                  }}>
                    <Box sx={{ 
                      p: 1, 
                      borderRadius: 1, 
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      border: `1px solid ${theme.palette.success.main}`
                    }}>
                      <Typography variant="body2" color="success.main">
                        Bom: &lt; 300ms
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      p: 1, 
                      borderRadius: 1, 
                      bgcolor: alpha(theme.palette.warning.main, 0.1),
                      border: `1px solid ${theme.palette.warning.main}`
                    }}>
                      <Typography variant="body2" color="warning.main">
                        Regular: 300ms - 1000ms
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      p: 1, 
                      borderRadius: 1, 
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      border: `1px solid ${theme.palette.error.main}`
                    }}>
                      <Typography variant="body2" color="error.main">
                        Ruim: &gt; 1000ms
                      </Typography>
                    </Box>
                  </Box>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    Coletando dados de desempenho...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    O histórico será atualizado a cada 5 segundos
                  </Typography>
                </Box>
              )}
            </CardContent>
          </ResponsiveCard>
        </StyledGridItem>
      </GridContainer>

      {renderActions()}

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
          <FormControl fullWidth margin="dense">
            <InputLabel id="category-label">Categoria</InputLabel>
            <Select
              labelId="category-label"
              name="category"
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              label="Categoria"
            >
              <MenuItem value="website">Website</MenuItem>
              <MenuItem value="application">Aplicação</MenuItem>
              <MenuItem value="api">API</MenuItem>
              <MenuItem value="domain">Domínio</MenuItem>
              <MenuItem value="other">Outro</MenuItem>
            </Select>
          </FormControl>
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