
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, ProjectEvaluationResult, ChatMessage } from "../types";

// Lazy initialization to prevent crash on load if key is missing
let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    const key = process.env.API_KEY;
    if (!key || key.length === 0) {
      console.error("API Key is missing");
      // We don't throw here to allow UI to render, validation happens in functions
    }
    aiClient = new GoogleGenAI({ apiKey: key || "dummy_key_to_prevent_crash" });
  }
  return aiClient;
};

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    candidateName: { type: Type.STRING, description: "Name extracted from resume. If not found, return 'Unknown Candidate'." },
    identifiedRole: { type: Type.STRING, description: "Primary job role identified" },
    identityVerification: {
      type: Type.OBJECT,
      properties: {
        matchStatus: { type: Type.STRING, enum: ['MATCH', 'MISMATCH', 'PARTIAL'] },
        reasoning: { type: Type.STRING, description: "Explanation of the name matching. Mention if LinkedIn failed (Full Name required) or GitHub passed/failed (First Name required)." }
      },
      required: ["matchStatus", "reasoning"]
    },
    projectUniquenessVerification: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, enum: ['UNIQUE', 'GENERIC', 'COPIED'] },
        originalityScore: { type: Type.NUMBER, description: "0-100 score. High if projects seem unique/custom. Low if they look like tutorials or copy-pasted templates." },
        reasoning: { type: Type.STRING, description: "Check if projects are unique or just generic tutorials found on the internet. Ensure they match between GitHub and LinkedIn." }
      },
      required: ["status", "originalityScore", "reasoning"]
    },
    certificates: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                issuer: { type: Type.STRING },
                issueDate: { type: Type.STRING },
                authenticityScore: { type: Type.NUMBER, description: "0-100 likelihood of being authentic based on forensic analysis." },
                verificationStatus: { type: Type.STRING, enum: ['Likely Authentic', 'Suspicious', 'Likely Original'] },
                reasoning: { type: Type.STRING, description: "Detailed forensic analysis. Mention if QR Code data matched the text or if Serial Number format (e.g. NPTEL) was valid." }
            },
            required: ["name", "issuer", "authenticityScore", "verificationStatus", "reasoning"]
        }
    },
    professionalSummary: { type: Type.STRING, description: "Short summary of the candidate" },
    overallAuthenticityScore: { type: Type.NUMBER, description: "A score from 0-100 indicating how realistic the resume claims appear based on context" },
    technicalSkills: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skillName: { type: Type.STRING },
          confidenceLevel: { type: Type.NUMBER, description: "0 to 100 confidence score based on keywords and context" },
          reasoning: { type: Type.STRING, description: "Why this confidence score was given" },
          verificationStatus: { type: Type.STRING, enum: ['Verified', 'Unverified'], description: "Mark 'Verified' only if skill is supported by project links or strong evidence suitable for GitHub/LinkedIn. Mark 'Unverified' if it lacks proof." }
        },
        required: ["skillName", "confidenceLevel", "reasoning", "verificationStatus"]
      }
    }
  },
  required: ["candidateName", "identifiedRole", "identityVerification", "projectUniquenessVerification", "professionalSummary", "overallAuthenticityScore", "technicalSkills", "certificates"]
};

const projectEvaluationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    newConfidenceScore: { type: Type.NUMBER, description: "The new calculated confidence score (0-100)." },
    reasoning: { type: Type.STRING, description: "Explanation for the score change (or lack thereof)." },
    skillImproved: { type: Type.BOOLEAN, description: "True if the score increased." }
  },
  required: ["newConfidenceScore", "reasoning", "skillImproved"]
};

export const analyzeResume = async (
  input: string | { mimeType: string; data: string },
  certificateInput: { mimeType: string; data: string } | null,
  githubUrl: string,
  linkedinUrl: string
): Promise<AnalysisResult> => {
  
  if (!process.env.API_KEY || process.env.API_KEY.length === 0) {
    throw new Error("Missing API Key. Please check your .env file.");
  }

  const isFile = typeof input !== 'string';
  
  const textPrompt = `
    You are a strict Audit AI for 'SkillChain'. 
    Input Data:
    - GitHub Profile: ${githubUrl}
    - LinkedIn Profile: ${linkedinUrl}
    
    Tasks:
    1. **Identity Check**: Compare the name found on the Resume with the GitHub and LinkedIn URLs/profiles.
       - **LinkedIn Rule**: The Resume Name MUST match the **COMPLETE Full Name** found in the LinkedIn URL or profile context. If the full name doesn't match, this is a fatal error (set matchStatus: 'MISMATCH').
       - **GitHub Rule**: The Resume Name only needs to match the **First Name** found in the GitHub username or profile. Partial match is acceptable here.
       - Logic: 
         - If LinkedIn Full Name match fails -> 'MISMATCH'.
         - If LinkedIn matches but GitHub First Name match fails -> 'PARTIAL'.
         - If both pass (LinkedIn Full + GitHub First) -> 'MATCH'.
    
    2. **Project Uniqueness & Originality Check**:
       - Analyze the projects listed in the Resume/Input.
       - Compare them with typical projects found on the internet (e.g., "To-Do List", "Weather App", "Calculator").
       - If the projects are generic tutorials without custom features, mark projectUniquenessVerification.status as 'GENERIC'.
       - If the projects appear to be direct copies of popular repositories without attribution, mark as 'COPIED'.
       - If the projects show unique problem solving or are consistent across the provided GitHub/LinkedIn (i.e., same project listed on both), mark as 'UNIQUE'.
       
    3. **Certificate Forensic Analysis (CRITICAL)**: 
       You are an expert certificate authenticity forensic engine.
       
       **Rules for Verification Status**:
       - **"Likely Authentic"**: Award this status IF:
          a) A **QR Code** is present, and you can infer the URL/Data matches the candidate name or certificate context.
          b) A **valid Government or Institution Serial Number** (e.g., NPTEL ID like 'NPTEL23CS...', University Reg No) is present and follows the correct pattern for that issuer.
          c) Watermarks, seals, and signatures are crisp, aligned, and professional.
       
       - **"Suspicious"**: Award this status IF:
          a) Fonts are inconsistent (e.g., name is in a different font than the body text).
          b) Alignment is off (text floating above lines).
          c) QR code looks pixelated/pasted while text is sharp.
          d) Spelling errors in issuer name (e.g., "Universty").
       
       - **"Likely Original"**: Use this if the certificate appears visually correct (consistent fonts, proper layout, professional design) but lacks advanced digital verification features (like a QR code) or a verifiable government serial number. It looks like a standard original document but cannot be digitally authenticated without an external database.

       **Specific Checks to Perform**:
       - **QR Check**: Does the QR code exist? Does it look like part of the original print? If you can read the pattern, does it point to a valid domain (nptel.ac.in, coursera.org, udemy.com)?
       - **Serial Number Check**: Extract the Certificate ID. Does it match the format for the issuer? (e.g. NPTEL IDs are alphanumeric strings starting with NPTEL).
       - **Name Match**: Does the name on the certificate EXACTLY match the resume candidate name?
    
    4. **Skill Verification**: Extract skills. 
       - If a skill is backed by specific project descriptions, repo links, or clear experience that would appear on GitHub/LinkedIn, mark it 'Verified'.
       - If a skill is just a keyword without depth (e.g., listing "Advanced AI" but no AI projects), mark it 'Unverified'.

    5. **Scoring**: 
       - High Confidence (80-100): Validated by project context.
       - Low Confidence (0-40): Unsupported claim.
  `;

  const parts: any[] = [];

  // Add Resume Data
  if (isFile) {
    parts.push({ inlineData: { mimeType: input.mimeType, data: input.data } });
  } else {
    parts.push({ text: `Resume Text:\n${input}` });
  }

  // Add Certificate Data if present
  if (certificateInput) {
    parts.push({ text: "Certificate Document for Forensic Analysis:" });
    parts.push({ inlineData: { mimeType: certificateInput.mimeType, data: certificateInput.data } });
  }

  parts.push({ text: textPrompt });

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "You are a forensic document examiner. Use QR code context and Serial Number patterns to determine authenticity. Do not default to 'unknown' if evidence exists."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback mock data
    return {
      candidateName: "Unknown Candidate",
      identifiedRole: "Developer",
      identityVerification: { matchStatus: "PARTIAL", reasoning: "Analysis service unavailable. Check API Key." },
      projectUniquenessVerification: { status: "GENERIC", originalityScore: 50, reasoning: "Service unavailable." },
      professionalSummary: "Analysis failed. Please try again or check your API key in .env file.",
      overallAuthenticityScore: 0,
      technicalSkills: [],
      certificates: []
    };
  }
};

export const evaluateProjectImpact = async (
  skillName: string,
  currentScore: number,
  projectName: string,
  projectLink: string,
  projectDescription: string
): Promise<ProjectEvaluationResult> => {
  
  if (!process.env.API_KEY) {
     return {
      newConfidenceScore: currentScore,
      reasoning: "API Key missing. Cannot evaluate.",
      skillImproved: false
    };
  }

  const prompt = `
    The user wants to improve the confidence score for the skill: "${skillName}".
    Current Confidence Score: ${currentScore}/100.
    
    New Project Submitted:
    - Name: ${projectName}
    - Link: ${projectLink}
    - Description: ${projectDescription}

    Analyze if this new project demonstrates competency in "${skillName}".
    If the project is relevant and substantial, increase the score.
    If the link is a GitHub link, assume the code quality is good (simulated).
    If the project is irrelevant, keep the score same or minimally changed.
    Return the new score (0-100), reasoning, and boolean if improved.
  `;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: projectEvaluationSchema,
        systemInstruction: "You are a strict technical auditor evaluating project evidence."
      }
    });
    
    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text) as ProjectEvaluationResult;

  } catch (error) {
    console.error("Project Evaluation Error", error);
    return {
      newConfidenceScore: currentScore,
      reasoning: "AI service temporarily unavailable. Score unchanged.",
      skillImproved: false
    };
  }
};

export const getResumeCoachResponse = async (
  chatHistory: ChatMessage[],
  analysisContext: AnalysisResult
): Promise<string> => {
  if (!process.env.API_KEY) return "Chat unavailable. Please check API Key.";

  const prompt = `
    You are an AI Resume Coach for SkillChain.
    
    Current Resume Analysis Context:
    - Candidate Role: ${analysisContext.identifiedRole}
    - Overall Score: ${analysisContext.overallAuthenticityScore}
    - Project Verification Status: ${analysisContext.projectUniquenessVerification.status}
    - Skills identified: ${analysisContext.technicalSkills.map(s => `${s.skillName} (${s.confidenceLevel}%)`).join(', ')}

    User's Chat History:
    ${chatHistory.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}

    Your Goal:
    1. Suggest specific text changes to improve the resume based on the low-confidence skills.
    2. If the user asks about projects, clearly state if they look "Unique", "Generic", or "Copied" (Plagiarized) based on the analysis context, and suggest how to make them look more unique (e.g., adding metrics, unique features).
    3. Be encouraging but professional. Keep answers under 100 words unless detailed advice is requested.
  `;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful, expert career coach and plagiarism detector."
      }
    });
    return response.text || "I couldn't generate a suggestion right now.";
  } catch (error) {
    console.error("Chat Error", error);
    return "I'm having trouble connecting to the coaching server right now.";
  }
};