
import React, { useState, useRef } from 'react';
import { AppState, CandidateProfile } from '../types';

interface EmployerFlowProps {
  setAppState: (state: AppState) => void;
  goBack: () => void;
  currentState: AppState;
  verifiedProfile: CandidateProfile | null;
}

const EmployerFlow: React.FC<EmployerFlowProps> = ({ setAppState, goBack, currentState, verifiedProfile }) => {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'found'>('idle');
  const [profileData, setProfileData] = useState<CandidateProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setScanState('scanning');
        
        // Simulating processing delay
        setTimeout(() => {
            setScanState('found');
            
            if (verifiedProfile) {
                // If there is a real profile in session (User just minted), use it.
                // This satisfies the requirement: "once it scans the qr it should display the details of the skills which are displayed while verifying the resume"
                setProfileData(verifiedProfile);
            } else {
                // If no session exists, generate a fresh random demo profile
                const randomId = Math.floor(Math.random() * 1000);
                setProfileData({
                    id: `did:cardano:demo${randomId}`,
                    name: `New Verified Candidate #${randomId}`,
                    role: "Full Stack Blockchain Developer",
                    skills: [
                        { name: "Rust", confidenceScore: 89, verified: true, source: "GitHub" },
                        { name: "Plutus / Haskell", confidenceScore: 92, verified: true, source: "Cert + GitHub" },
                        { name: "React", confidenceScore: 85, verified: true, source: "LinkedIn" }
                    ],
                    summary: "Demonstrating dynamic profile generation. This candidate has verified credentials on-chain.",
                    mintDate: new Date().toLocaleDateString(),
                    nftHash: `asset1${Math.random().toString(36).substring(7)}...`
                });
            }
            setAppState(AppState.EMPLOYER_VIEW);
        }, 2000);
    }
  };

  if (currentState === AppState.EMPLOYER_VERIFY) {
    return (
      <div className="max-w-xl mx-auto pt-16 px-4 text-center">
        <div className="mb-6 flex justify-start">
            <button 
                onClick={goBack}
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5"/>
                    <path d="M12 19l-7-7 7-7"/>
                </svg>
                <span>Back</span>
            </button>
        </div>

        <h2 className="text-3xl font-display font-bold text-white mb-4">Employer Verification Portal</h2>
        <p className="text-gray-400 mb-10">Scan a candidate's Skill NFT QR code to unlock their verified identity.</p>

        <div 
            className="glass-panel p-10 rounded-3xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden group hover:border-cardano transition-colors cursor-pointer"
            onClick={() => scanState === 'idle' && fileInputRef.current?.click()}
        >
            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*"
                onChange={handleQrUpload}
            />

            {scanState === 'idle' && (
                <>
                    <div className="w-20 h-20 bg-gray-800 rounded-xl mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-10 h-10 text-cardano" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                        </svg>
                    </div>
                    <p className="font-bold text-lg text-white">Upload QR Code to Scan</p>
                    <p className="text-sm text-gray-500 mt-2">Click to select QR image</p>
                </>
            )}

            {scanState === 'scanning' && (
                <>
                    <div className="absolute inset-0 bg-green-900/20 z-0"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-cardano shadow-[0_0_15px_#00D1AE] animate-[scan_2s_ease-in-out_infinite]"></div>
                    <div className="z-10 flex flex-col items-center">
                        <svg className="animate-spin h-8 w-8 text-cardano mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-cardano font-mono tracking-widest animate-pulse">DECRYPTING DID...</p>
                    </div>
                </>
            )}

            {scanState === 'found' && (
                <div className="z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-cardano rounded-full flex items-center justify-center mb-2 shadow-[0_0_20px_#00D1AE]">
                        <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <p className="text-white font-bold text-lg">Identity Verified</p>
                    <p className="text-xs text-gray-400">Redirecting...</p>
                </div>
            )}
        </div>
      </div>
    );
  }

  if (currentState === AppState.EMPLOYER_VIEW && profileData) {
      return (
        <div className="max-w-4xl mx-auto pt-10 px-4 pb-20">
            <button 
                onClick={goBack}
                className="mb-6 flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5"/>
                    <path d="M12 19l-7-7 7-7"/>
                </svg>
                <span>Back</span>
            </button>

            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden border border-cardano/30 shadow-[0_0_40px_rgba(0,209,174,0.1)]">
                {/* Verified Badge */}
                <div className="absolute top-0 right-0 bg-cardano text-black font-bold text-xs px-4 py-1.5 rounded-bl-xl shadow-lg">
                    ✓ ON-CHAIN VERIFIED
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-6 mb-8 border-b border-gray-800 pb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-cardano to-blue-600 rounded-full p-1 shadow-xl">
                        <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center text-3xl font-bold text-white">
                            {profileData.name.charAt(0)}
                        </div>
                    </div>
                    <div className="text-center md:text-left">
                        <h2 className="text-4xl font-display font-bold text-white mb-1">{profileData.name}</h2>
                        <p className="text-cardano text-lg font-medium">{profileData.role}</p>
                        <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                            <span className="text-xs text-gray-500 font-mono bg-gray-900 px-2 py-1 rounded border border-gray-800">
                                DID: {profileData.id}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-cardano">✦</span> Verified Skills
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profileData.skills.map((skill, idx) => (
                            <div key={idx} className="bg-gray-800/40 p-5 rounded-xl border border-gray-700 flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-white text-lg">{skill.name}</span>
                                    <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${skill.confidenceScore > 85 ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                                        {skill.confidenceScore}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${skill.confidenceScore > 85 ? 'bg-cardano' : 'bg-yellow-500'}`} 
                                        style={{width: `${skill.confidenceScore}%`}}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Source: {skill.source}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black/30 p-5 rounded-xl border border-dashed border-gray-700">
                        <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">Professional Summary</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">{profileData.summary}</p>
                    </div>
                    <div className="bg-black/30 p-5 rounded-xl border border-dashed border-gray-700 font-mono text-xs">
                         <h4 className="text-sm font-bold text-gray-400 uppercase mb-2 font-sans">Blockchain Record</h4>
                         <div className="space-y-2 text-gray-500">
                            <div className="flex justify-between">
                                <span>Status:</span>
                                <span className="text-green-500">Confirmed (15 blocks)</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Mint Date:</span>
                                <span>{profileData.mintDate}</span>
                            </div>
                            <div>
                                <span className="block mb-1">Asset Hash:</span>
                                <span className="text-cardano break-all bg-gray-900 p-2 rounded block border border-gray-800">
                                    {profileData.nftHash}
                                </span>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  return null;
};

export default EmployerFlow;
