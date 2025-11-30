
export interface Skill {
  name: string;
  confidenceScore: number; // 0-100
  source: string; // e.g., "Resume Analysis", "GitHub Repo"
  verified: boolean;
  history?: { date: string; score: number; reason: string }[];
}

export interface Project {
  name: string;
  link: string;
  description: string;
  dateAdded: string;
}

export interface Certificate {
  name: string;
  issuer: string;
  issueDate: string;
  authenticityScore: number; // 0-100
  verificationStatus: 'Likely Authentic' | 'Suspicious' | 'Likely Original';
  reasoning: string;
}

export interface User {
  email: string;
  name: string;
  password?: string; // In a real app, this would be hashed
  profile: CandidateProfile;
}

export interface CandidateProfile {
  id: string;
  name: string;
  role: string;
  skills: Skill[];
  projects?: Project[];
  certificates?: Certificate[];
  summary: string;
  walletAddress?: string;
  nftHash?: string;
  mintDate?: string;
  overallScore?: number; // The AI's Authenticity Score
}

export interface IdentityVerification {
  matchStatus: 'MATCH' | 'MISMATCH' | 'PARTIAL';
  reasoning: string;
}

export interface ProjectUniquenessVerification {
  status: 'UNIQUE' | 'GENERIC' | 'COPIED';
  originalityScore: number; // 0-100
  reasoning: string;
}

export interface AnalysisResult {
  candidateName: string;
  identifiedRole: string;
  identityVerification: IdentityVerification;
  projectUniquenessVerification: ProjectUniquenessVerification;
  technicalSkills: {
    skillName: string;
    confidenceLevel: number; // 0-100
    reasoning: string;
    verificationStatus: 'Verified' | 'Unverified';
  }[];
  certificates: {
    name: string;
    issuer: string;
    issueDate: string;
    authenticityScore: number;
    verificationStatus: 'Likely Authentic' | 'Suspicious' | 'Likely Original';
    reasoning: string;
  }[];
  professionalSummary: string;
  overallAuthenticityScore: number;
}

export interface ProjectEvaluationResult {
  newConfidenceScore: number;
  reasoning: string;
  skillImproved: boolean;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export enum AppState {
  LANDING = 'LANDING',
  AUTH = 'AUTH',
  PROFILE = 'PROFILE',
  CANDIDATE_UPLOAD = 'CANDIDATE_UPLOAD',
  ANALYSIS_RESULT = 'ANALYSIS_RESULT',
  MINTING = 'MINTING',
  MINT_SUCCESS = 'MINT_SUCCESS',
  EMPLOYER_VERIFY = 'EMPLOYER_VERIFY',
  EMPLOYER_VIEW = 'EMPLOYER_VIEW'
}