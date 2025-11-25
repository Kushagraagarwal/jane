import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const socketInstance = getSocket();
      if (socketInstance) {
        setSocket(socketInstance);

        socketInstance.on('connect', () => {
          setConnected(true);
          console.log('Socket connected in context');
        });

        socketInstance.on('disconnect', () => {
          setConnected(false);
          console.log('Socket disconnected in context');
        });

        // Check if already connected
        if (socketInstance.connected) {
          setConnected(true);
        }

        return () => {
          socketInstance.off('connect');
          socketInstance.off('disconnect');
        };
      }
    } else {
      setSocket(null);
      setConnected(false);
    }
  }, [isAuthenticated]);

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const emit = (event, data) => {
    if (socket) {
      socket.emit(event, data);
    }
  };

  const value = {
    socket,
    connected,
    on,
    off,
    emit
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
