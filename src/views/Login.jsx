
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';
import logo2 from '../assets/logo2.png';

function Login() {
  const navigate = useNavigate();

  const {
    login,
    user,
    loading: authLoading
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ===== REDIRECCIÓN SI YA INICIÓ SESIÓN =====

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // ===== INICIAR SESIÓN =====

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa tu correo y contraseña');
      return;
    }

    setLoading(true);

    try {
      const resultado = await login(email.trim(), password);

      if (!resultado.success) {
        setError('Correo o contraseña incorrectos');
        return;
      }

      navigate('/', { replace: true });

    } catch (err) {
      console.error('Error al iniciar sesión:', err);

      setError(
        'No se pudo iniciar sesión. Intenta nuevamente.'
      );

    } finally {
      setLoading(false);
    }
  };

  // ===== CARGANDO SESIÓN INICIAL =====

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

        {/* ===== ENCABEZADO Y LOGO ===== */}

        <div className="login-header">

          <div className="login-logo-container">
            <img
              src={logo2}
              alt="Logo Carnicería Urbina"
              className="login-logo"
            />
          </div>

          <h1>CARNICERÍA URBINA</h1>

          <p>Sistema de Gestión</p>

        </div>

        {/* ===== FORMULARIO ===== */}

        <form
          onSubmit={handleSubmit}
          className="login-form"
        >

          {/* CORREO */}

          <div className="login-field">

            <label htmlFor="email">
              <i className="fas fa-envelope"></i>
              Correo
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ingresa tu correo"
              autoComplete="email"
              disabled={loading}
              required
            />

          </div>

          {/* CONTRASEÑA */}

          <div className="login-field">

            <label htmlFor="password">
              <i className="fas fa-lock"></i>
              Contraseña
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

          {/* MENSAJE DE ERROR */}

          {error && (
            <div className="login-error" role="alert">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          {/* BOTÓN DE INICIO DE SESIÓN */}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >

            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Ingresando...</span>
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                <span>Iniciar Sesión</span>
              </>
            )}

          </button>

        </form>

        {/* ===== PIE DEL LOGIN ===== */}

        <div className="login-footer">

          <i className="fas fa-shield-alt"></i>

          <span>
            Acceso restringido al personal autorizado
          </span>

        </div>

      </div>
    </div>
  );
}

export default Login;
