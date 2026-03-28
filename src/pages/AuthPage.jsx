import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../firebase";
import axios from "axios";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }

      // Sync with MongoDB
      await axios.post('/api/users/sync', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: isLogin ? (userCredential.user.displayName || email.split('@')[0]) : name,
        city: role === 'officer' ? city : undefined,
        role: isLogin ? undefined : role // Only send role if signing up, otherwise let backend keep existing
      });

      navigate("/");
      // The Navbar and App routers will handle role-based redirection automatically
      // since AuthContext listens for auth state and fetches role.
      window.location.reload(); // Refresh to ensure context fully hydrates
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      await axios.post('/api/users/sync', {
        uid: result.user.uid,
        email: result.user.email,
        name: result.user.displayName || result.user.email.split('@')[0],
        city: role === 'officer' ? city : undefined,
        role: role
      });

      navigate("/");
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center flex-col items-center">
          <div className="w-12 h-12 bg-saffron rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
            I247
          </div>
          <h2 className="text-center text-3xl font-extrabold text-navy">
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            
            {/* Role Selection Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  role === "user" ? "bg-white text-saffron shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Citizen
              </button>
              <button
                type="button"
                onClick={() => setRole("officer")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  role === "officer" ? "bg-white text-navy shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Officer
              </button>
            </div>

            <form className="space-y-6" onSubmit={handleAuth}>
              {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded text-sm">
                  {error}
                </div>
              )}
              
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-saffron focus:border-saffron sm:text-sm"
                    />
                  </div>
                </div>
              )}

              {!isLogin && role === "officer" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">City / Jurisdiction</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-saffron focus:border-saffron sm:text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <div className="mt-1">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-saffron focus:border-saffron sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-saffron focus:border-saffron sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    role === 'officer' ? 'bg-navy hover:bg-gray-800 focus:ring-navy' : 'bg-saffron hover:bg-orange-600 focus:ring-saffron'
                  }`}
                >
                  {isLogin ? `Sign in as ${role === 'officer' ? 'Officer' : 'Citizen'}` : `Sign up as ${role === 'officer' ? 'Officer' : 'Citizen'}`}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={googleLogin}
                  disabled={loading}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">Sign in with Google</span>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-saffron hover:underline"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
