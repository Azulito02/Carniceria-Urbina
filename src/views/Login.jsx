import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';
import logo2 from "../assets/logo2.png";

function Login() {
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Si ya está logueado, redirigir al inicio
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa tu correo y contraseña');
      setLoading(false);
      return;
    }

    const resultado = await login(email.trim(), password);

    if (!resultado.success) {
      setError('Correo o contraseña incorrectos');
      setLoading(false);
      return;
    }

    // Éxito: AuthContext actualizará 'user' y el useEffect redirige
    navigate('/', { replace: true });
  };

  // Mientras verifica sesión inicial, no mostrar nada
  if (authLoading) {
    return (
      <div className="login-loading">
        <i className="fas fa-spinner fa-spin"></i>
        <span>Cargando...</span>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
              <img src={logo2} alt="logo2" className="login-logo" />
          <h1>CARNICERÍA URBINA</h1>
          <p>Sistema de Gestion</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="email">
              <i className="fas fa-envelope"></i> Correo
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo"
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">
              <i className="fas fa-lock"></i> Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="login-error">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Ingresando...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i> Iniciar Sesión
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <i className="fas fa-shield-alt"></i>
          <span>Acceso restringido al personal autorizado</span>
        </div>
      </div>
    </div>
  );
}

export default Login;