import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, TrendingUp, Users, BarChart3 } from 'lucide-react';
import './Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Simulate network delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Credentials validation
    // Allow either the main admin email OR the developer email
    const VALID_EMAILS = [
      process.env.REACT_APP_LOGIN_EMAIL || 'admin@franchiseexperts.com',
      'dev@lincroftdigital.com'
    ];
    const VALID_PASSWORD = process.env.REACT_APP_LOGIN_PASSWORD || 'demo123';
    
    if (VALID_EMAILS.includes(email) && password === VALID_PASSWORD) {
      onLogin();
      setError('');
    } else {
      setError('Invalid email or password');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Animated Background */}
      <div className="login-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Main Content */}
      <div className="login-content">
        {/* Left Side - Branding */}
        <div className="login-branding">
          <div className="brand-logo">
            <div className="logo-icon">
              <TrendingUp size={48} strokeWidth={2.5} />
            </div>
            <h1>
              <span style={{color: '#2c5282'}}>Franchise</span>
              <span style={{color: '#ed8936'}}>Experts</span>
            </h1>
          </div>
          <p className="brand-tagline">Performance Analytics Dashboard</p>
          
          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon">
                <BarChart3 size={24} />
              </div>
              <div className="feature-text">
                <h3>Real-time Analytics</h3>
                <p>Track consultant performance and conversion metrics</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <Users size={24} />
              </div>
              <div className="feature-text">
                <h3>Team Insights</h3>
                <p>Compare performance across your entire team</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <TrendingUp size={24} />
              </div>
              <div className="feature-text">
                <h3>Growth Tracking</h3>
                <p>Monitor trends and identify opportunities</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-box">
          <div className="login-header">
            <div className="lock-icon">
              <Lock size={24} />
            </div>
            <h2>Welcome Back</h2>
            <p>Sign in to access your dashboard</p>
          </div>
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">
                <Mail size={16} />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@franchiseexperts.com"
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">
                <Lock size={16} />
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>
            
            {error && (
              <div className="error-message">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            
            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;