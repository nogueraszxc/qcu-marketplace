import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const publicPages = ['/login', '/register', '/'];
    if (!loading && !user && !publicPages.includes(router.pathname)) {
      router.push('/login');
    }
  }, [user, loading, router.pathname]);

  const login = async (email, password) => {
    try {
      const res = await axios.post('https://qcu-marketplace-b08m.onrender.com/api/users/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data)); 
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      setUser(res.data);
      
      // LOGIC KUNG SAAN MAPUPUNTA PAGKA-LOGIN
      if (res.data.role && res.data.role.toLowerCase() === 'admin') {
        router.push('/admin');
      } else {
        router.push('/browse');
      }
    } catch (error) { throw error; }
  };

  const register = async (name, email, password) => {
    try {
      const res = await axios.post('https://qcu-marketplace-b08m.onrender.com/api/users/register', { name, email, password });
      if (res.data) {
        setUser(res.data);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data));
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        
        if (res.data.role && res.data.role.toLowerCase() === 'admin') {
          router.push('/admin');
        } else {
          router.push('/browse');
        }
        return res.data;
      }
    } catch (error) { throw error; }
  };

  const googleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const res = await axios.post('https://qcu-marketplace-b08m.onrender.com/api/users/google-login', { 
        name: result.user.displayName,
        email: result.user.email
      });

      if (res.data) {
        setUser(res.data);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data));
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        
        if (res.data.role && res.data.role.toLowerCase() === 'admin') {
          router.push('/admin');
        } else {
          router.push('/browse');
        }
        return res.data;
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, googleLogin, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);