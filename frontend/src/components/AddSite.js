import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  MenuItem
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
      const response = await axios.post('http://localhost:5000/api/sites', formData);
      showSuccess('Site adicionado com sucesso!');
      navigate(`/site/${response.data.id}`);
    } catch (error) {
      console.error('Erro ao adicionar site:', error);
      showError(
        error.response?.data || 
        'Erro ao adicionar site. Por favor, verifique os dados e tente novamente.'
      );
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
            Adicionar Novo Site
          </Typography>
        </Box>

        <Form onSubmit={handleSubmit}>
          <TextField
            required
            fullWidth
            label="Nome do Site"
            name="name"
            value={formData.name}
            onChange={handleChange}
            variant="outlined"
          />

          <TextField
            required
            fullWidth
            label="URL"
            name="url"
            value={formData.url}
            onChange={handleChange}
            variant="outlined"
            placeholder="https://exemplo.com"
            helperText="Inclua o protocolo (http:// ou https://)"
          />

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
              <MenuItem value="other">Outro</MenuItem>
            </Select>
          </FormControl>

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
              label="Notificar quando o site estiver fora do ar"
            />

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
              {loading ? 'Adicionando...' : 'Adicionar Site'}
            </Button>
          </Box>
        </Form>
      </StyledPaper>
    </Container>
  );
}

export default AddSite; 