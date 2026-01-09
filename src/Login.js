import React, { useState } from 'react';
import './Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Credentials validation
    const VALID_EMAIL = process.env.REACT_APP_LOGIN_EMAIL || 'admin@franchiseexperts.com';
    const VALID_PASSWORD = process.env.REACT_APP_LOGIN_PASSWORD || 'demo123';
    
    if (email === VALID_EMAIL && password === VALID_PASSWORD) {
      onLogin();
      setError('');
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>🔐 Login</h1>
        <p className="subtitle">Franchise Experts Dashboard</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@franchiseexperts.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="login-button">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;