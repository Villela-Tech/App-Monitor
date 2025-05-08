import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Tooltip,
  useTheme as useMuiTheme
} from '@mui/material';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import AddIcon from '@mui/icons-material/Add';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '../contexts/ThemeContext';

function Navbar() {
  const { darkMode, toggleTheme } = useTheme();
  const muiTheme = useMuiTheme();

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: 'rgba(18, 24, 28, 0.85)',
        color: '#fff',
        boxShadow: 'none',
        height: 64,
        zIndex: 1000
      }}
    >
      <Toolbar sx={{ minHeight: 64, px: { xs: 2, sm: 4 } }}>
        <MonitorHeartIcon sx={{ mr: 2, fontSize: 28, color: '#fff' }} />
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1,
            fontWeight: 700,
            letterSpacing: 0.5,
            fontFamily: 'Inter, Roboto, Segoe UI, Arial'
          }}
        >
          <RouterLink to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            Monitor de Sites
          </RouterLink>
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            variant="contained"
            component={RouterLink}
            to="/add"
            startIcon={<ArrowBackIcon sx={{ transform: 'rotate(180deg)' }} />}
            sx={{
              color: '#fff',
              background: '#6c63ff',
              fontWeight: 700,
              borderRadius: 50,
              px: 3,
              py: 1,
              boxShadow: 'none',
              textTransform: 'none',
              '&:hover': {
                background: '#5a52d5',
                boxShadow: 'none'
              }
            }}
          >
            Adicionar Site
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar; 