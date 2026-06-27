import React, { createContext, useContext, useState, useEffect } from "react";
import { dbService } from "../services/firebase";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase/Mock Auth state changes
    const unsubscribe = dbService.onAuthChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        setRole(user.role);
      } else {
        setCurrentUser(null);
        setRole(null);
      }
      setAuthLoading(false);
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  const login = async (email, password) => {
    setAuthLoading(true);
    try {
      const user = await dbService.loginUser(email, password);
      setCurrentUser(user);
      setRole(user.role);
      setAuthLoading(false);
      return user;
    } catch (err) {
      setAuthLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setAuthLoading(true);
    try {
      await dbService.logoutUser();
      setCurrentUser(null);
      setRole(null);
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        authLoading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
