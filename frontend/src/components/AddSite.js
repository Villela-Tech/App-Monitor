import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../config/api';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  FormControlLabel,
  Switch,
  CircularProgress,
  useTheme,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNotification } from '../contexts/NotificationContext';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: 16,
  backgroundColor: theme.palette.mode === 'dark' 
    ? theme.palette.background.paper 
    : '#ffffff'
}));

const Form = styled('form')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3)
}));

function AddSite() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    type: 'url',
    category: 'website',
    notifications: {
      email: '',
      downtime: true,
      sslExpiry: true,
      domainExpiry: true
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('notifications.')) {
      const notificationField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [notificationField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleTypeChange = (event, newType) => {
    if (newType !== null) {
      setFormData(prev => ({
        ...prev,
        type: newType,
        category: newType === 'ip' ? 'ip' : prev.category
      }));
    }
  };

  const handleSwitchChange = (name) => (event) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [name]: event.target.checked
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.url || !formData.notifications.email) {
      showError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(api.sites.create(), formData);
      showSuccess(formData.type === 'ip' ? 'IP adicionado com sucesso!' : 'Site adicionado com sucesso!');
      navigate('/');
    } catch (error) {
      console.error('Erro ao adicionar site/IP:', error);
      showError(`Erro ao adicionar ${formData.type === 'ip' ? 'IP' : 'site'}. Por favor, tente novamente.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <StyledPaper elevation={theme.palette.mode === 'dark' ? 2 : 1}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            Voltar
          </Button>
          <Typography variant="h5" component="h1">
            Adicionar Novo {formData.type === 'ip' ? 'IP' : 'Site'}
          </Typography>
        </Box>

        <Form onSubmit={handleSubmit}>
          <ToggleButtonGroup
            value={formData.type}
            exclusive
            onChange={handleTypeChange}
            fullWidth
            sx={{ mb: 2 }}
          >
            <ToggleButton value="url">Website/Aplicação</ToggleButton>
            <ToggleButton value="ip">Endereço IP</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            required
            fullWidth
            label="Nome"
            name="name"
            value={formData.name}
            onChange={handleChange}
            variant="outlined"
          />

          <TextField
            required
            fullWidth
            label={formData.type === 'ip' ? 'Endereço IP' : 'URL'}
            name="url"
            value={formData.url}
            onChange={handleChange}
            variant="outlined"
            placeholder={formData.type === 'ip' ? '192.168.0.1' : 'https://exemplo.com'}
            helperText={formData.type === 'ip' ? 'Digite um endereço IP válido' : 'Inclua o protocolo (http:// ou https://)'}
          />

          {formData.type === 'url' && (
            <FormControl fullWidth variant="outlined">
              <InputLabel id="category-label">Categoria</InputLabel>
              <Select
                labelId="category-label"
                name="category"
                value={formData.category}
                onChange={handleChange}
                label="Categoria"
              >
                <MenuItem value="website">Website</MenuItem>
                <MenuItem value="application">Aplicação</MenuItem>
                <MenuItem value="api">API</MenuItem>
                <MenuItem value="domain">Domínio</MenuItem>
                <MenuItem value="server">Servidor</MenuItem>
                <MenuItem value="other">Outro</MenuItem>
              </Select>
            </FormControl>
          )}

          <TextField
            required
            fullWidth
            label="Email para Notificações"
            name="notifications.email"
            value={formData.notifications.email}
            onChange={handleChange}
            variant="outlined"
            type="email"
          />

          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Configurações de Notificação
            </Typography>
          </Divider>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.notifications.downtime}
                  onChange={handleSwitchChange('downtime')}
                  color="primary"
                />
              }
              label={`Notificar quando o ${formData.type === 'ip' ? 'IP' : 'site'} estiver fora do ar`}
            />

            {formData.type === 'url' && (
              <>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.notifications.sslExpiry}
                      onChange={handleSwitchChange('sslExpiry')}
                      color="primary"
                    />
                  }
                  label="Notificar sobre expiração do certificado SSL"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.notifications.domainExpiry}
                      onChange={handleSwitchChange('domainExpiry')}
                      color="primary"
                    />
                  }
                  label="Notificar sobre expiração do domínio"
                />
              </>
            )}
          </Box>

          <Box sx={{ mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
              fullWidth
            >
              {loading ? 'Adicionando...' : `Adicionar ${formData.type === 'ip' ? 'IP' : 'Site'}`}
            </Button>
          </Box>
        </Form>
      </StyledPaper>
    </Container>
  );
}

export default AddSite; 