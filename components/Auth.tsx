import React, { useState } from 'react';
import { AppState, User, CandidateProfile } from '../types';
import { db } from '../services/db';

interface AuthProps {
  setAppState: (state: AppState) => void;
  goBack: () => void;
  onLoginSuccess: (user: User) => void;
  pendingProfile: CandidateProfile | null;
}

const Auth: React.FC<AuthProps> = ({ setAppState, goBack, onLoginSuccess, pendingProfile }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // DB LOGIN VERIFICATION
        const user = await db.users.findOne({ email, password });
        
        if (user) {
          onLoginSuccess(user);
        } else {
          setError('Invalid credentials. Please check your email or create an account.');
        }
      } else {
        // REGISTER
        if (!name || !email || !password) {
          setError('All fields are required.');
          setLoading(false);
          return;
        }

        const existingUser = await db.users.findOne({ email });
        if (existingUser) {
          setError('User already exists with this email.');
          setLoading(false);
          return;
        }

        const newUser: User = {
          email,
          name,
          password,
          profile: pendingProfile || {
              id: `did:cardano:user${Math.floor(Math.random() * 10000)}`,
              name: name,
              role: "Unverified Candidate",
              skills: [],
              summary: "New profile created.",
              mintDate: ""
          }
        };
        
        await db.users.insertOne(newUser);
        onLoginSuccess(newUser);
      }
    } catch (err) {
      console.error(err);
      setError("Database connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 relative">
      <div className="w-full max-w-md mb-4 flex justify-start">
        <button 
            onClick={goBack}
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm"
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5"/>
                <path d="M12 19l-7-7 7-7"/>
            </svg>
            Back
        </button>
      </div>

      <div className="glass-panel p-8 rounded-2xl w-full max-w-md border border-gray-800 shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cardano to-blue-600"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-cardano opacity-10 blur-[50px] rounded-full"></div>

        <h2 className="text-3xl font-display font-bold text-white mb-2 text-center">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-gray-400 text-center mb-8 text-sm">
          {isLogin ? 'Login to access your Skill Identity' : 'Secure your skills on the blockchain'}
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm text-center animate-pulse">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
              <input 
                type="text" 
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:border-cardano outline-none transition-all"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
            <input 
              type="email" 
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:border-cardano outline-none transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
            <input 
              type="password" 
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:border-cardano outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 bg-cardano hover:bg-cardano-dark text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(0,209,174,0.2)] hover:shadow-[0_0_30px_rgba(0,209,174,0.4)] mt-4 flex items-center justify-center gap-2 ${loading ? 'opacity-80 cursor-wait' : ''}`}
          >
            {loading ? (
              <>
                 <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isLogin ? 'Verifying...' : 'Registering...'}
              </>
            ) : (
              <>{isLogin ? 'Login' : 'Create Account'}</>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setEmail('');
                setPassword('');
            }}
            className="text-gray-500 hover:text-white text-sm underline transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
