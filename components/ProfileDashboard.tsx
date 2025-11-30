
import React, { useState } from 'react';
import { AppState, User, Skill } from '../types';
import { evaluateProjectImpact } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ProfileDashboardProps {
  user: User;
  updateUserSkill: (skillName: string, newScore: number, projectData: any) => void;
  setAppState: (state: AppState) => void;
  goBack: () => void;
}

const ProfileDashboard: React.FC<ProfileDashboardProps> = ({ user, updateUserSkill, setAppState, goBack }) => {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [projectLink, setProjectLink] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<{message: string, improved: boolean} | null>(null);

  const openUpdateModal = (skill: Skill) => {
    setSelectedSkill(skill);
    setIsModalOpen(true);
    setUpdateResult(null);
    setProjectLink('');
    setProjectName('');
    setProjectDesc('');
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkill) return;

    setIsUpdating(true);
    setUpdateResult(null);

    try {
      const result = await evaluateProjectImpact(
        selectedSkill.name,
        selectedSkill.confidenceScore,
        projectName,
        projectLink,
        projectDesc
      );

      if (result.skillImproved) {
        updateUserSkill(selectedSkill.name, result.newConfidenceScore, {
          name: projectName,
          link: projectLink,
          description: projectDesc,
          dateAdded: new Date().toLocaleDateString()
        });
        setUpdateResult({
            message: `Success! ${selectedSkill.name} score increased to ${result.newConfidenceScore}%. ${result.reasoning}`,
            improved: true
        });
        setTimeout(() => setIsModalOpen(false), 3000);
      } else {
        setUpdateResult({
            message: `Score unchanged. ${result.reasoning}`,
            improved: false
        });
      }

    } catch (error) {
      setUpdateResult({message: "Failed to evaluate project.", improved: false});
    } finally {
      setIsUpdating(false);
    }
  };

  const chartData = user.profile.skills.map(s => ({
    name: s.name,
    score: s.confidenceScore
  }));

  // Safe fallback if overallScore is missing (for older accounts)
  const overallScore = user.profile.overallScore || Math.round(user.profile.skills.reduce((acc, s) => acc + s.confidenceScore, 0) / (user.profile.skills.length || 1));
  
  // Calculate Rank
  let rank = "Bronze";
  let rankColor = "text-orange-400";
  if (overallScore >= 90) { rank = "Diamond"; rankColor = "text-cyan-400"; }
  else if (overallScore >= 80) { rank = "Platinum"; rankColor = "text-gray-300"; }
  else if (overallScore >= 70) { rank = "Gold"; rankColor = "text-yellow-400"; }
  else if (overallScore >= 60) { rank = "Silver"; rankColor = "text-gray-400"; }

  // Generate detailed QR Text
  const skillsList = user.profile.skills.map(s => `- ${s.name}: ${s.confidenceScore}%`).join('\n');
  const qrText = `VERIFIED SKILL IDENTITY
Name: ${user.name}
Rank: ${rank}
Overall Skill Percentage: ${overallScore}%

SKILL BREAKDOWN:
${skillsList}

Asset ID: ${user.profile.nftHash || user.profile.id}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrText)}`;

  return (
    <div className="max-w-6xl mx-auto pt-8 px-4 pb-20">
      {/* Back Button */}
      <div className="flex justify-between items-center mb-6">
        <button 
            onClick={goBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium group"
        >
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5"/>
                    <path d="M12 19l-7-7 7-7"/>
                </svg>
            </div>
            <span>Back</span>
        </button>
        
        <button 
            onClick={() => setIsQRModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-cardano/50 rounded-lg hover:bg-gray-700 transition-colors text-cardano text-sm font-bold"
        >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
            Share Identity QR
        </button>
      </div>

      {/* Header Profile Summary */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 border-b border-gray-800 pb-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cardano to-blue-500 p-[2px]">
               <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                 {user.name.charAt(0)}
               </div>
             </div>
             <div>
                <h1 className="text-3xl font-display font-bold text-white">{user.name}</h1>
                <p className="text-cardano text-sm">{user.profile.role}</p>
             </div>
           </div>
           <p className="text-gray-400 max-w-xl text-sm">{user.profile.summary}</p>
        </div>
        <div className="text-right">
             <div className="inline-block bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-500 uppercase">Wallet Connected</p>
                <p className="font-mono text-cardano text-sm">{user.profile.walletAddress || "addr1...demo"}</p>
             </div>
        </div>
      </div>

      {/* DASHBOARD SECTION */}
      <div className="mb-10">
         <h2 className="text-2xl font-display font-bold text-white mb-6">Trust Dashboard</h2>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             
             {/* MAIN SCORE CARD */}
             <div className="md:col-span-2 glass-panel p-8 rounded-2xl flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl">🛡️</div>
                <div className="z-10">
                    <p className="text-gray-400 text-sm uppercase tracking-widest font-bold">Overall Trust Score</p>
                    <h3 className={`text-6xl font-bold ${overallScore >= 80 ? 'text-cardano' : 'text-yellow-500'} mt-2`}>
                        {overallScore}
                        <span className="text-2xl text-gray-500">/100</span>
                    </h3>
                    <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900/50 border border-gray-700`}>
                        <span className={`w-2 h-2 rounded-full ${overallScore >= 80 ? 'bg-cardano' : 'bg-yellow-500'} animate-pulse`}></span>
                        <span className="text-xs text-gray-300">AI Verified & On-Chain</span>
                    </div>
                </div>
                {/* Radial Chart */}
                <div className="relative w-32 h-32 z-10 hidden sm:block">
                     <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1F2937" strokeWidth="4" />
                        <path 
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                            fill="none" 
                            stroke={overallScore >= 80 ? '#00D1AE' : '#EAB308'} 
                            strokeWidth="4" 
                            strokeDasharray={`${overallScore}, 100`} 
                            strokeLinecap="round"
                        />
                    </svg>
                </div>
             </div>

             {/* RANK CARD */}
             <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center items-center border-t-4 border-t-blue-500">
                <p className="text-gray-400 text-xs uppercase font-bold mb-2">Current Rank</p>
                <div className={`text-3xl font-bold font-display ${rankColor}`}>{rank}</div>
                <div className="text-4xl mt-2">
                    {rank === 'Diamond' ? '💎' : rank === 'Platinum' ? '💠' : rank === 'Gold' ? '🏆' : rank === 'Silver' ? '🥈' : '🥉'}
                </div>
             </div>

             {/* STATS CARD */}
             <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center space-y-4">
                 <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                     <span className="text-gray-400 text-sm">Verified Skills</span>
                     <span className="text-white font-bold">{user.profile.skills.length}</span>
                 </div>
                 <div className="flex justify-between items-center">
                     <span className="text-gray-400 text-sm">Epoch</span>
                     <span className="text-cardano font-mono text-sm">420</span>
                 </div>
                 <div className="flex justify-between items-center pt-2">
                     <span className="text-gray-400 text-sm">Certificates</span>
                     <span className="text-white font-bold">{user.profile.certificates?.length || 0}</span>
                 </div>
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Projects & Add */}
        <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">Recent Projects</h3>
                    <button className="text-xs text-cardano hover:underline font-bold">+ Add Project</button>
                </div>
                {user.profile.projects && user.profile.projects.length > 0 ? (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {user.profile.projects.map((p, idx) => (
                            <div key={idx} className="bg-gray-800/50 p-3 rounded border-l-2 border-blue-500">
                                <p className="font-bold text-sm text-gray-200">{p.name}</p>
                                <a href={p.link} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline block mb-1 truncate">{p.link}</a>
                                <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                                <p className="text-[10px] text-gray-600 mt-1 text-right">{p.dateAdded}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 italic">No projects added yet.</p>
                )}
            </div>
        </div>

        {/* Right Col: Skills Grid */}
        <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-6 border-l-4 border-cardano pl-3">Technical Skills & Credentials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.profile.skills.map((skill, idx) => (
                    <div key={idx} className="glass-panel p-5 rounded-xl border border-gray-700 hover:border-cardano transition-colors group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-5 text-4xl font-bold text-white group-hover:opacity-10 transition-opacity">
                            {idx + 1}
                        </div>
                        <div className="flex justify-between items-start mb-2 relative z-10">
                            <h3 className="font-bold text-lg text-white">{skill.name}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${skill.confidenceScore > 80 ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'}`}>
                                {skill.confidenceScore}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5 mb-4 relative z-10">
                             <div 
                                className={`h-1.5 rounded-full ${skill.confidenceScore > 80 ? 'bg-cardano' : 'bg-yellow-500'}`} 
                                style={{ width: `${skill.confidenceScore}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between items-center relative z-10 mb-2">
                            <span className="text-xs text-gray-500">Source: {skill.source}</span>
                        </div>
                        
                        {/* SKILL BREAKDOWN / REASONING (Simulated if not present in legacy data) */}
                         <div className="text-[10px] text-gray-400 bg-gray-900/50 p-2 rounded">
                            <span className="text-cardano font-bold">Verification Logic:</span>
                            <br/>
                            {skill.confidenceScore > 80 
                                ? "Verified via strong cross-referenced evidence on GitHub repositories matching Resume keywords." 
                                : "Partial match found in resume text but lacking direct project links or repository evidence."}
                        </div>

                        <div className="mt-3 text-right">
                             <button 
                                onClick={() => openUpdateModal(skill)}
                                className="text-xs bg-gray-700 hover:bg-cardano hover:text-black text-white px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1"
                            >
                                ⚡ Boost
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Resume Analysis Chart */}
            <div className="glass-panel p-6 rounded-2xl mt-8">
                <h3 className="text-lg font-bold text-white mb-4">Confidence Distribution</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{fill: '#888', fontSize: 12}} />
                      <YAxis tick={{fill: '#888'}} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2833', border: '1px solid #00D1AE' }} 
                        itemStyle={{ color: '#fff' }}
                        cursor={{fill: 'rgba(255,255,255,0.1)'}}
                      />
                      <Bar dataKey="score" fill="#00D1AE" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.score > 80 ? '#00D1AE' : '#FBBF24'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>

      {/* Update Skill Modal */}
      {isModalOpen && selectedSkill && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6 relative">
                <button 
                    onClick={() => setIsModalOpen(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white"
                >
                    ✕
                </button>
                <h3 className="text-xl font-bold text-white mb-2">Boost Score: {selectedSkill.name}</h3>
                <p className="text-sm text-gray-400 mb-6">Upload a new project or GitHub link that demonstrates your expertise in this skill. Gemini AI will analyze it to potentially increase your confidence score.</p>
                
                <form onSubmit={handleProjectSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Project Name</label>
                        <input
                            type="text"
                            required
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-cardano outline-none"
                            placeholder="e.g. DeFi Exchange"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Repository / Live Link</label>
                        <input
                            type="url"
                            required
                            value={projectLink}
                            onChange={(e) => setProjectLink(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-cardano outline-none"
                            placeholder="https://github.com/..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Description</label>
                        <textarea
                            required
                            value={projectDesc}
                            onChange={(e) => setProjectDesc(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-cardano outline-none h-24"
                            placeholder="Describe how you used this skill in the project..."
                        />
                    </div>

                    {updateResult && (
                        <div className={`p-3 rounded-lg text-sm ${updateResult.improved ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-yellow-900/30 text-yellow-400 border border-yellow-800'}`}>
                            {updateResult.message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isUpdating}
                        className="w-full py-3 bg-cardano hover:bg-cardano-dark text-black font-bold rounded-xl transition-all flex justify-center"
                    >
                        {isUpdating ? 'Analyzing Project...' : 'Verify & Update Score'}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* QR Code Share Modal */}
      {isQRModalOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center relative shadow-2xl shadow-cardano/20">
                  <button 
                    onClick={() => setIsQRModalOpen(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-black"
                  >
                    ✕
                  </button>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Verified Identity</h3>
                  <p className="text-gray-500 text-xs mb-6">Scan to view verified skill breakdown</p>
                  
                  <div className="flex justify-center mb-6">
                      <img 
                        src={qrUrl} 
                        alt="Verified ID QR" 
                        className="w-48 h-48"
                      />
                  </div>
                  
                  <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Decentralized ID (DID)</p>
                      <p className="font-mono text-xs text-gray-900 break-all">{user.profile.id}</p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ProfileDashboard;
