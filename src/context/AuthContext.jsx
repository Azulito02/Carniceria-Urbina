
import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

import { supabase } from '../database/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarPerfil = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error cargando perfil:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error inesperado cargando perfil:', err);
      return null;
    }
  };

  useEffect(() => {
    let activo = true;

    const inicializar = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!activo) return;

        if (session?.user) {
          setUser(session.user);

          const p = await cargarPerfil(session.user.id);

          if (activo) setPerfil(p);
        } else {
          setUser(null);
          setPerfil(null);
        }
      } catch (err) {
        console.error('Error inicializando sesión:', err);
      } finally {
        if (activo) setLoading(false);
      }
    };

    inicializar();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!activo) return;

      setUser(session?.user || null);

      if (!session?.user) {
        setPerfil(null);
        setLoading(false);
      } else {
        // Evitar consultas asíncronas dentro del callback
        // de autenticación de Supabase.
        setTimeout(async () => {
          if (!activo) return;

          const p = await cargarPerfil(session.user.id);

          if (activo) {
            setPerfil(p);
            setLoading(false);
          }
        }, 0);
      }
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  // INICIAR SESIÓN
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      user: data.user
    };
  };

  // REGISTRAR USUARIO
  const registrar = async (nombre, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          nombre: nombre.trim()
        }
      }
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      user: data.user,
      session: data.session
    };
  };

  // CERRAR SESIÓN
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPerfil(null);
  };

  const rol = perfil?.rol || 'usuario';
  const esAdmin = rol === 'admin';

  const value = {
    user,
    perfil,
    loading,
    login,
    registrar,
    logout,
    rol,
    esAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth debe usarse dentro de un AuthProvider'
    );
  }

  return context;
}
