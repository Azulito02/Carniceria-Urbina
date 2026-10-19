
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';
import logo2 from '../assets/logo2.png';

function Login() {
  const navigate = useNavigate();

  const {
    login,
    registrar,
    user,
    loading: authLoading
  } = useAuth();

  const [modoRegistro, setModoRegistro] = useState(false);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const cambiarModo = () => {
    setModoRegistro(!modoRegistro);
    setError('');
    setMensaje('');
    setPassword('');
    setConfirmarPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setMensaje('');

    const correo = email.trim().toLowerCase();

    if (!correo || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    if (modoRegistro) {
      if (!nombre.trim()) {
        setError('Ingresa tu nombre completo.');
        return;
      }

      if (password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres.');
        return;
      }

      if (password !== confirmarPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
    }

    setLoading(true);

    try {
      if (modoRegistro) {
        const resultado = await registrar(
          nombre,
          correo,
          password
        );

        if (!resultado.success) {
          const texto = resultado.error || '';

          if (texto.toLowerCase().includes('already registered')) {
            setError('Este correo ya tiene una cuenta.');
          } else {
            setError(texto || 'No se pudo crear la cuenta.');
          }

          return;
        }

        if (resultado.session) {
          setMensaje('Cuenta creada correctamente. Entrando al sistema...');
          navigate('/', { replace: true });
        } else {
          setModoRegistro(false);
          setPassword('');
          setConfirmarPassword('');

          setMensaje(
            'Cuenta creada. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.'
          );
        }
      } else {
        const resultado = await login(correo, password);

        if (!resultado.success) {
          setError('Correo o contraseña incorrectos.');
          return;
        }

        navigate('/', { replace: true });
      }
    } catch (err) {
      console.error('Error de autenticación:', err);

      setError(
        'Ocurrió un error. Verifica tu conexión e inténtalo nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

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
          <div className="login-logo-container">
            <img
              src={logo2}
              alt="Logo Carnicería Urbina"
              className="login-logo"
            />
          </div>

          <h1>CARNICERÍA URBINA</h1>

          <p>
            {modoRegistro
              ? 'Crear una cuenta nueva'
              : 'Sistema de Gestión'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {modoRegistro && (
            <div className="login-field">
              <label htmlFor="nombre">
                <i className="fas fa-user"></i>
                Nombre completo
              </label>

              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingresa tu nombre"
                autoComplete="name"
                disabled={loading}
                required
                maxLength={100}
              />
            </div>
          )}

          <div className="login-field">
            <label htmlFor="email">
              <i className="fas fa-envelope"></i>
              Correo electrónico
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
              placeholder={
                modoRegistro
                  ? 'Mínimo 8 caracteres'
                  : 'Ingresa tu contraseña'
              }
              autoComplete={
                modoRegistro ? 'new-password' : 'current-password'
              }
              disabled={loading}
              minLength={modoRegistro ? 8 : undefined}
              required
            />
          </div>

          {modoRegistro && (
            <div className="login-field">
              <label htmlFor="confirmarPassword">
                <i className="fas fa-lock"></i>
                Confirmar contraseña
              </label>

              <input
                id="confirmarPassword"
                type="password"
                value={confirmarPassword}
                onChange={(e) =>
                  setConfirmarPassword(e.target.value)
                }
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
                disabled={loading}
                minLength={8}
                required
              />
            </div>
          )}

          {error && (
            <div className="login-error" role="alert">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          {mensaje && (
            <div className="login-success" role="status">
              <i className="fas fa-check-circle"></i>
              <span>{mensaje}</span>
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <i
                  className={
                    modoRegistro
                      ? 'fas fa-user-plus'
                      : 'fas fa-sign-in-alt'
                  }
                ></i>

                <span>
                  {modoRegistro
                    ? 'Crear cuenta'
                    : 'Iniciar sesión'}
                </span>
              </>
            )}
          </button>
        </form>

        <div className="login-switch">
          <span>
            {modoRegistro
              ? '¿Ya tienes una cuenta?'
              : '¿Es tu primera vez en la aplicación?'}
          </span>

          <button
            type="button"
            onClick={cambiarModo}
            disabled={loading}
          >
            {modoRegistro
              ? 'Inicia sesión'
              : 'Crear cuenta nueva'}
          </button>
        </div>

        <div className="login-footer">
          <i className="fas fa-shield-alt"></i>

          <span>
            Acceso al sistema de Carnicería Urbina
          </span>
        </div>
      </div>
    </div>
  );
}

export default Login;
