import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CandidateFlow from './components/CandidateFlow';
import EmployerFlow from './components/EmployerFlow';
import Auth from './components/Auth';
import ProfileDashboard from './components/ProfileDashboard';
import { AppState, CandidateProfile, User } from './types';
import { db } from './services/db';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [history, setHistory] = useState<AppState[]>([]);
  const [verifiedProfile, setVerifiedProfile] = useState<CandidateProfile | null>(null);
  
  // Session State with Safe Parsing
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedSession = localStorage.getItem('skillchain_active_session');
      return savedSession ? JSON.parse(savedSession) : null;
    } catch (e) {
      console.error("Failed to parse session", e);
      return null;
    }
  });

  // Effect to sync verifiedProfile on load if user is logged in
  useEffect(() => {
    if (user && user.profile && !verifiedProfile) {
      setVerifiedProfile(user.profile);
    }
  }, [user]);

  // Navigation wrapper to track history
  const navigateTo = (newState: AppState) => {
    setHistory(prev => [...prev, appState]);
    setAppState(newState);
  };

  const goBack = () => {
    if (history.length > 0) {
      const prevState = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setAppState(prevState);
    } else {
      setAppState(AppState.LANDING);
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('skillchain_active_session', JSON.stringify(loggedInUser));
    
    if (loggedInUser.profile) {
        setVerifiedProfile(loggedInUser.profile);
    }
    navigateTo(AppState.PROFILE);
  };

  const handleLogout = () => {
    setUser(null);
    setVerifiedProfile(null); 
    setHistory([]);
    setAppState(AppState.LANDING);
    localStorage.removeItem('skillchain_active_session');
  };

  // Wrapper for setUser to ensure persistence when profile changes (e.g. Minting)
  const persistUserUpdate = async (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('skillchain_active_session', JSON.stringify(updatedUser));
    
    // Update in "MongoDB"
    await db.users.updateOne({ email: updatedUser.email }, updatedUser);
  };

  const updateUserSkill = async (skillName: string, newScore: number, projectData: any) => {
    if (!user) return;
    
    const updatedSkills = user.profile.skills.map(skill => {
        if (skill.name === skillName) {
            return { ...skill, confidenceScore: newScore };
        }
        return skill;
    });

    const updatedProjects = user.profile.projects ? [...user.profile.projects, projectData] : [projectData];

    const updatedUser = {
        ...user,
        profile: {
            ...user.profile,
            skills: updatedSkills,
            projects: updatedProjects
        }
    };
    
    await persistUserUpdate(updatedUser);
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.LANDING:
        return <Hero setAppState={navigateTo} user={user} />;
      
      case AppState.AUTH:
        return (
          <Auth 
            setAppState={navigateTo} 
            goBack={goBack}
            onLoginSuccess={handleLoginSuccess}
            pendingProfile={verifiedProfile}
          />
        );

      case AppState.PROFILE:
        if (!user) return <Auth setAppState={navigateTo} goBack={goBack} onLoginSuccess={handleLoginSuccess} pendingProfile={verifiedProfile} />;
        return (
          <ProfileDashboard 
            user={user} 
            updateUserSkill={updateUserSkill}
            setAppState={navigateTo}
            goBack={goBack}
          />
        );

      case AppState.CANDIDATE_UPLOAD:
      case AppState.ANALYSIS_RESULT:
      case AppState.MINTING:
      case AppState.MINT_SUCCESS:
        return (
          <CandidateFlow 
            setAppState={navigateTo} 
            goBack={goBack}
            currentState={appState}
            setVerifiedProfile={setVerifiedProfile}
            user={user}
            setUser={persistUserUpdate}
          />
        );
      
      case AppState.EMPLOYER_VERIFY:
      case AppState.EMPLOYER_VIEW:
        return (
          <EmployerFlow 
            setAppState={navigateTo} 
            goBack={goBack}
            currentState={appState}
            verifiedProfile={verifiedProfile}
          />
        );
      default:
        return <Hero setAppState={navigateTo} user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-cardano-bg text-white font-sans selection:bg-cardano selection:text-black">
      <Navbar 
        setAppState={navigateTo} 
        currentState={appState} 
        user={user} 
        handleLogout={handleLogout}
      />
      <main className="container mx-auto">
        {(!process.env.API_KEY || process.env.API_KEY === "") && (
          <div className="bg-red-600 text-white text-center text-xs py-1">
             Development Warning: API Key not found in .env file. AI features will fail.
          </div>
        )}
        {renderContent()}
      </main>
      
      <footer className="w-full py-8 mt-12 text-center border-t border-gray-900 bg-black/20">
        <p className="text-cardano font-mono text-xs tracking-widest mb-2">"Trust the Skills, Not the Claims."</p>
        <p className="text-gray-600 text-sm">SkillChain © 2025 | Built by Terminal Titans for Cardano IBW Hackathon</p>
      </footer>
    </div>
  );
};

export default App;