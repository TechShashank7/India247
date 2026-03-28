import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const res = await axios.get(`/api/users/${currentUser.uid}`);
          setUser({
            uid: currentUser.uid,
            name: res.data.name || currentUser.displayName || "User",
            email: currentUser.email,
            role: res.data.role || "user",
            city: res.data.city || ""
          });
        } catch (error) {
          console.error("Failed to load user role", error);
          // Fallback if Mongo isn't synced yet
          setUser({
            uid: currentUser.uid,
            name: currentUser.displayName || "User",
            email: currentUser.email,
            role: "user"
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
        {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
