import React, { useState, useEffect } from 'react';
import App from './App';
import LoginRegister from './login';

function MainComponent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log(token);
    setIsAuthenticated(!!token); 
  }, []);

  const handleLogin = (authenticated) => {
    setIsAuthenticated(authenticated); 
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); 
    setIsAuthenticated(false);
  };

  return isAuthenticated ? (
    <App onLogout={handleLogout} />
  ) : (
    <LoginRegister onLogin={handleLogin} />
  );
}

export default MainComponent;
