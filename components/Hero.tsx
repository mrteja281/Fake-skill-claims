import React from 'react';
import { AppState, User } from '../types';

interface HeroProps {
  setAppState: (state: AppState) => void;
  user: User | null;
}

const Hero: React.FC<HeroProps> = ({ setAppState, user }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] text-center px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cardano opacity-10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500 opacity-10 blur-[80px] rounded-full pointer-events-none"></div>

      <div className="z-10 max-w-4xl mx-auto">
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cardano-surface border border-cardano-dark/30">
          <span className="w-2 h-2 rounded-full bg-cardano animate-pulse"></span>
          <span className="text-xs font-medium text-cardano-light uppercase tracking-wider">Cardano IBW 2025 Edition 🦞</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 leading-tight">
          Verify Real Skills with <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cardano to-blue-500">
            AI & Blockchain
          </span>
        </h1>
        
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          SkillChain eliminates fake resumes using AI analysis and secures verified skill identities as NFTs on the Cardano network.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => user ? setAppState(AppState.CANDIDATE_UPLOAD) : setAppState(AppState.AUTH)}
            className="px-8 py-4 bg-cardano hover:bg-cardano-dark text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(0,209,174,0.3)] hover:shadow-[0_0_30px_rgba(0,209,174,0.5)] transform hover:-translate-y-1"
          >
            Verify My Resume
          </button>
          <button 
            onClick={() => setAppState(AppState.EMPLOYER_VERIFY)}
            className="px-8 py-4 bg-transparent border border-gray-600 hover:border-cardano text-white hover:text-cardano font-bold rounded-xl transition-all"
          >
            Employer Scan
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          <div className="glass-panel p-6 rounded-2xl">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-white mb-2">AI Verification</h3>
            <p className="text-gray-400 text-sm">Gemini AI analyzes GitHub, Kaggle, and LinkedIn data to score skill authenticity.</p>
          </div>
          <div className="glass-panel p-6 rounded-2xl">
            <div className="text-3xl mb-4">⛓️</div>
            <h3 className="text-xl font-bold text-white mb-2">On-Chain Proof</h3>
            <p className="text-gray-400 text-sm">Verified skills are minted as NFTs on Cardano using Plutus smart contracts.</p>
          </div>
          <div className="glass-panel p-6 rounded-2xl">
            <div className="text-3xl mb-4">🆔</div>
            <h3 className="text-xl font-bold text-white mb-2">Decentralized ID</h3>
            <p className="text-gray-400 text-sm">Privacy-first identity management using Atala PRISM and Zero-Knowledge proofs.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;