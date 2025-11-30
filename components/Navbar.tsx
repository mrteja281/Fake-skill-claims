import React from 'react';
import { AppState, User } from '../types';

interface NavbarProps {
  setAppState: (state: AppState) => void;
  currentState: AppState;
  user: User | null;
  handleLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ setAppState, currentState, user, handleLogout }) => {
  return (
    <nav className="w-full py-3 px-6 md:px-12 flex justify-between items-center border-b border-gray-800 bg-cardano-bg/95 backdrop-blur-sm sticky top-0 z-50 shadow-lg shadow-cardano/5">
      <div 
        className="flex flex-col cursor-pointer group"
        onClick={() => setAppState(AppState.LANDING)}
      >
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cardano to-cardano-dark rounded-lg flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
            <span className="text-white font-bold text-lg">S</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">
            Skill<span className="text-cardano">Chain</span>
            </h1>
        </div>
        <span className="text-[10px] text-gray-500 font-mono tracking-widest pl-1 mt-0.5 group-hover:text-cardano transition-colors duration-300">
            "Trust the Skills, Not the Claims."
        </span>
      </div>

      <div className="flex gap-6 items-center">
        {user ? (
          <>
            <button 
              onClick={() => setAppState(AppState.PROFILE)}
              className={`text-sm font-medium transition-colors ${
                currentState === AppState.PROFILE
                ? 'text-cardano' 
                : 'text-gray-400 hover:text-white'
              }`}
            >
              My Profile
            </button>
             <button 
              onClick={() => setAppState(AppState.CANDIDATE_UPLOAD)}
              className={`text-sm font-medium transition-colors ${
                currentState === AppState.CANDIDATE_UPLOAD || currentState === AppState.ANALYSIS_RESULT 
                ? 'text-cardano' 
                : 'text-gray-400 hover:text-white'
              }`}
            >
              Verify New Resume
            </button>
          </>
        ) : (
          <button 
            onClick={() => setAppState(AppState.AUTH)}
            className={`text-sm font-medium transition-colors ${
              currentState === AppState.CANDIDATE_UPLOAD || currentState === AppState.ANALYSIS_RESULT 
              ? 'text-cardano' 
              : 'text-gray-400 hover:text-white'
            }`}
          >
            Get Verified
          </button>
        )}

        <button 
          onClick={() => setAppState(AppState.EMPLOYER_VERIFY)}
          className={`text-sm font-medium transition-colors ${
            currentState === AppState.EMPLOYER_VERIFY || currentState === AppState.EMPLOYER_VIEW
            ? 'text-cardano' 
            : 'text-gray-400 hover:text-white'
          }`}
        >
          Employer Scan
        </button>

        {user ? (
           <div className="flex items-center gap-4 ml-2 pl-4 border-l border-gray-800">
              <span className="text-sm text-gray-300 font-bold hidden md:block">{user.name}</span>
              <button 
                onClick={handleLogout}
                className="text-xs px-3 py-1.5 rounded border border-gray-700 hover:border-red-500 hover:text-red-500 transition-all"
              >
                Logout
              </button>
           </div>
        ) : (
          <button 
            onClick={() => setAppState(AppState.AUTH)}
            className="ml-2 px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-all"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;