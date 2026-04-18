import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

function readStoredAuth() {
  const token = localStorage.getItem('sra_token');
  const user = localStorage.getItem('sra_user');
  return {
    token,
    user: user ? JSON.parse(user) : null,
  };
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);
  const [loading, setLoading] = useState(Boolean(readStoredAuth().token));

  useEffect(() => {
    async function hydrate() {
      if (!auth.token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        const nextAuth = { token: auth.token, user: response.user };
        localStorage.setItem('sra_user', JSON.stringify(nextAuth.user));
        setAuth(nextAuth);
      } catch (error) {
        localStorage.removeItem('sra_token');
        localStorage.removeItem('sra_user');
        setAuth({ token: null, user: null });
      } finally {
        setLoading(false);
      }
    }

    hydrate();
  }, [auth.token]);

  const value = useMemo(
    () => ({
      loading,
      token: auth.token,
      user: auth.user,
      isAuthenticated: Boolean(auth.token && auth.user),
      login: ({ token, user }) => {
        localStorage.setItem('sra_token', token);
        localStorage.setItem('sra_user', JSON.stringify(user));
        setAuth({ token, user });
      },
      logout: () => {
        localStorage.removeItem('sra_token');
        localStorage.removeItem('sra_user');
        setAuth({ token: null, user: null });
      },
    }),
    [auth, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
