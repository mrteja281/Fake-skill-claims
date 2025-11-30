
import React, { useState, useRef, useEffect } from 'react';
import { AppState, AnalysisResult, CandidateProfile, User, ChatMessage } from '../types';
import { analyzeResume, getResumeCoachResponse } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CandidateFlowProps {
  setAppState: (state: AppState) => void;
  goBack: () => void;
  currentState: AppState;
  setVerifiedProfile: (profile: CandidateProfile) => void;
  user: User | null;
  setUser: (user: User) => void;
}

const CandidateFlow: React.FC<CandidateFlowProps> = ({ setAppState, goBack, currentState, setVerifiedProfile, user, setUser }) => {
  const [inputMode, setInputMode] = useState<'upload' | 'text'>('upload');
  const [resumeText, setResumeText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const [selectedCert, setSelectedCert] = useState<{ name: string; type: string; data: string } | null>(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [editableName, setEditableName] = useState('');
  const [mintStep, setMintStep] = useState(0); 
  const [generatedAssetId, setGeneratedAssetId] = useState('');

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isChatOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isCert: boolean = false) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = (event.target?.result as string).split(',')[1];
        const fileData = {
          name: file.name,
          type: file.type,
          data: base64String
        };
        if (isCert) {
            setSelectedCert(fileData);
        } else {
            setSelectedFile(fileData);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (inputMode === 'text' && !resumeText) return;
    if (inputMode === 'upload' && !selectedFile) return;
    if (!githubUrl || !linkedinUrl) return;

    setIsAnalyzing(true);
    try {
      let input: string | { mimeType: string; data: string } = resumeText;
      let certInput = null;

      if (inputMode === 'upload' && selectedFile) {
        let mimeType = selectedFile.type;
        if (!mimeType && selectedFile.name.endsWith('.pdf')) mimeType = 'application/pdf';
        if (!mimeType && selectedFile.name.endsWith('.txt')) mimeType = 'text/plain';

        input = {
          mimeType: mimeType,
          data: selectedFile.data
        };
      }

      if (selectedCert) {
         let mimeType = selectedCert.type;
         if (!mimeType && selectedCert.name.endsWith('.pdf')) mimeType = 'application/pdf';
         if (!mimeType && (selectedCert.name.endsWith('.png') || selectedCert.name.endsWith('.jpg'))) mimeType = 'image/jpeg';
         certInput = {
             mimeType: mimeType || 'application/pdf',
             data: selectedCert.data
         };
      }

      const result = await analyzeResume(input, certInput, githubUrl, linkedinUrl);
      setAnalysis(result);
      setEditableName(result.candidateName);
      
      // Initial Chat Message
      setChatHistory([{
        role: 'ai',
        text: `Hi ${result.candidateName}! I've analyzed your resume. I noticed your projects look ${result.projectUniquenessVerification.status.toLowerCase()}. Would you like suggestions on how to improve your "${result.technicalSkills.find(s => s.confidenceLevel < 80)?.skillName || 'resume'}" score?`,
        timestamp: Date.now()
      }]);

      setAppState(AppState.ANALYSIS_RESULT);
    } catch (e) {
      alert("Analysis failed. Please try again.");
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !analysis) return;

    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    const updatedHistory = [...chatHistory, userMsg];
    const aiResponseText = await getResumeCoachResponse(updatedHistory, analysis);

    const aiMsg: ChatMessage = { role: 'ai', text: aiResponseText, timestamp: Date.now() };
    setChatHistory(prev => [...prev, aiMsg]);
    setIsChatLoading(false);
  };

  // Helper to generate a realistic Bech32-like Asset ID (CIP-14 standard lookalike)
  const generateCardanoAssetId = () => {
    const chars = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'; // Bech32 charset
    let result = 'asset1';
    for(let i=0; i<58; i++) { // Typical length
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleMint = () => {
    setAppState(AppState.MINTING);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setMintStep(step);
      if (step >= 4) {
        clearInterval(interval);
        
        const did = user ? user.profile.id : `did:cardano:${Math.random().toString(36).substr(2, 9)}`;
        const assetId = generateCardanoAssetId();
        setGeneratedAssetId(assetId);

        const profile: CandidateProfile = {
          id: did,
          name: editableName || analysis?.candidateName || "User",
          role: analysis?.identifiedRole || "Role",
          skills: analysis?.technicalSkills.map(s => ({
            name: s.skillName,
            confidenceScore: s.confidenceLevel,
            verified: s.verificationStatus === 'Verified',
            source: 'AI + Blockchain'
          })) || [],
          certificates: analysis?.certificates || [],
          summary: analysis?.professionalSummary || "",
          walletAddress: user ? user.profile.walletAddress : 'addr1qx...9z',
          nftHash: assetId,
          mintDate: new Date().toLocaleDateString(),
          overallScore: analysis?.overallAuthenticityScore || 0
        };

        setVerifiedProfile(profile);
        
        // If logged in, update user profile
        if (user) {
            setUser({
                ...user,
                profile: profile
            });
        }

        setTimeout(() => setAppState(AppState.MINT_SUCCESS), 1000);
      }
    }, 1500);
  };

  if (currentState === AppState.CANDIDATE_UPLOAD) {
    return (
      <div className="max-w-3xl mx-auto pt-10 px-4">
        <button 
            onClick={goBack}
            className="mb-4 flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5"/>
                <path d="M12 19l-7-7 7-7"/>
            </svg>
            <span>Back</span>
        </button>

        <h2 className="text-3xl font-display font-bold text-white mb-2">Candidate Verification</h2>
        <p className="text-gray-400 mb-8">Upload your resume data and connect public profiles. <br/><span className="text-cardano text-sm">* GitHub and LinkedIn are required for cross-verification.</span></p>
        
        <div className="glass-panel p-8 rounded-2xl space-y-6">
          <div className="flex gap-4 border-b border-gray-800 pb-4">
            <button 
              onClick={() => setInputMode('upload')}
              className={`pb-2 text-sm font-medium transition-colors relative ${inputMode === 'upload' ? 'text-cardano' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Upload Resume
              {inputMode === 'upload' && <div className="absolute bottom-[-17px] left-0 w-full h-0.5 bg-cardano"></div>}
            </button>
            <button 
              onClick={() => setInputMode('text')}
              className={`pb-2 text-sm font-medium transition-colors relative ${inputMode === 'text' ? 'text-cardano' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Paste Text
              {inputMode === 'text' && <div className="absolute bottom-[-17px] left-0 w-full h-0.5 bg-cardano"></div>}
            </button>
          </div>

          {inputMode === 'text' ? (
            <div className="animate-in fade-in duration-300">
              <label className="block text-sm font-medium text-gray-400 mb-2">Resume Content</label>
              <textarea 
                className="w-full h-40 bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-white focus:border-cardano focus:ring-1 focus:ring-cardano outline-none transition-all"
                placeholder="Paste your resume content here..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              <label className="block text-sm font-medium text-gray-400 mb-2">Resume Document (PDF, DOC, TXT)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  selectedFile ? 'border-cardano bg-cardano/5' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => handleFileChange(e, false)}
                />
                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
                  {selectedFile ? (
                     <svg className="w-6 h-6 text-cardano" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  ) : (
                     <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                  )}
                </div>
                {selectedFile ? (
                  <div className="text-center">
                    <p className="text-white font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-cardano mt-1">Ready to analyze</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-300 font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, TXT supported</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Certificate Upload Section */}
          <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Certificates (Optional)</label>
              <div 
                onClick={() => certInputRef.current?.click()}
                className={`border border-dashed rounded-lg p-4 flex items-center justify-center cursor-pointer transition-all ${
                  selectedCert ? 'border-cardano bg-cardano/5' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
                }`}
              >
                <input 
                  type="file" 
                  ref={certInputRef}
                  className="hidden" 
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => handleFileChange(e, true)}
                />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                    {selectedCert ? (
                       <svg className="w-4 h-4 text-cardano" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    ) : (
                       <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                    )}
                  </div>
                  {selectedCert ? (
                    <div className="text-left">
                      <p className="text-white text-sm font-medium">{selectedCert.name}</p>
                      <p className="text-xs text-gray-500">Certificate attached</p>
                    </div>
                  ) : (
                    <div className="text-left">
                      <p className="text-gray-300 text-sm font-medium">Attach Certificate / Proof</p>
                      <p className="text-xs text-gray-500">Verify authenticity against LinkedIn</p>
                    </div>
                  )}
                </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">GitHub URL <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:border-cardano outline-none"
                placeholder="https://github.com/..."
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">LinkedIn URL <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:border-cardano outline-none"
                placeholder="https://linkedin.com/in/..."
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>
          </div>

          <button 
            disabled={(inputMode === 'text' && !resumeText) || (inputMode === 'upload' && !selectedFile) || !githubUrl || !linkedinUrl || isAnalyzing}
            onClick={handleAnalyze}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
              (inputMode === 'text' && !resumeText) || (inputMode === 'upload' && !selectedFile) || !githubUrl || !linkedinUrl || isAnalyzing 
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-cardano to-blue-500 text-black hover:shadow-lg'
            }`}
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Identity & Skills...
              </>
            ) : (
              'Verify Identity & Skills'
            )}
          </button>
        </div>
      </div>
    );
  }

  if (currentState === AppState.ANALYSIS_RESULT && analysis) {
    const data = analysis.technicalSkills.map(s => ({
      name: s.skillName,
      score: s.confidenceLevel,
      fullMark: 100,
      verified: s.verificationStatus === 'Verified'
    }));

    // Allow minting regardless of project uniqueness, but strictly enforce identity match
    const canMint = analysis.identityVerification.matchStatus !== 'MISMATCH';

    return (
      <div className="max-w-4xl mx-auto pt-10 px-4 pb-20 relative">
        <button 
            onClick={goBack}
            className="mb-4 flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5"/>
                <path d="M12 19l-7-7 7-7"/>
            </svg>
            <span>Back</span>
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
          <div className="w-full md:w-auto">
            <label className="text-xs text-gray-500 block mb-1">Candidate Name (Editable)</label>
            <div className="relative group">
              <input 
                type="text" 
                value={editableName}
                onChange={(e) => setEditableName(e.target.value)}
                className="bg-transparent border-b-2 border-gray-700 text-3xl font-display font-bold text-white focus:border-cardano outline-none w-full md:w-96 pb-1 transition-colors"
              />
              <div className="absolute right-0 top-2 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                 ✎
              </div>
            </div>
            <p className="text-cardano font-medium mt-1">{analysis.identifiedRole}</p>
          </div>
          <div className="text-right w-full md:w-auto">
            <div className="text-sm text-gray-400">Authenticity Score</div>
            <div className={`text-4xl font-bold ${analysis.overallAuthenticityScore > 80 ? 'text-green-500' : 'text-yellow-500'}`}>
              {analysis.overallAuthenticityScore}%
            </div>
          </div>
        </div>

        {/* VERIFIED CREDENTIALS PASSPORT */}
        <div className="glass-panel p-6 rounded-2xl mb-8 border border-gray-700">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <span className="text-lg">🪪</span> Verified Credentials Passport
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                 <div className="bg-gray-800/50 p-3 rounded">
                     <span className="block text-xs text-gray-500 mb-1">Identity Check</span>
                     <span className={`${analysis.identityVerification.matchStatus === 'MATCH' ? 'text-green-400' : 'text-red-400'} font-bold`}>
                        {analysis.identityVerification.matchStatus}
                     </span>
                 </div>
                 <div className="bg-gray-800/50 p-3 rounded">
                     <span className="block text-xs text-gray-500 mb-1">GitHub Verified</span>
                     <span className="text-blue-400 font-mono truncate block">{githubUrl.replace('https://', '')}</span>
                 </div>
                 <div className="bg-gray-800/50 p-3 rounded">
                     <span className="block text-xs text-gray-500 mb-1">LinkedIn Linked</span>
                     <span className="text-blue-400 font-mono truncate block">{linkedinUrl.replace('https://', '')}</span>
                 </div>
             </div>
             {analysis.certificates && analysis.certificates.length > 0 && (
                 <div className="mt-4 pt-4 border-t border-gray-800">
                     <p className="text-xs text-gray-500 mb-2">Physical Artifacts Analyzed (Forensic Scan):</p>
                     <div className="flex flex-col gap-2">
                         {analysis.certificates.map((c, i) => (
                             <div key={i} className={`text-sm p-3 rounded border flex flex-col gap-1 ${
                                c.verificationStatus === 'Likely Authentic' ? 'border-green-800 bg-green-900/20 text-green-200' : 
                                c.verificationStatus === 'Suspicious' ? 'border-red-800 bg-red-900/20 text-red-200' :
                                'border-blue-800 bg-blue-900/20 text-blue-200'
                             }`}>
                                 <div className="flex justify-between items-center">
                                    <span className="font-bold flex items-center gap-2">
                                        📄 {c.name}
                                        {c.verificationStatus === 'Likely Authentic' && <span className="text-green-400">✓</span>}
                                    </span>
                                    <span className="text-xs uppercase font-bold tracking-wider">{c.verificationStatus}</span>
                                 </div>
                                 <p className="text-xs opacity-80">{c.reasoning}</p>
                                 {/* Visual Badges for detected features */}
                                 <div className="flex gap-2 mt-1">
                                    {c.reasoning.toLowerCase().includes('qr') && (
                                        <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded text-cardano border border-cardano/30">QR Detected</span>
                                    )}
                                    {(c.reasoning.toLowerCase().includes('nptel') || c.reasoning.toLowerCase().includes('serial')) && (
                                        <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded text-blue-400 border border-blue-400/30">Serial ID Found</span>
                                    )}
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* IDENTITY VERIFICATION CARD */}
            <div className={`p-4 rounded-xl border-l-4 ${
                analysis.identityVerification.matchStatus === 'MATCH' ? 'bg-green-900/20 border-green-500' : 
                analysis.identityVerification.matchStatus === 'PARTIAL' ? 'bg-yellow-900/20 border-yellow-500' : 
                'bg-red-900/20 border-red-500'
            }`}>
                <h4 className="font-bold text-lg text-white flex items-center gap-2">
                    {analysis.identityVerification.matchStatus === 'MATCH' ? '✅ Identity Verified' : 
                    analysis.identityVerification.matchStatus === 'PARTIAL' ? '⚠️ Identity Warning' : 
                    '❌ Identity Mismatch'}
                </h4>
                <p className="text-gray-300 text-sm mt-1">{analysis.identityVerification.reasoning}</p>
            </div>

            {/* PROJECT UNIQUENESS CARD */}
            <div className={`p-4 rounded-xl border-l-4 ${
                analysis.projectUniquenessVerification.status === 'UNIQUE' ? 'bg-blue-900/20 border-blue-500' : 
                'bg-red-900/20 border-red-500'
            }`}>
                <h4 className="font-bold text-lg text-white flex items-center gap-2">
                    {analysis.projectUniquenessVerification.status === 'UNIQUE' ? '🔹 Unique Projects' : 
                    '⚠️ Generic / Copied'}
                </h4>
                <p className="text-gray-300 text-sm mt-1">{analysis.projectUniquenessVerification.reasoning}</p>
                <div className="mt-2 text-xs text-gray-500 font-mono">Originality: {analysis.projectUniquenessVerification.originalityScore}%</div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Skill Confidence (AI Analysis)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{fill: '#ccc'}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2833', border: '1px solid #00D1AE' }} 
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.verified ? (entry.score > 80 ? '#00D1AE' : '#FBBF24') : '#4B5563'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 justify-center text-xs">
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-cardano rounded"></span> Verified</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-600 rounded"></span> Unverified</div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4">Detailed Skill Breakdown</h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {analysis.technicalSkills.map((skill, idx) => (
                <div key={idx} className={`bg-gray-800/50 p-4 rounded-lg border-l-2 ${skill.verificationStatus === 'Verified' ? 'border-cardano' : 'border-gray-600 opacity-75'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-200">{skill.skillName}</span>
                    <div className="flex gap-2 items-center">
                        {skill.verificationStatus === 'Unverified' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-400 border border-red-900">Unverified</span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 font-mono">{skill.confidenceLevel}%</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 bg-black/20 p-2 rounded">
                      <span className="text-cardano font-bold uppercase text-[10px]">AI Reasoning:</span><br/>
                      {skill.reasoning}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center">
          <button 
            onClick={handleMint}
            disabled={!canMint}
            className={`px-10 py-4 font-bold text-xl rounded-xl shadow-lg transition-all transform hover:-translate-y-1 ${
                !canMint
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cardano to-blue-600 text-black hover:shadow-cardano/50'
            }`}
          >
            {!canMint ? 'Verification Failed (Identity Mismatch)' : 'Mint Skill NFT on Cardano'}
          </button>
          <p className="mt-3 text-sm text-gray-500">
            {!canMint
             ? "Cannot mint. Identity verification failed." 
             : `This will create a permanent, tamper-proof record of ${editableName}'s verified skills.`}
          </p>
        </div>

        {/* --- AI COACH CHATBOT UI --- */}
        <div className={`fixed bottom-8 right-8 z-50 transition-all duration-300 ${isChatOpen ? 'w-96' : 'w-auto'}`}>
          {!isChatOpen && (
             <button 
                onClick={() => setIsChatOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-cardano to-blue-600 text-black font-bold px-6 py-4 rounded-full shadow-[0_0_20px_rgba(0,209,174,0.4)] hover:scale-105 transition-transform animate-bounce"
             >
                <span className="text-2xl">🤖</span>
                Chat with Resume Coach
             </button>
          )}

          {isChatOpen && (
            <div className="bg-[#1F2833] border border-gray-600 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
                {/* Header */}
                <div className="bg-gradient-to-r from-cardano to-blue-600 p-4 flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      <span className="text-xl">🤖</span>
                      <div>
                        <h4 className="font-bold text-black text-sm">Resume Coach AI</h4>
                        <p className="text-[10px] text-black/70 font-mono">Plagiarism & Skill Analysis</p>
                      </div>
                   </div>
                   <button onClick={() => setIsChatOpen(false)} className="text-black/50 hover:text-black font-bold">✕</button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0B0C10] custom-scrollbar">
                   {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200 border border-gray-700'}`}>
                             {msg.text}
                          </div>
                      </div>
                   ))}
                   {isChatLoading && (
                      <div className="flex justify-start">
                         <div className="bg-gray-800 p-3 rounded-lg flex gap-1">
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                         </div>
                      </div>
                   )}
                   <div ref={chatEndRef}></div>
                </div>

                {/* Input */}
                <form onSubmit={handleSendChat} className="p-3 border-t border-gray-700 bg-[#1F2833] flex gap-2">
                   <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask how to improve..."
                      className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-cardano outline-none"
                   />
                   <button 
                     type="submit" 
                     className="bg-cardano text-black p-2 rounded-lg hover:bg-cardano-dark transition-colors"
                     disabled={isChatLoading}
                   >
                     ➤
                   </button>
                </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentState === AppState.MINTING) {
    const steps = [
      "Calculating Plutus Script ExUnits...",
      "Waiting for Charles to finish his AMA...", // Meme
      "Consulting the Summons of the Lobster...", // Meme
      "Minting NFT on Cardano Layer 1..."
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative w-32 h-32 mb-8">
          <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-cardano rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-4xl">⛓️</div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-6">Securing Your Identity</h2>
        <div className="space-y-4 w-full max-w-md">
          {steps.map((s, idx) => (
            <div key={idx} className={`flex items-center gap-3 transition-opacity duration-500 ${idx < mintStep ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${idx < mintStep ? 'bg-cardano text-black' : 'bg-gray-800'}`}>
                {idx < mintStep && '✓'}
              </div>
              <span className={idx < mintStep ? 'text-white' : 'text-gray-500'}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (currentState === AppState.MINT_SUCCESS) {
    const did = user ? user.profile.id : "did:cardano:unknown";
    const name = user ? user.name : (editableName || "Candidate");
    const score = analysis?.overallAuthenticityScore || 0;
    
    // Calculate Rank
    let rank = "Bronze";
    if (score >= 90) rank = "Diamond";
    else if (score >= 80) rank = "Platinum";
    else if (score >= 70) rank = "Gold";
    else if (score >= 60) rank = "Silver";

    // Format individual skills list
    const skillsList = analysis?.technicalSkills.map(s => `- ${s.skillName}: ${s.confidenceLevel}%`).join('\n') || "No skills";
    
    // Create detailed text payload for the QR code
    const qrText = `VERIFIED SKILL IDENTITY
Name: ${name}
Role: ${analysis?.identifiedRole}
Rank: ${rank}
Overall Skill Percentage: ${score}%

SKILL BREAKDOWN:
${skillsList}

Asset ID: ${generatedAssetId}`;
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrText)}`;

    // Prepare chart data for display on this page
    const data = analysis ? analysis.technicalSkills.map(s => ({
        name: s.skillName,
        score: s.confidenceLevel,
        fullMark: 100,
        verified: s.verificationStatus === 'Verified'
      })) : [];

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 pb-20">
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 neon-glow">
          <svg className="w-12 h-12 text-cardano" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h2 className="text-4xl font-display font-bold text-white mb-4">Skill NFT Minted!</h2>
        
        {/* QR CODE GENERATION */}
        <div className="bg-white p-4 rounded-xl mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <img 
                src={qrUrl}
                alt="Verified ID QR" 
                className="w-48 h-48"
            />
            <p className="text-black text-[10px] mt-2 font-bold uppercase">Scan for Verification</p>
        </div>
        
        <p className="text-gray-400 max-w-lg mb-4">
          Your verified credentials are now stored on-chain. Employers can scan this QR code to instantly verify your skill breakdown.
        </p>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-dashed border-gray-600 mb-8 w-full max-w-md">
           <div className="text-xs text-gray-500 uppercase mb-1">Asset ID (Cardano)</div>
           <div className="font-mono text-cardano break-all text-sm font-bold">
               {generatedAssetId}
           </div>
        </div>

        {/* --- COMPLETE DASHBOARD VIEW ON MINT PAGE --- */}
        <div className="w-full max-w-4xl mt-8 pt-8 border-t border-gray-800 animate-in fade-in slide-in-from-bottom-10 duration-700">
             <h3 className="text-2xl font-bold text-white mb-6">Verified Skill Dashboard</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-4">Skill Confidence</h3>
                    <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{fill: '#ccc'}} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2833', border: '1px solid #00D1AE' }} 
                            itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                            {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.verified ? (entry.score > 80 ? '#00D1AE' : '#FBBF24') : '#4B5563'} />
                            ))}
                        </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-4">Breakdown</h3>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar max-h-64">
                    {analysis?.technicalSkills.map((skill, idx) => (
                        <div key={idx} className={`bg-gray-800/50 p-3 rounded-lg border-l-2 ${skill.verificationStatus === 'Verified' ? 'border-cardano' : 'border-gray-600 opacity-75'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-gray-200 text-sm">{skill.skillName}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 font-mono">{skill.confidenceLevel}%</span>
                        </div>
                        <p className="text-[10px] text-gray-400">{skill.reasoning}</p>
                        </div>
                    ))}
                    </div>
                </div>
             </div>
        </div>

        <div className="flex gap-4 mt-8">
            {user ? (
                <button 
                    onClick={() => setAppState(AppState.PROFILE)}
                    className="px-6 py-3 bg-cardano text-black font-bold rounded-lg"
                >
                    Save & Go to Profile
                </button>
            ) : (
                <button 
                    onClick={() => setAppState(AppState.AUTH)}
                    className="px-6 py-3 bg-cardano text-black font-bold rounded-lg animate-pulse"
                >
                    Create Account to Save
                </button>
            )}
            
            <button 
                onClick={() => setAppState(AppState.LANDING)}
                className="px-6 py-3 border border-gray-600 rounded-lg hover:bg-gray-800"
            >
                Back Home
            </button>
        </div>
      </div>
    );
  }

  return null;
};

export default CandidateFlow;