import React, { createContext, useContext, useState } from 'react';
import { Snackbar, Alert as MuiAlert } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationContext = createContext();

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info', // 'error' | 'warning' | 'info' | 'success'
    autoHideDuration: 6000
  });

  const showNotification = (message, severity = 'info', autoHideDuration = 6000) => {
    setNotification({
      open: true,
      message,
      severity,
      autoHideDuration
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({
      ...prev,
      open: false
    }));
  };

  // Funções auxiliares para diferentes tipos de notificações
  const showError = (message) => showNotification(message, 'error');
  const showSuccess = (message) => showNotification(message, 'success');
  const showInfo = (message) => showNotification(message, 'info');
  const showWarning = (message) => showNotification(message, 'warning');

  return (
    <NotificationContext.Provider 
      value={{ 
        showNotification,
        showError,
        showSuccess,
        showInfo,
        showWarning
      }}
    >
      {children}
      <AnimatePresence>
        {notification.open && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <Snackbar
              open={notification.open}
              autoHideDuration={notification.autoHideDuration}
              onClose={hideNotification}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Alert 
                onClose={hideNotification} 
                severity={notification.severity}
                sx={{ width: '100%' }}
              >
                {notification.message}
              </Alert>
            </Snackbar>
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
} 