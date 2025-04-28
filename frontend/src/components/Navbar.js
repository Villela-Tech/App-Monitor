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
import { useTheme } from '../contexts/ThemeContext';

function Navbar() {
  const { darkMode, toggleTheme } = useTheme();
  const muiTheme = useMuiTheme();

  return (
    <AppBar 
      position="static" 
      elevation={darkMode ? 0 : 1}
      sx={{
        backdropFilter: 'blur(8px)',
        backgroundColor: darkMode 
          ? 'rgba(18, 18, 18, 0.8)' 
          : muiTheme.palette.primary.main,
        color: darkMode ? undefined : '#fff',
      }}
    >
      <Toolbar>
        <MonitorHeartIcon sx={{ mr: 2 }} />
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1,
            fontWeight: 500
          }}
        >
          <RouterLink to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            Monitor de Sites
          </RouterLink>
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={darkMode ? "Modo Claro" : "Modo Escuro"}>
            <IconButton 
              onClick={toggleTheme} 
              sx={{ 
                color: darkMode ? undefined : '#fff',
                '&:hover': {
                  backgroundColor: darkMode 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.2)'
                }
              }}
            >
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
          <Button
            variant={darkMode ? "text" : "outlined"}
            component={RouterLink}
            to="/add"
            startIcon={<AddIcon />}
            sx={{
              color: darkMode ? undefined : '#fff',
              borderColor: darkMode ? undefined : 'rgba(255, 255, 255, 0.5)',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: darkMode 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(255, 255, 255, 0.2)',
                borderColor: darkMode ? undefined : 'rgba(255, 255, 255, 0.8)',
              },
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