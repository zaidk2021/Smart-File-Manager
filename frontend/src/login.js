import React, { useState, useEffect } from 'react';
import { Button, TextField, Typography } from '@mui/material';
import style from './LoginScreen.module.css';

function LoginRegister({ onLogin }) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const handleAction = async () => {
    const url = `${process.env.REACT_APP_API_URL}/api/${isLoginView ? 'login' : 'register'}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (response.ok) {
      const data = await response.json();
      alert(`Success: ${isLoginView ? 'Logged in successfully' : 'Registered successfully'}`);
      if (isLoginView && data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(true);
      }
    } else {
      const error = await response.json();
      alert(`Failed: ${error.error}`);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      const box = document.querySelector(`.${style.loginContainer}`);
      const rect = box.getBoundingClientRect();
      const isInside = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      setIsHovered(isInside);
      setCursorPos({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className={style.fullScreen}>
      {!isHovered && (
        <div
          className={style.customCursor}
          style={{ left: cursorPos.x + 'px', top: cursorPos.y + 'px' }}
        ></div>
      )}
      <div className={style.header}>
        <Typography variant="h2" className={style.headerText}>Smart File Manager</Typography>
      </div>
      <div className={`${style.loginContainer}`}>
        {isHovered && <div className={style.cursorEffect}></div>}
        <div className={style.loginContent}>
          <h1 className={style.welcomeText}>{isLoginView ? 'Login' : 'Register'}</h1>
          <form className={style.loginForm}>
            <TextField
              autoFocus
              margin="dense"
              id="username"
              label="Username"
              type="text"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={style.inputField}
            />
            <TextField
              margin="dense"
              id="password"
              label="Password"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={style.inputField}
            />
            <Button onClick={handleAction} color="primary" className={style.loginButton}>
              {isLoginView ? 'Login' : 'Register'}
            </Button>
          </form>
          <Button onClick={() => setIsLoginView(!isLoginView)} className={style.switchButton}>
            {isLoginView ? 'Go to Register' : 'Back to Login'}
          </Button>
        </div>
      </div>
      <div className={style.footer}>
        <Typography variant="body2">&copy; {new Date().getFullYear()} Zaid's Project</Typography>
      </div>
    </div>
  );
}

export default LoginRegister;
