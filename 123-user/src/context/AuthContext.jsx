import { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChange, 
  loginWithEmailAndPassword,
  registerCustomer,
  logoutUser
} from '../services/auth';
import { saveUserProfile, getUserProfile } from '../services/db';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, pwd) => {
    setLoading(true);
    try {
      const loggedUser = await loginWithEmailAndPassword(email, pwd);
      setUser(loggedUser);
      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      const registeredUser = await registerCustomer(formData);
      setUser(registeredUser);
      return registeredUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    if (!user) return;
    await saveUserProfile(user.uid, profileData);
    const updated = await getUserProfile(user.uid);
    setUser({ uid: user.uid, ...updated });
    if (localStorage.getItem('wh_session')) {
      localStorage.setItem('wh_session', JSON.stringify({ uid: user.uid, ...updated }));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login,
      register,
      logout, 
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
