import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { FaMapMarkedAlt, FaUser, FaEnvelope, FaLock } from 'react-icons/fa';

function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      if (isRegister) {
        await axios.post('http://localhost:5000/api/auth/register', { name, email, password });
        setMessage('Registered successfully! Please log in.');
        setIsRegister(false);
      } else {
        const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('name', res.data.name);
        navigate('/dashboard');
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left branding panel */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 relative overflow-hidden flex-col justify-center px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <FaMapMarkedAlt className="text-teal-400 text-4xl" />
            <h1 className="text-3xl font-bold text-white tracking-tight">BizScope AI</h1>
          </div>
          <p className="text-slate-300 text-lg max-w-md leading-relaxed">
            Intelligent business site selection, success prediction, and recommendation —
            powered by real geospatial data.
          </p>
        </motion.div>

        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-10 -left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Right form panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-slate-50 px-6">
        <motion.div
          key={isRegister ? 'register' : 'login'}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {isRegister ? 'Create an account' : 'Welcome back'}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {isRegister ? 'Start analyzing business locations.' : 'Log in to continue.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative"
                >
                  <FaUser className="absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <FaEnvelope className="absolute left-3 top-3.5 text-slate-400" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            <div className="relative">
              <FaLock className="absolute left-3 top-3.5 text-slate-400" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? 'Please wait…' : isRegister ? 'Register' : 'Log in'}
            </button>
          </form>

          {message && (
            <p className="text-sm text-center mt-4 text-teal-700 bg-teal-50 py-2 rounded-lg">
              {message}
            </p>
          )}

          <p className="text-sm text-center text-slate-500 mt-6">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-teal-600 font-medium hover:underline"
            >
              {isRegister ? 'Log in' : 'Register'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default LoginPage;