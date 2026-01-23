import React, { useState } from 'react';
import './Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Hardcoded credentials
    const VALID_EMAIL = 'dev@lincroftdigital.com';
    const VALID_PASSWORD = 'dev@lincroftdigital.com';
    
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
        
        <div className="demo-credentials">
          <p><strong>Demo Credentials:</strong></p>
          <p>Email: dev@lincroftdigital.com</p>
          <p>Password: dev@lincroftdigital.com </p>
        </div>
      </div>
    </div>
  );
}

export default Login;