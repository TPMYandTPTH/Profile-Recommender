import { useState, useRef, useEffect } from 'react';
import { Loader2, Sparkles, Copy, Check, AlertCircle, FileText, ArrowRight, Target, Brain, Languages, Building2, Briefcase, Calendar, Wallet, TrendingUp, Upload, X, File, Heart, Shield, Activity, ShoppingBag, Monitor, MessageSquare, HelpCircle, ThumbsUp, ThumbsDown, Minus, Map, Users, ExternalLink, BarChart3, Code, UserCheck, GraduationCap, Gauge, Zap, Download, Settings, Key, Eye, EyeOff } from 'lucide-react';

export default function ProfileRecommender() {
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Location & language context state
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [nationalityType, setNationalityType] = useState('');
  const [specificNationalities, setSpecificNationalities] = useState([]);
  // Bid feasibility inputs (optional)
  const [targetSeats, setTargetSeats] = useState('');
  const [timeframeDays, setTimeframeDays] = useState('');
  const [languages, setLanguages] = useState([
    { language: '', cefr: '' }
  ]);

  // Active tab in output panel
  const [activeTab, setActiveTab] = useState('overview');

  // ─── API KEY MANAGEMENT ─────────────────────────────────────────────
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('anthropic_api_key');
      if (stored) {
        setApiKey(stored);
        setApiKeyInput(stored);
      } else {
        // Open settings modal on first visit
        setShowSettings(true);
      }
    } catch (e) {
      // localStorage may be blocked in some browsers
      console.warn('localStorage unavailable');
    }
  }, []);

  const saveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem('anthropic_api_key', trimmed);
    } catch (e) {
      console.warn('Could not persist API key to localStorage');
    }
    setApiKey(trimmed);
    setKeySaved(true);
    setTimeout(() => {
      setKeySaved(false);
      setShowSettings(false);
    }, 1200);
  };

  const clearApiKey = () => {
    try {
      localStorage.removeItem('anthropic_api_key');
    } catch (e) {}
    setApiKey('');
    setApiKeyInput('');
  };

  // Helper to build the headers needed for browser-side Anthropic API calls
  const buildApiHeaders = () => ({
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  });

  // ─── FIT MATCH MODE STATE ────────────────────────────────────────────
  const [mode, setMode] = useState('recommender'); // 'recommender' | 'fitmatch'

  const [fmJDText, setFmJDText] = useState('');
  const [fmJDFile, setFmJDFile] = useState(null);
  const [fmCVText, setFmCVText] = useState('');
  const [fmCVFile, setFmCVFile] = useState(null);
  const [fmHalloText, setFmHalloText] = useState('');
  const [fmHalloFile, setFmHalloFile] = useState(null);

  const [fmProcessing, setFmProcessing] = useState({ jd: false, cv: false, hallo: false });
  const [fmLoading, setFmLoading] = useState(false);
  const [fmAnalysis, setFmAnalysis] = useState(null);
  const [fmError, setFmError] = useState(null);
  const [fmCopied, setFmCopied] = useState(false);
  const [fmDownloading, setFmDownloading] = useState(false);
  const fmOutputRef = useRef(null);

  const jdInputRef = useRef(null);
  const cvInputRef = useRef(null);
  const halloInputRef = useRef(null);

  // Load mammoth.js for DOCX parsing on demand
  const loadMammoth = () => {
    return new Promise((resolve, reject) => {
      if (window.mammoth) return resolve(window.mammoth);
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
      script.onload = () => resolve(window.mammoth);
      script.onerror = () => reject(new Error('Failed to load DOCX parser'));
      document.head.appendChild(script);
    });
  };

  // Extract text from DOCX using mammoth
  const extractDocx = async (file) => {
    const mammoth = await loadMammoth();
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  // Send PDF to Claude API for text extraction (Claude can read PDFs natively)
  const extractPdfViaClaude = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: buildApiHeaders(),
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Data
                }
              },
              {
                type: "text",
                text: "Extract the full text content of this job description document. Return only the raw text, no commentary, no formatting headers. Preserve the structure (role, scope, requirements, etc.)."
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    return data.content
      .filter(item => item.type === "text")
      .map(item => item.text)
      .join("\n");
  };

  const handleFile = async (file) => {
    if (!file) return;
    setError(null);
    setProcessingFile(true);
    setUploadedFile({ name: file.name, size: file.size, type: file.type });

    try {
      let text = '';
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
        text = await extractPdfViaClaude(file);
      } else if (fileName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await extractDocx(file);
      } else if (fileName.endsWith('.doc')) {
        throw new Error('Legacy .doc format not supported. Please save as .docx or .pdf and try again.');
      } else if (fileName.endsWith('.txt') || file.type === 'text/plain') {
        text = await file.text();
      } else {
        throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT.');
      }

      if (!text || text.trim().length < 50) {
        throw new Error('Could not extract meaningful text from the file. The file may be image-only or corrupted.');
      }

      setJobDescription(text.trim());
    } catch (err) {
      console.error('File processing error:', err);
      setError(err.message || 'Failed to process file');
      setUploadedFile(null);
    } finally {
      setProcessingFile(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  };

  const clearFile = () => {
    setUploadedFile(null);
    setJobDescription('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // ─── FIT MATCH FILE HANDLERS ─────────────────────────────────────────
  const processFitMatchFile = async (file, kind) => {
    setFmError(null);
    setFmProcessing(prev => ({ ...prev, [kind]: true }));

    try {
      let text = '';
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
        text = await extractPdfViaClaude(file);
      } else if (fileName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await extractDocx(file);
      } else if (fileName.endsWith('.doc')) {
        throw new Error('Legacy .doc format not supported. Please save as .docx or .pdf.');
      } else if (fileName.endsWith('.txt') || file.type === 'text/plain') {
        text = await file.text();
      } else {
        throw new Error('Unsupported file type. Use PDF, DOCX, or TXT.');
      }

      if (!text || text.trim().length < 50) {
        throw new Error('Could not extract usable text. File may be image-only.');
      }

      const fileMeta = { name: file.name, size: file.size, type: file.type };
      if (kind === 'jd') { setFmJDText(text.trim()); setFmJDFile(fileMeta); }
      else if (kind === 'cv') { setFmCVText(text.trim()); setFmCVFile(fileMeta); }
      else if (kind === 'hallo') { setFmHalloText(text.trim()); setFmHalloFile(fileMeta); }
    } catch (err) {
      console.error(`Fit Match ${kind} processing error:`, err);
      setFmError(`${kind.toUpperCase()}: ${err.message}`);
    } finally {
      setFmProcessing(prev => ({ ...prev, [kind]: false }));
    }
  };

  const clearFitMatchFile = (kind) => {
    if (kind === 'jd') { setFmJDFile(null); setFmJDText(''); if (jdInputRef.current) jdInputRef.current.value = ''; }
    else if (kind === 'cv') { setFmCVFile(null); setFmCVText(''); if (cvInputRef.current) cvInputRef.current.value = ''; }
    else if (kind === 'hallo') { setFmHalloFile(null); setFmHalloText(''); if (halloInputRef.current) halloInputRef.current.value = ''; }
  };

  // ─── FIT MATCH ANALYSIS ──────────────────────────────────────────────
  const runFitMatch = async () => {
    if (!apiKey) {
      setFmError('Please add your Anthropic API key via Settings (gear icon, top right).');
      setShowSettings(true);
      return;
    }
    if (!fmJDText || !fmCVText || !fmHalloText) {
      setFmError('Please upload all three documents: Job Description, CV/Resume, and Hallo.ai Assessment.');
      return;
    }

    setFmLoading(true);
    setFmError(null);
    setFmAnalysis(null);

    const prompt = `You are an expert TP APAC talent acquisition assessor specializing in candidate-to-role fit analysis for BPO hiring. You will produce a structured fit-match analysis combining the JD requirements, the candidate's CV, and their Hallo.ai assessment scores.

═══════════════════════════════════════════════════════════════
OPERATIONAL CONTEXT (USER-PROVIDED — THIS IS AUTHORITATIVE)
═══════════════════════════════════════════════════════════════
- Country: ${country || 'Not specified'}
- City: ${city || 'Not specified'}
- Nationality Preference: ${NATIONALITY_TYPES.find(n => n.value === nationalityType)?.label || 'Not specified'}
${specificNationalities.length > 0 ? `- Specific Nationalities Targeted: ${specificNationalities.join(', ')}` : ''}
- Required Languages & CEFR:
${languages.filter(l => l.language && l.cefr).map((l, i) => `  ${i + 1}. ${l.language} — ${l.cefr}`).join('\n') || '  (none — fall back to JD)'}

═══ OVERRIDE RULES ═══
The Operational Context above is ABSOLUTELY AUTHORITATIVE and OVERRIDES any conflicting information found in the JD. This is non-negotiable:

1. LOCATION OVERRIDE: If the user specified Country/City, treat the role as physically located there. IGNORE any city/country mentioned in the JD. When scoring "Cultural & Context Fit" and geographic match, use the user-specified location, NOT the JD's location. Example: if JD says "Bogota" but user specifies "Kuala Lumpur", treat the role as a KL role for ALL fit scoring purposes including candidate proximity, work-permit applicability, and commute feasibility.

2. LANGUAGE OVERRIDE: If the user specified languages with CEFR levels, use those levels as the threshold. IGNORE any conflicting CEFR mentioned in the JD. When scoring "Language Fit", compare the Hallo.ai scores against the user-specified CEFR, not the JD's.

3. NATIONALITY OVERRIDE: If the user specified a nationality preference, use it as the policy for the role. IGNORE any conflicting nationality language in the JD.

4. ONLY fall back to the JD when the user did NOT specify a given field (left it blank). Empty/not-specified user input means "use the JD's value for this field".

If the user-specified location and the JD location differ, note this in the verdict_rationale ONE TIME ONLY as context (e.g., "Role is located in KL per user spec; JD mentions Bogota — treating as KL role"), then proceed with all scoring against the user-specified location.

═══ CRITICAL IDENTITY CROSS-CHECK ═══
Before scoring, verify the Hallo.ai assessment belongs to the same candidate as the CV. Check:
- Name on CV vs name on Hallo.ai report — if different, this is a MAJOR red flag
- Language tested on Hallo.ai vs language required by JD — if mismatched (e.g. JD requires English, Hallo.ai tested Mandarin), the assessment may be irrelevant
- If identity does not match, set verdict = "Do Not Hire", flag in red_flags, lower confidence to "High" only if the mismatch is unambiguous, and explain prominently in verdict_rationale that the wrong assessment was provided.

═══ ROLE-LEVEL ALIGNMENT CHECK ═══
Before scoring, check fundamental role/seniority alignment:
- Seniority gap: e.g., Director-level CV applying for frontline agent role = critical misalignment
- Function gap: e.g., HR/TA professional applying for customer-service role with no CS background = critical misalignment
- Industry gap: e.g., pure software engineer applying for hospitality concierge = critical misalignment
- If any of these apply, set verdict = "Do Not Hire" with rationale citing the structural mismatch. No training plan can fix structural mismatches.

NOTE: The Identity Cross-Check and Role-Level Alignment checks above are pre-screens. If either fails, verdict is "Do Not Hire" regardless of fit score. The CEFR floor rule below has the same effect. See "VERDICT LOGIC" section below for full score-threshold mapping.

JOB DESCRIPTION:
${fmJDText}

CANDIDATE CV / RESUME:
${fmCVText}

HALLO.AI ASSESSMENT RESULT:
${fmHalloText}

Analyze the candidate's fit across 6 dimensions, with explicit attention to what is TRAINABLE vs INHERENT.

TRAINABILITY FRAMEWORK (apply this lens throughout):
HIGHLY TRAINABLE (≤30 days): product knowledge, tools/CRM, scripts, processes, basic procedures
MODERATELY TRAINABLE (30-90 days): language fluency (small CEFR gap), technical skills, soft-skill polishing
LOW TRAINABILITY (>90 days or unlikely): personality traits, cognitive ceiling, empathy, decision-making instinct, large language CEFR gap (2+ levels), resilience baseline

THE 6 FIT DIMENSIONS:
1. Language Fit — Hallo CEFR vs JD requirement per language
2. Trainability — gaps that training can close (with estimated training duration + cost implication)
3. Behavioral Fit — Hallo soft-skills + personality vs role's priority sub-dimensions (less trainable)
4. Experience Match — CV's prior roles, companies, tenure vs JD requirements
5. Cultural & Context Fit — nationality basis, location commute, tenure stability signals, prior BPO/in-house mix
6. Cognitive & Personality Headroom — Hallo cognitive + resilience scores vs role complexity (rarely trainable)

For each dimension, assess as: "Strong", "Adequate", "Gap", or "Critical Gap"
Each dimension needs:
- score: one of [Strong / Adequate / Gap / Critical Gap]
- evidence: specific data points from CV/Hallo/JD (cite exact scores or quote phrases)
- gap_type: one of [None / Highly Trainable / Moderately Trainable / Low Trainability / Not Trainable]
- recommendation: 1-2 sentence action

VERDICT LOGIC — TWO HARD RULES + SCORE THRESHOLDS:

═══ HARD RULE 1: CEFR FLOOR (NON-NEGOTIABLE) ═══
The CEFR requirement specified in the Operational Context is the BASELINE built into our Statement of Work with clients. It is the contractual floor and CANNOT be overridden by training potential, behavioral scores, or any other strength.

For every required language:
- If candidate's Hallo.ai CEFR equals OR exceeds the required CEFR → language requirement met
- If candidate's CEFR is BELOW the required CEFR by even one level → AUTOMATIC "Do Not Hire" verdict
  - Set verdict = "Do Not Hire"
  - Set Language Fit dimension score = "Critical Gap"
  - Note in verdict_rationale: "CEFR baseline not met — contractually below SOW threshold. No training plan can override this."
  - Even if all other dimensions are Strong, the verdict remains "Do Not Hire"

Reference CEFR ordering (low to high): A1 < A2 < B1 < B2 < C1 < C2 < Native

═══ HARD RULE 2: STRUCTURAL MISMATCH ═══
If there is a fundamental role/seniority/function mismatch (e.g., Director-level CV for frontline agent role; pure software engineer for hospitality concierge), set verdict = "Do Not Hire" regardless of overall fit score.

═══ SCORE-THRESHOLD VERDICT (only applied if BOTH hard rules pass) ═══
overall_fit_score (0-100) maps to verdict as follows:

- 75-100 → "Hire" — Strong fit, ready for the role with minimal onboarding
- 50-74  → "Hire with Training Plan" — Acceptable fit, requires structured training to close gaps (this IS the hire-and-train zone)
- 35-49  → "Hold" — Borderline; requires further interview, skills test, or additional reference checks before commitment
- 0-34   → "Do Not Hire" — Not recommended; gaps too large or fundamental misalignment

THE 50/100 MARK IS THE CRITICAL FLOOR FOR HIRING. Below 50 is "not recommended to hire". Apply this strictly.

IMPORTANT — Score the overall_fit_score before applying the verdict:
1. First, evaluate all 6 dimensions and produce an honest overall_fit_score (0-100)
2. Then check HARD RULE 1 (CEFR floor). If failed → verdict = "Do Not Hire", override the score
3. Then check HARD RULE 2 (structural mismatch). If failed → verdict = "Do Not Hire", override the score
4. Otherwise, map the score to the verdict using the thresholds above

Do NOT manipulate the overall_fit_score to fit a desired verdict. The score and verdict should both reflect honest analysis. If CEFR or structural mismatch triggers "Do Not Hire", explain in verdict_rationale that the score is overridden by the hard rule.

Respond ONLY with valid JSON (no markdown, no preamble) in this exact format:
{
  "candidate_name": "extracted from CV if possible, else 'Candidate'",
  "role_summary": "1-line role description from JD",
  "verdict": "Hire" or "Hire with Training Plan" or "Hold" or "Do Not Hire",
  "verdict_rationale": "2-3 sentence justification of the verdict",
  "confidence": "High" or "Medium" or "Low",
  "overall_fit_score": number 0-100,
  "headline_metrics": {
    "language_match": "e.g. 'C1 vs B2 required — exceeds'",
    "experience_match": "e.g. '4 yrs vs 3-5 yrs required — match'",
    "behavioral_match": "e.g. 'Empathy 8.2 vs 7.5 required — strong'",
    "cognitive_match": "e.g. 'Cognitive 6.4 vs 6.0 required — adequate'"
  },
  "dimensions": {
    "language_fit": {
      "score": "Strong" or "Adequate" or "Gap" or "Critical Gap",
      "evidence": "specific evidence with exact scores",
      "gap_type": "None" or "Highly Trainable" or "Moderately Trainable" or "Low Trainability" or "Not Trainable",
      "recommendation": "1-2 sentence action"
    },
    "trainability": {
      "score": "Strong" or "Adequate" or "Gap" or "Critical Gap",
      "evidence": "specific evidence",
      "gap_type": "Highly Trainable" or "Moderately Trainable" or "Low Trainability" or "None",
      "recommendation": "1-2 sentence action",
      "trainable_gaps": [
        {
          "gap": "specific skill or knowledge gap",
          "training_duration": "e.g. '2 weeks', '30 days', '8 weeks'",
          "training_type": "e.g. 'Onboarding nesting', 'Product training', 'Tool certification', 'Language coaching'",
          "cost_impact": "Low / Medium / High",
          "rationale": "1-sentence why this is trainable in this timeframe"
        }
      ],
      "non_trainable_concerns": [
        "specific aspect that training cannot fix, if any"
      ]
    },
    "behavioral_fit": {
      "score": "Strong" or "Adequate" or "Gap" or "Critical Gap",
      "evidence": "specific Hallo soft-skill scores vs role priority subs",
      "gap_type": "None" or "Highly Trainable" or "Moderately Trainable" or "Low Trainability" or "Not Trainable",
      "recommendation": "1-2 sentence action",
      "sub_scores": [
        {"dimension": "e.g. Empathy", "candidate_score": "e.g. 8.2", "required": "e.g. 7.5", "status": "Strong/Adequate/Gap"}
      ]
    },
    "experience_match": {
      "score": "Strong" or "Adequate" or "Gap" or "Critical Gap",
      "evidence": "CV prior roles, companies, tenure analysis",
      "gap_type": "None" or "Highly Trainable" or "Moderately Trainable" or "Low Trainability" or "Not Trainable",
      "recommendation": "1-2 sentence action",
      "tenure_signal": "Stable / Mixed / Job-hopper / Unknown",
      "company_relevance": "Direct competitor / Adjacent industry / BPO competitor / Cross-industry / Unrelated"
    },
    "cultural_context": {
      "score": "Strong" or "Adequate" or "Gap" or "Critical Gap",
      "evidence": "nationality, location, language match for context",
      "gap_type": "None" or "Highly Trainable" or "Moderately Trainable" or "Low Trainability" or "Not Trainable",
      "recommendation": "1-2 sentence action"
    },
    "cognitive_personality": {
      "score": "Strong" or "Adequate" or "Gap" or "Critical Gap",
      "evidence": "Hallo cognitive + resilience scores",
      "gap_type": "None" or "Highly Trainable" or "Moderately Trainable" or "Low Trainability" or "Not Trainable",
      "recommendation": "1-2 sentence action"
    }
  },
  "training_plan_summary": {
    "total_duration": "e.g. '4-6 weeks' or 'N/A if no training needed'",
    "total_cost_impact": "Low / Medium / High / None",
    "ramp_time_to_productive": "e.g. '8 weeks to full productivity'",
    "training_plan_summary_text": "2-3 sentence summary of what training is needed"
  },
  "red_flags": ["1-3 specific concerns that need follow-up before offer"],
  "green_flags": ["2-3 specific strengths that make this candidate stand out"]
}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: buildApiHeaders(),
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 6000,
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await response.json();
      const text = data.content
        .filter(item => item.type === "text")
        .map(item => item.text)
        .join("\n");

      let clean = text.replace(/```json|```/g, "").trim();
      try {
        const parsed = JSON.parse(clean);
        setFmAnalysis(parsed);
      } catch (parseErr) {
        const lastBrace = clean.lastIndexOf('}');
        if (lastBrace > 0) {
          try {
            const parsed = JSON.parse(clean.substring(0, lastBrace + 1));
            setFmAnalysis(parsed);
          } catch (e) {
            setFmError(`Fit Match analysis failed: ${parseErr.message}`);
          }
        } else {
          setFmError(`Fit Match analysis failed: ${parseErr.message}`);
        }
      }
    } catch (err) {
      console.error("Fit Match request error:", err);
      setFmError(`Request failed: ${err.message}`);
    } finally {
      setFmLoading(false);
    }
  };

  const copyFitMatchResults = () => {
    if (!fmAnalysis) return;
    const a = fmAnalysis;
    const dims = a.dimensions || {};
    const text = `FIT MATCH ANALYSIS
${'='.repeat(50)}

Candidate: ${a.candidate_name}
Role: ${a.role_summary}
Verdict: ${a.verdict}  (Overall Fit Score: ${a.overall_fit_score}/100, ${a.confidence} confidence)

Rationale: ${a.verdict_rationale}

HEADLINE METRICS
${'-'.repeat(50)}
Language:    ${a.headline_metrics?.language_match || 'N/A'}
Experience:  ${a.headline_metrics?.experience_match || 'N/A'}
Behavioral:  ${a.headline_metrics?.behavioral_match || 'N/A'}
Cognitive:   ${a.headline_metrics?.cognitive_match || 'N/A'}

DIMENSION BREAKDOWN
${'-'.repeat(50)}
${Object.entries(dims).map(([key, d]) => `
[${d.score?.toUpperCase()}] ${key.replace(/_/g, ' ').toUpperCase()}
  Evidence: ${d.evidence}
  Gap Type: ${d.gap_type}
  Action:   ${d.recommendation}`).join('\n')}

${dims.trainability?.trainable_gaps?.length > 0 ? `
TRAINABLE GAPS
${'-'.repeat(50)}
${dims.trainability.trainable_gaps.map(g => `• ${g.gap} — ${g.training_duration} via ${g.training_type} (${g.cost_impact} cost)
  ${g.rationale}`).join('\n')}
` : ''}
${dims.trainability?.non_trainable_concerns?.length > 0 ? `
NON-TRAINABLE CONCERNS
${dims.trainability.non_trainable_concerns.map(c => `• ${c}`).join('\n')}
` : ''}
${a.training_plan_summary ? `
TRAINING PLAN SUMMARY
${'-'.repeat(50)}
Duration:       ${a.training_plan_summary.total_duration}
Cost Impact:    ${a.training_plan_summary.total_cost_impact}
Time-to-Ramp:   ${a.training_plan_summary.ramp_time_to_productive}
Summary:        ${a.training_plan_summary.training_plan_summary_text}
` : ''}
GREEN FLAGS
${a.green_flags?.map(f => `✓ ${f}`).join('\n') || 'None'}

RED FLAGS
${a.red_flags?.map(f => `✗ ${f}`).join('\n') || 'None'}`;

    navigator.clipboard.writeText(text);
    setFmCopied(true);
    setTimeout(() => setFmCopied(false), 2000);
  };

  // ─── PDF DOWNLOAD ────────────────────────────────────────────────────
  // Uses html2pdf.js loaded from CDN. Works outside the Claude artifact sandbox
  // (Vercel, Live Server, any normal hosting environment).
  const loadHtml2Pdf = () => {
    return new Promise((resolve, reject) => {
      if (window.html2pdf) return resolve(window.html2pdf);
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve(window.html2pdf);
      script.onerror = () => reject(new Error('Failed to load PDF library. Check your internet connection.'));
      document.head.appendChild(script);
    });
  };

  const downloadFitMatchPDF = async () => {
    if (!fmAnalysis || !fmOutputRef.current) return;
    setFmDownloading(true);
    setFmError(null);

    try {
      const html2pdf = await loadHtml2Pdf();
      const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const candidateName = (fmAnalysis.candidate_name || 'Candidate').replace(/[^a-zA-Z0-9]+/g, '_');
      const verdict = (fmAnalysis.verdict || 'Result').replace(/[^a-zA-Z0-9]+/g, '_');
      const filename = `${dateStamp}_FitMatch_${candidateName}_${verdict}.pdf`;

      // Build a wrapper with TP-branded header + cloned content + footer
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'padding: 24px; background: #FFFFFF; font-family: "Inter", -apple-system, sans-serif; color: #414141;';

      const header = document.createElement('div');
      header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 2px solid #4B4C6A; margin-bottom: 18px;';
      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="background: #4B4C6A; color: #FFFFFF; font-weight: 700; font-size: 14px; padding: 4px 10px; border-radius: 4px; letter-spacing: 0.05em;">TP</div>
          <div>
            <div style="font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: #676767; font-weight: 600;">TP APAC Talent Acquisition</div>
            <div style="font-size: 16px; font-weight: 700; color: #4B4C6A;">Fit Match Analysis</div>
          </div>
        </div>
        <div style="text-align: right; font-size: 9px; color: #676767;">
          <div style="font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">Generated</div>
          <div style="font-size: 11px; color: #414141; font-weight: 500;">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      `;
      wrapper.appendChild(header);

      // Clone the output content; strip action bar
      const contentClone = fmOutputRef.current.cloneNode(true);
      contentClone.querySelectorAll('[data-pdf-exclude]').forEach(el => el.remove());
      contentClone.style.maxWidth = '100%';
      contentClone.style.width = '100%';
      wrapper.appendChild(contentClone);

      const footer = document.createElement('div');
      footer.style.cssText = 'margin-top: 24px; padding-top: 12px; border-top: 1px solid #CCCCCC; font-size: 9px; color: #676767; display: flex; justify-content: space-between;';
      footer.innerHTML = `
        <div>Profile Recommender · Fit Match · Confidential · TP Internal Use</div>
        <div>Powered by Hallo.ai methodology</div>
      `;
      wrapper.appendChild(footer);

      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#FFFFFF' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(wrapper).save();
    } catch (err) {
      console.error('PDF download error:', err);
      setFmError(`PDF download failed: ${err.message}`);
    } finally {
      setFmDownloading(false);
    }
  };

  // APAC location data
  const APAC_LOCATIONS = {
    'Malaysia': ['Kuala Lumpur', 'Penang', 'Johor Bahru', 'Cyberjaya', 'Petaling Jaya'],
    'Thailand': ['Bangkok', 'Chiang Mai', 'Phuket'],
    'Philippines': ['Manila', 'Cebu', 'Davao', 'Iloilo', 'Bacolod', 'Clark'],
    'Singapore': ['Singapore'],
    'Indonesia': ['Jakarta', 'Surabaya', 'Bandung', 'Bali'],
    'Vietnam': ['Ho Chi Minh City', 'Hanoi', 'Da Nang'],
    'Japan': ['Tokyo', 'Osaka', 'Fukuoka'],
    'South Korea': ['Seoul', 'Busan'],
    'China': ['Shanghai', 'Beijing', 'Shenzhen', 'Guangzhou', 'Chengdu', 'Dalian', 'Xian'],
    'Hong Kong SAR': ['Hong Kong'],
    'Taiwan': ['Taipei', 'Kaohsiung'],
    'India': ['Mumbai', 'Bangalore', 'Delhi NCR', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Gurugram'],
    'Australia': ['Sydney', 'Melbourne', 'Brisbane'],
    'New Zealand': ['Auckland', 'Wellington']
  };

  // Languages commonly hired for in APAC BPO
  const APAC_LANGUAGES = [
    'English', 'Mandarin', 'Cantonese', 'Japanese', 'Korean',
    'Thai', 'Vietnamese', 'Indonesian (Bahasa Indonesia)', 'Malay (Bahasa Melayu)',
    'Tagalog/Filipino', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Punjabi',
    'Burmese', 'Khmer', 'Lao', 'Sinhala', 'Urdu',
    'Arabic', 'French', 'German', 'Spanish', 'Portuguese',
    'Russian', 'Dutch', 'Italian', 'Polish', 'Turkish',
    'Hebrew', 'Swedish', 'Norwegian', 'Danish', 'Finnish'
  ];

  const CEFR_LEVELS = [
    { value: 'A1', label: 'A1 — Beginner (0–2.6)' },
    { value: 'A2', label: 'A2 — Elementary (2.7–4.4)' },
    { value: 'B1', label: 'B1 — Intermediate (4.5–6.9)' },
    { value: 'B2', label: 'B2 — Upper-Intermediate (7.0–8.6)' },
    { value: 'C1', label: 'C1 — Advanced (8.7–9.0)' },
    { value: 'C2', label: 'C2 — Proficient (9.1–10.0)' },
    { value: 'Native', label: 'Native Speaker' }
  ];

  const NATIONALITY_TYPES = [
    { value: 'local_only', label: 'Local Citizens Only', description: 'Cheaper baseline · no visa sponsorship' },
    { value: 'local_bilingual', label: 'Local Bilingual (Foreign Lang)', description: 'e.g. Thai speaking Japanese · mid-cost' },
    { value: 'native_foreign', label: 'Native Foreign Speaker', description: 'Requires EP/WP · premium salary' },
    { value: 'both_acceptable', label: 'Both Local & Foreign OK', description: 'Mixed sourcing · range salary' },
    { value: 'pan_apac', label: 'Pan-APAC / Regional Hub', description: 'Any APAC nationality acceptable' },
    { value: 'any_open', label: 'Any Nationality / Open', description: 'Global sourcing · no restrictions' }
  ];

  const APAC_NATIONALITIES = [
    'Malaysian', 'Thai', 'Filipino', 'Singaporean', 'Indonesian', 'Vietnamese',
    'Japanese', 'Korean (South)', 'Chinese (Mainland)', 'Hong Kong Chinese',
    'Taiwanese', 'Indian', 'Sri Lankan', 'Bangladeshi', 'Pakistani', 'Nepali',
    'Burmese (Myanmar)', 'Cambodian', 'Laotian', 'Bruneian', 'Mongolian',
    'Australian', 'New Zealander',
    // Common non-APAC nationalities hired into APAC BPO
    'British', 'American', 'Canadian', 'Irish', 'South African',
    'French', 'German', 'Italian', 'Spanish', 'Dutch', 'Portuguese',
    'Brazilian', 'Mexican', 'Russian', 'Turkish', 'Arabic-speaking',
    'Nigerian', 'Kenyan', 'Egyptian'
  ];

  const handleCountryChange = (newCountry) => {
    setCountry(newCountry);
    setCity('');
  };

  const updateLanguage = (index, field, value) => {
    const updated = [...languages];
    updated[index][field] = value;
    setLanguages(updated);
  };

  const addLanguage = () => {
    if (languages.length < 3) {
      setLanguages([...languages, { language: '', cefr: '' }]);
    }
  };

  const removeLanguage = (index) => {
    if (languages.length > 1) {
      setLanguages(languages.filter((_, i) => i !== index));
    } else {
      setLanguages([{ language: '', cefr: '' }]);
    }
  };

  const toggleNationality = (nat) => {
    if (specificNationalities.includes(nat)) {
      setSpecificNationalities(specificNationalities.filter(n => n !== nat));
    } else {
      setSpecificNationalities([...specificNationalities, nat]);
    }
  };

  const analyzeJD = async () => {
    if (!apiKey) {
      setError('Please add your Anthropic API key via Settings (gear icon, top right).');
      setShowSettings(true);
      return;
    }
    if (!jobDescription.trim()) {
      setError('Please enter or upload a job description');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setActiveTab('overview');

    // Build context block from dropdowns
    const validLanguages = languages.filter(l => l.language && l.cefr);
    const nationalityLabel = NATIONALITY_TYPES.find(n => n.value === nationalityType)?.label || 'Not specified';
    const contextBlock = `
OPERATIONAL CONTEXT (from user input):
- Country: ${country || 'Not specified'}
- City: ${city || 'Not specified'}
- Nationality Preference: ${nationalityLabel}
${specificNationalities.length > 0 ? `- Specific Nationalities Targeted: ${specificNationalities.join(', ')}` : ''}
- Required Languages & CEFR Requirements:
${validLanguages.length > 0 ? validLanguages.map((l, i) => `  ${i + 1}. ${l.language} — Minimum CEFR: ${l.cefr}`).join('\n') : '  Not specified - infer from JD'}
- Bid Feasibility Inputs: ${targetSeats && timeframeDays ? `Target ${targetSeats} seats in ${timeframeDays} days` : 'Not provided (skip bid_feasibility output, set to applicable:false)'}

CRITICAL: The nationality preference DRAMATICALLY affects salary:
- "Local Citizens Only" = baseline cost, no visa overhead
- "Local Bilingual (Foreign Lang)" = mid-cost (e.g. Thai national speaking Japanese in Bangkok — typically 50-65% of native foreign speaker cost)
- "Native Foreign Speaker" = premium (e.g. Japanese national in Bangkok — adds EP/WP cost, relocation, housing allowance, premium for language scarcity)
- "Both Acceptable" = provide range that spans both
- "Pan-APAC" or "Any" = use mid-market range

═══ OVERRIDE RULES ═══
The Operational Context above is ABSOLUTELY AUTHORITATIVE and OVERRIDES any conflicting information found in the JD. This is non-negotiable:

1. LOCATION OVERRIDE: User-specified Country/City overrides any city/country mentioned in the JD. Use the user's location for salary currency, BPO competitor mapping, and sourcing geography. Example: if JD says "Bogota" but user specifies "Kuala Lumpur", treat as a KL role (MYR currency, MY competitors, KL job-board URLs).
2. LANGUAGE OVERRIDE: User-specified languages with CEFR levels override any conflicting CEFR mentioned in the JD.
3. NATIONALITY OVERRIDE: User-specified nationality preference is the primary driver of salary calibration.
4. ONLY fall back to the JD when the user did NOT specify a given field.
`;

    const prompt = `You are an expert in language proficiency assessment calibration AND talent sourcing for TP APAC recruitment across multiple countries and cities, using Hallo.ai's assessment methodology.

Analyze this job description and recommend:
1. Hallo.ai benchmark thresholds (respecting the explicit CEFR requirements provided)
2. Competitor salary ranges (in the local currency of the specified country)
3. Target companies the candidate should have prior work experience at

${contextBlock}

JOB DESCRIPTION:
${jobDescription}

Hallo.ai FULL assessment battery (per official methodology):

LANGUAGE DIMENSIONS (1-10 scale, CEFR-mapped):
- Fluency: smoothness of speech
- Grammar: structure accuracy
- Vocabulary: range and richness
- Pronunciation: clarity, intonation, rhythm
- Coherence: logical organization of ideas

SOFT SKILLS (1-10 scale, scored as Poor / Okay / Good / Excellent):
8 sub-dimensions assessed via behavioral interview:
- Culture Fit — alignment with company values
- Empathy — emotional understanding and connection
- Conflict Resolution — addressing disagreements constructively
- Handling Difficult Customers — de-escalation capability
- Communication — clarity and adaptation across audiences
- Decision Making — quick judgment with limited information
- Leadership — driving change, influencing others
- Emotional Intelligence — managing own and others' emotions

COGNITIVE ABILITY (1-10 scale):
- Numerical Reasoning — sequences, algebra, ratios, relationships
- Abstract Reasoning — logic, pattern recognition, inference

PERSONALITY / RESILIENCE (0-100 scale):
- 12-statement Likert assessment covering: stress management, problem orientation, locus of control, emotional regulation, criticism handling, anxiety levels, conflict avoidance, intuition, confidence
- Thresholds typically: 45+ (Good), 50+ (Strong), 55+ (Excellent)

SALES COMPETENCY (0-100 scale, ONLY for sales/upsell roles):
- Competencies: Customer Expectation Management, Proactive Selling, Customer Service Orientation, Pragmatic Decision Making, Results Orientation
- Sales Cycle: Establishing Contact, Assessing Requirements, Handling Objections, Negotiation & Closure, Building Relationship

COMPUTER LITERACY (1-10 scale): OS basics, file management, browser usage, password security, phishing awareness, troubleshooting

CEFR mapping:
- A1: 0-2.6 | A2: 2.7-4.4 | B1: 4.5-6.9 | B2: 7.0-8.6 | C1: 8.7-9.0 | C2: 9.1-10.0

LOB Tier framework:
- Entry Level (B2/7.0): Basic CS, high volume, simple inquiries
- Standard (B2/7.0): Most BPO roles, customer service, sales
- Premium (B2+/7.5): Fintech, complex support, financial services
- Luxury/C1 (C1/8.7): Hospitality, premium CX, executive support

CRITICAL FLOOR/CEILING RULE: Candidates must meet ALL dimension thresholds. Single failure = lower tier assignment.

TARGET COMPANY GUIDANCE:
- Tier 1 Direct: Companies where candidates would do EXACTLY this work (same industry, same role type, direct competitors). Be specific - name actual companies operating in APAC. E.g., for TikTok CS → Meta, Snap, YouTube, Reddit. For Airbnb premium → Booking, Marriott, Four Seasons, Mandarin Oriental.
- Tier 2 Adjacent: Companies with transferable skills/customer base. E.g., for fintech support → traditional banks, payment processors, crypto exchanges.
- BPO Providers: Direct BPO competitors in APAC who handle similar client accounts. Common ones: Concentrix, Foundever (Sitel), iQor, Genpact, Accenture, Webhelp, TDCX, Conduent, Alorica, Majorel, Transcom, IBEX. Name specific ones likely to have this exact account or similar.
- Cross-Industry: Companies outside the direct industry but with similar skill profiles. E.g., e-commerce platforms (Shopee, Lazada, Amazon) for any CS role.
- Avoid Signals: Background types to deprioritize (e.g., "agents from pure outbound telesales" if role requires technical support).

Be SPECIFIC with company names. Prioritize companies with operations in the specified country/city.

COMPETITOR SALARY BENCHMARK GUIDANCE:
- Provide Min / Mid / Max range purely based on EXTERNAL ADVERTISED salaries from competitor postings (JobStreet, LinkedIn, Glassdoor, JobsDB, Indeed, JobsCentral, Seek, JD.com Jobs)
- Break down into Basic Salary + Fixed Allowance (standard BPO structure across APAC)
- Use the local currency for the specified country (MYR/THB/PHP/SGD/IDR/VND/JPY/KRW/CNY/HKD/TWD/INR/AUD/NZD)
- These are competitor benchmarks, NOT TP internal pricing

NATIONALITY-DRIVEN COST DIFFERENTIAL + VISA REGULATORY FLOOR (apply when calculating salary ranges):
The same language requirement commands DIFFERENT salaries based on nationality:

═══ VISA REGULATORY MINIMUMS (NON-NEGOTIABLE FOR FOREIGN HIRES) ═══
When the role requires hiring a foreign national (not a local citizen), the offered salary MUST clear the host country's visa salary threshold. If competitor advertised rates fall below the threshold, those rates are NOT actionable for foreign hires — flag this prominently in the notes field.

MALAYSIA — Employment Pass (effective 1 June 2026, per MOHA):
- EP Category I (executive/senior): MIN RM 20,000/month basic salary (was RM 10,000)
- EP Category II (managerial/specialist — typical BPO bilingual roles): MIN RM 10,000-19,999/month basic
- EP Category III (junior/operational): MIN RM 5,000-9,999/month basic (RM 7,000-9,999 for manufacturing services)
- ⚠️ CRITICAL: Thresholds are calculated on BASIC SALARY ONLY. Allowances, bonuses, housing, commissions DO NOT count.
- Maximum tenure caps: EP I & II = 10 years; EP III = 5 years (previously no limit)
- Category II & III require a succession plan showing role transition to a local hire

THAILAND — Work Permit / BOI minimum salaries (BOI Por. 8/2568, effective Oct 2025 for new BOI certs / Jan 2026 for legacy):
- Executive: MIN THB 150,000/month
- Management: MIN THB 75,000/month (THB 50,000 if bachelor's degree)
- Engineer/Specialist: MIN THB 75,000/month (THB 50,000 with degree+experience)
- Operations/IT/Supervisor: MIN THB 50,000/month
- BPO/TISO/IBPO: MIN THB 35,000/month
- Standard Work Permit (non-BOI) by nationality: typically THB 25,000-50,000/month
- Required ratio: 4 Thai employees per 1 foreign worker (non-BOI manufacturing)

SINGAPORE — Employment Pass / S-Pass / Work Permit (2026 MOM, with 2027 increases announced):
- Employment Pass (EP) — non-financial: MIN SGD 5,600/month (rises to SGD 6,000 from 1 Jan 2027)
- EP — financial services: MIN SGD 6,200/month (rises to SGD 6,600 from 1 Jan 2027)
- EP age-progressive scaling: ~SGD 10,700-11,800/month required for applicants mid-40s+
- EP also requires COMPASS 40-point threshold beyond salary alone
- S-Pass (mid-skill): MIN SGD 3,300/month (SGD 3,800 financial), rising to SGD 3,600 / SGD 4,000 from 1 Jan 2027
- Work Permit (semi-skilled): NO fixed salary floor but quota + levy applies (35% quota in services sector)
- ⚠️ For BPO bilingual roles in SG, typically requires EP minimum (SGD 5,600+); roles below this floor are NOT viable for foreign hires

INDONESIA — KITAS (Working Permit/Limited Stay Visa):
- Typical minimum salary for foreign workers: USD 1,200-2,000/month equivalent (~IDR 18-30M)
- DKPTKA (foreign worker compensation fund) USD 100/month per foreign employee
- Role must be on approved-positions list (RPTKA) — most BPO frontline roles are NOT approved for foreigners

PHILIPPINES — Alien Employment Permit (AEP) + 9(g) Visa:
- No statutory minimum salary, but DOLE requires "comparable to local equivalent"
- For BPO native-foreign roles, market rate typically USD 1,500-3,000/month equivalent
- AEP fee + 9(g) visa processing required

VIETNAM — Work Permit:
- No statutory minimum salary, but role must require expertise unavailable locally
- Most BPO operational roles do NOT qualify (Vietnam protects local employment)
- Bilingual/specialist roles typically VND 30-80M/month for foreign hires

═══ COST DIFFERENTIAL EXAMPLES ═══
Example A - Japanese language role in Bangkok, Thailand (BOI BPO category):
  - Thai national speaking Japanese (B2-C1): Basic 35,000-55,000 THB + Allow 3,000-7,000 THB
  - Japanese national in Bangkok (Native, BOI BPO min THB 35,000): Basic 60,000-100,000 THB + Allow 8,000-20,000 THB (housing/relocation incl.)
  - Cost ratio: Native foreign is ~1.8-2.2x local bilingual; must clear BOI minimum if BOI-promoted entity

Example B - Mandarin role in Penang, Malaysia (post-June 2026):
  - Local Malaysian Chinese (Native Mandarin): Basic 3,500-5,500 MYR + Allow 400-1,000 MYR (no EP needed)
  - Mainland Chinese expat (Native, EP III/II): Basic MIN 5,000 MYR (EP III) or MIN 10,000 MYR (EP II) — NO allowances count
  - ⚠️ Previous market rate of 7-12K MYR may NOT meet EP II threshold if structured as RM 6K basic + RM 6K allowance

Example C - Korean role in KL, Malaysia (post-June 2026):
  - Malaysian who learned Korean (B2+): Basic 4,500-7,000 MYR + Allow 500-1,200 MYR
  - Korean national in Malaysia (Native, EP II): MIN 10,000 MYR basic salary required (was RM 5,000)
  - Cost impact: EP II floor essentially doubles vs. previous regime

Example D - Bilingual roles in Singapore:
  - Local Singaporean bilingual: Basic SGD 3,000-5,000 + Allow SGD 200-800
  - Foreign EP holder: MIN SGD 5,600 + must pass COMPASS 40-point assessment
  - Foreign S-Pass holder: MIN SGD 3,300 (rising to SGD 3,600 in 2027) + employer pays levy + quota check

Reference typical BPO monthly compensation ranges (BASELINE - LOCAL CITIZENS):
  Malaysia (MYR):
    - Entry English CS: Basic 2,500-3,500 + Allow 200-600 (local-only, no EP)
    - Mandarin/Cantonese Native (Penang locals): Basic 3,500-6,500 + Allow 400-1,200
    - Premium/Fintech: Basic 4,500-7,500 + Allow 500-1,500
    - Foreign nationals: see EP I/II/III minimums above — must be BASIC salary, no allowances
  Thailand (THB):
    - Entry Thai CS: Basic 18,000-32,000 + Allow 1,000-4,000
    - Thai bilingual (JP/KR): Basic 30,000-55,000 + Allow 3,000-7,000
    - Foreign nationals (JP/KR native, BOI BPO): MIN 35,000 + market premium 50,000-100,000 + allowances
  Philippines (PHP):
    - Entry English CS: Basic 18,000-28,000 + Allow 2,000-5,000
    - Filipino bilingual (JP/KR/Mandarin): Basic 45,000-90,000 + Allow 5,000-15,000
    - Foreign nationals: USD 1,500-3,000 equivalent (PHP 85K-170K)
  Singapore (SGD): Local: Basic 2,200-5,500 + Allow 200-800 | Foreign EP holders: MIN 5,600 (non-fin) / 6,200 (fin) | S-Pass: MIN 3,300
  Indonesia (IDR millions): Local: Basic 4-15M + Allow 0.5-2.5M | Foreign nationals (if approved): 20-40M
  India (INR): Local: Basic 18,000-65,000 + Allow 2,000-8,000 | Foreign nationals: 80,000-200,000
  China (CNY): Local: Basic 5,000-15,000 + Allow 500-2,500 | Foreign nationals: 20,000-50,000

- Adjust based on: nationality type (per above), role complexity, language rarity, experience years, and tier
- ALWAYS factor visa/EP/WP costs and regulatory minimum when nationality is "Native Foreign Speaker"
- For Malaysia roles, add visa_regulatory_note field flagging if competitor rates may fall below new June 2026 EP thresholds
- For Thailand BOI-promoted roles, add visa_regulatory_note field on BOI minimum salary tier alignment
- For Singapore roles, add visa_regulatory_note field on EP/S-Pass tier and COMPASS implications

Respond ONLY with valid JSON (no markdown, no preamble) in this exact format:
{
  "role_summary": "1-line role description",
  "lob_tier": "Entry Level" or "Standard" or "Premium" or "Luxury/C1",
  "primary_language": "the target language for the assessment",
  "language_role_type": "Native speaker role" or "Bilingual role" or "English-primary role",
  "cefr_minimum": "B2 (7.0)" format,
  "experience_required": {
    "years": "e.g., 0-1 years, 2-3 years, 5+ years",
    "level": "Entry" or "Mid" or "Senior" or "Lead/Manager"
  },
  "thresholds": {
    "fluency": number 0-10,
    "grammar": number 0-10,
    "vocabulary": number 0-10,
    "pronunciation": number 0-10,
    "coherence": number 0-10,
    "cognitive": number 0-10
  },
  "behavioral_thresholds": {
    "soft_skills_overall_min": number 0-10,
    "soft_skills_priority_subs": [
      {"name": "one of: Culture Fit / Empathy / Conflict Resolution / Handling Difficult Customers / Communication / Decision Making / Leadership / Emotional Intelligence", "min": number 0-10, "rationale": "1-sentence why this matters for this role"}
    ],
    "soft_skills_reasoning": "1-2 sentence why these sub-dimensions matter most for this specific role",
    "cognitive_numerical_min": number 0-10,
    "cognitive_abstract_min": number 0-10,
    "resilience_min": number 0-100,
    "resilience_rationale": "1-sentence on personality/stress tolerance requirement for this role",
    "sales_competency_min": number 0-100 or null (null if not a sales role),
    "sales_priority_stages": ["array of 2-3 stage names if sales role, else empty array - choose from: Establishing Contact, Assessing Requirements, Handling Objections, Negotiation & Closure, Building Relationship"],
    "computer_literacy_min": number 0-10
  },
  "secondary_language": {
    "required": true or false,
    "language": "language name or null",
    "cefr_minimum": "level or null"
  },
  "salary_benchmark": {
    "currency": "Use the appropriate APAC currency code (MYR/THB/PHP/SGD/IDR/VND/JPY/KRW/CNY/HKD/TWD/INR/AUD/NZD)",
    "location": "City, Country",
    "nationality_basis": "Reflects nationality preference applied (e.g. 'Local Citizens', 'Thai national speaking Japanese', 'Japanese national expat')",
    "visa_required": true or false,
    "visa_type": "Visa/permit name if applicable (e.g. 'Malaysia EP II', 'Thailand BOI BPO Work Permit', 'Singapore EP', 'Singapore S-Pass', 'Philippines AEP+9(g)', 'Indonesia KITAS') or null if no visa needed",
    "visa_minimum": "Regulatory minimum salary required for this visa as a number in the local currency, or null if no visa",
    "visa_regulatory_note": "If visa_required is true: 1-3 sentences flagging whether competitor advertised rates meet the regulatory minimum. Highlight if market rates fall below the new threshold (e.g. Malaysia EP II June 2026 floor of RM10K basic). Note that allowances DO NOT count toward MY EP minimums. If visa_required is false, set this to null.",
    "min": {
      "basic": number,
      "allowance": number,
      "total": number
    },
    "mid": {
      "basic": number,
      "allowance": number,
      "total": number
    },
    "max": {
      "basic": number,
      "allowance": number,
      "total": number
    },
    "data_sources": ["Source 1 e.g. JobStreet listings", "Source 2 e.g. LinkedIn similar roles"],
    "notes": "1-2 sentence context - regulatory considerations, nationality premium, visa requirements, market signals"
  },
  "target_companies": {
    "tier_1_direct": ["5-8 specific company names - direct competitors / ideal background"],
    "tier_2_adjacent": ["5-8 specific company names - adjacent industries with transferable skills"],
    "bpo_providers": ["4-6 specific BPO competitors in APAC likely to handle this account or similar"],
    "cross_industry": ["3-5 specific cross-industry companies with similar skill profiles"]
  },
  "company_reasoning": "2-3 sentences explaining why these companies are strong sources",
  "avoid_signals": ["2-3 background types to deprioritize"],
  "reasoning": "2-3 sentence explanation of tier classification",
  "key_indicators": ["3-5 phrases from JD that drove the classification"],
  "risk_factors": ["1-3 hiring risks or considerations"],
  "talent_map": {
    "funnel_native_foreign": {
      "applicable": true or false (true ONLY if role requires native foreign nationals based on nationality_preference; false otherwise),
      "title": "e.g. 'Native Japanese in Bangkok, Thailand' or null",
      "confidence": "High" or "Medium" or "Low" (overall funnel confidence based on data availability — see HONESTY rules above),
      "confidence_note": "1 sentence explaining what makes this confidence level (e.g. 'Top row has solid government data backing, but bottom 3 rows are BPO industry conventions')",
      "rows": [
        {
          "label": "Row label (e.g. 'Native Japanese nationals in Thailand')",
          "value": number (the count at this funnel stage),
          "confidence": "Verified" or "Estimated" or "Assumption" (per HONESTY rules above),
          "source": "Specific publication name if confidence is Verified; generic category if Estimated; rule-of-thumb description if Assumption. Do NOT invent specific report names.",
          "assumption_note": "1-line assumption used to get from previous row to this row, or null for first row"
        }
      ],
      "final_addressable_pool": number (the addressable pool count, conservative),
      "final_active_pool": number (active jobseekers — typically 15% of addressable),
      "summary_note": "1-2 sentence summary of what this funnel tells Sales/BD"
    },
    "funnel_local_bilingual": {
      "applicable": true or false (true ONLY if role can be filled by local citizens with foreign-language skills; false otherwise),
      "title": "e.g. 'Thai national speaking Japanese, Bangkok' or null",
      "confidence": "High" or "Medium" or "Low",
      "confidence_note": "1 sentence explaining the confidence rating",
      "rows": [
        {
          "label": "Row label",
          "value": number,
          "confidence": "Verified" or "Estimated" or "Assumption",
          "source": "Specific publication if Verified; generic category if Estimated; rule-of-thumb if Assumption",
          "assumption_note": "1-line assumption or null for first row"
        }
      ],
      "final_addressable_pool": number,
      "final_active_pool": number,
      "summary_note": "1-2 sentence summary"
    },
    "bid_feasibility": {
      "applicable": true or false (true ONLY if user provided target_seats and timeframe_days; false otherwise. Set entire object to null if user did NOT provide bid inputs),
      "target_seats": number (user-provided),
      "timeframe_days": number (user-provided),
      "seats_per_month_needed": number (calculated),
      "conversion_rate_used": 0.05 (always — TP operational baseline applied uniformly across all APAC markets),
      "required_lead_volume": number (target_seats / conversion_rate_used — total sourcing volume needed),
      "leads_per_month_needed": number (required_lead_volume / months in timeframe),
      "pool_extraction_pct": number (required_lead_volume / addressable_pool, as a percentage — how much of the pool you need to extract),
      "verdict": "Feasible" or "Stretch" or "Not Feasible",
      "rationale": "2-3 sentence explanation showing the math: target seats × 1/conversion = required leads, vs addressable pool = extraction %, with timeframe pacing",
      "recommended_action": "1-2 sentence concrete action (e.g. 'Accept bid at 50 seats but request 120-day timeframe' or 'Decline — pool depth insufficient' or 'Accept with native-foreign + local-bilingual hybrid sourcing strategy')"
    },
    "supply_signals": [
      {
        "signal": "e.g. 'Concentrix Bangkok has ~280 Japanese-speaking agents per Glassdoor'",
        "source_type": "Competitor BPO headcount / University output / Government stats / Job board volume / Language school graduates",
        "implication": "1-line what this means for sourcing"
      }
    ],
    "competitor_demand": [
      {
        "company": "specific competitor name (Concentrix, TDCX, Foundever, TaskUs, etc.)",
        "open_roles_estimate": "Run search to verify",
        "implication": "e.g. 'Recent layoff cycle — strong poaching window' or 'Active hiring — high competition for talent'"
      }
    ],
    "search_urls": [
      {
        "platform": "Google X-ray (LinkedIn)",
        "label": "Search exact role on public LinkedIn pages",
        "url": "https://www.google.com/search?q=site%3Alinkedin.com%2Fin+%22{role_keyword}%22+%22{language}%22+%22{city}%22",
        "note": "Click to view public LinkedIn profiles via Google index"
      },
      {
        "platform": "JobStreet",
        "label": "Active job seekers in this market",
        "url": "Country-specific URL e.g. https://www.jobstreet.com.my/{role}-jobs/in-{city}",
        "note": "Shows competitor openings = current demand"
      },
      {
        "platform": "LinkedIn Jobs (public)",
        "label": "Competitor postings",
        "url": "https://www.linkedin.com/jobs/search/?keywords={role}+{language}&location={city}",
        "note": "Public job postings, no auth required to view"
      },
      {
        "platform": "Indeed",
        "label": "Aggregated job demand",
        "url": "https://{country}.indeed.com/jobs?q={role}+{language}&l={city}",
        "note": "Cross-source job aggregation"
      },
      {
        "platform": "Glassdoor Company",
        "label": "Competitor employee count + reviews",
        "url": "https://www.glassdoor.com/Reviews/{company}-{city}-reviews-SRCH.htm",
        "note": "Estimate competitor headcount"
      }
    ],
    "boolean_strings": [
      {
        "label": "For LinkedIn Recruiter / Talent Insights",
        "string": "actual boolean string with AND/OR/NOT operators tailored to this role"
      },
      {
        "label": "For Google X-ray",
        "string": "site:linkedin.com/in (\"keyword1\" OR \"keyword2\") AND \"language\" AND \"city\""
      }
    ],
    "sourcing_recommendations": ["3-4 tactical recommendations on where to focus sourcing efforts based on the funnel data"]
  },
  "screening_questions": {
    "phone_screening": [
      {
        "question": "specific recruiter phone-screen question",
        "purpose": "1-line what this question reveals",
        "rubric": {
          "good": "1 sentence describing an ideal answer",
          "ok": "1 sentence describing an acceptable answer",
          "bad": "1 sentence describing a red-flag answer"
        }
      }
    ],
    "operational_interview": [
      {
        "question": "specific scenario/mock question for ops interview",
        "purpose": "1-line what this question reveals",
        "type": "Behavioral" or "Situational" or "Role-Play" or "Technical",
        "rubric": {
          "good": "1 sentence describing an ideal answer",
          "ok": "1 sentence describing an acceptable answer",
          "bad": "1 sentence describing a red-flag answer"
        }
      }
    ]
  },
  "confidence": "High" or "Medium" or "Low"
}

CRITICAL FOR SCREENING_QUESTIONS:
- Generate 4-5 phone_screening questions a TA recruiter would ask in a 15-min phone call (motivation, availability, basic fit, language confidence check)
- Generate 5-6 operational_interview questions an Ops Manager or client would ask in a 45-min interview (deeper behavioral, role-specific scenarios, customer simulations)
- Tailor questions to the SPECIFIC role tier, language, and industry (e.g., fintech support gets transaction-dispute scenarios; luxury hospitality gets VIP complaint scenarios)
- Mix question types: Behavioral (STAR-format past examples), Situational (hypothetical "what would you do"), Role-Play (mock customer interaction), Technical (tools/process knowledge)
- For each question, provide a rubric with 3 ranked answer levels (Good/Ok/Bad) — be SPECIFIC about what makes an answer good vs. ok vs. bad for THIS role
- Use the soft-skill priority sub-dimensions identified earlier to drive question selection (e.g., if Empathy is priority, include empathy-probing scenarios)

CRITICAL FOR TALENT_MAP — DEFENSIBLE FUNNEL METHODOLOGY:

The Talent Map MUST produce a public-source funnel that Sales/BD can defend to clients. DO NOT fabricate totals. Build the addressable pool number through a chain of cited public statistics, each row challengeable.

═══ FUNNEL CONSTRUCTION RULES ═══

Anchor TAM on PUBLISHED CONSENSUS — the most granular government / official statistic available for that city, NOT LinkedIn. LinkedIn-discoverable counts are unreliable for native-expat pools: loose filters return N2/N3 nationals, senior MNC expats not in-market, and students. Defensible TAM comes from MOFA / DOSM / Home Ministry / census equivalents.

For each role, build TWO funnels where applicable based on nationality_preference.

═══ CRITICAL HONESTY REQUIREMENT — PER-ROW CONFIDENCE TIER ═══

Each funnel row MUST be tagged with one of three confidence tiers based on the actual nature of your underlying knowledge:

**"Verified"** — Use ONLY when you can name a SPECIFIC publication/report/dataset that has published this number AND you have reasonable confidence the number you're stating is close to what that source actually says (within ±20%). Examples that QUALIFY:
- "Japanese nationals in KL: 8,823" — MOFA 海外在留邦人数調査統計 publishes city-level counts (released January each year)
- "Native Japanese nationals in Thailand: 80,000" — MOFA Annual Report on Statistics on Japanese Nationals Overseas
- "Chinese in Klang Valley: 2,493,342" — DOSM 2020 Census ethnicity breakdown by state
- "Concentrix Penang headcount: ~3,500" — Glassdoor publishes employer-stated headcount on company pages

**"Estimated"** — Use when you're applying a reasonable demographic, geographic, or economic norm derived from a real published statistic. Examples:
- "Working-age (18-60) = 65% of expat population" — UN demographics show this general pattern
- "Locally mobile = 25-30% of working-age" — derived from Home Ministry work-pass counts vs total residents (most working-age expats are anchored at MNC employers)

**"Assumption"** — Use when the rate is an industry rule of thumb, BPO-sector convention, or your own reasoning with no published source backing the specific number. Examples:
- "BPO/CS-receptive rate = 30-35%" — BPO industry convention
- "Active jobseeker rate = 20%" — Standard active-vs-passive rule
- "% of bilingual BPO workforce at top 3 competitors = 30%" — your own market-share estimate

═══ ANTI-FABRICATION RULES (NON-NEGOTIABLE) ═══

1. DO NOT attach a specific report/citation to a row marked "Estimated" or "Assumption". If the number is an estimate or assumption, leave the source field as either null or a category description like "General demographic norm" or "BPO industry convention — not from a specific publication". DO NOT invent reports like "JETRO Survey on Japanese Workers in Thailand 2024" if that survey doesn't exist or doesn't publish that number.

2. If you cannot recall a SPECIFIC publishing organization that has the kind of data needed for a "Verified" row, downgrade that row to "Estimated" or "Assumption" with a generic source description.

3. NEVER invent statistic numbers with false specificity. "MOFA 海外在留邦人数調査統計" is OK because MOFA does publish that statistic by city. "JETRO Survey on Japanese Workers in Thailand 2024 showing 2% openness to BPO" is NOT OK because that specific survey/figure does not exist.

4. NEVER cite "LinkedIn Workforce Insights" as a source of active-rate statistics — that is a LinkedIn product feature, not a published study.

5. LinkedIn search counts are NEVER the TAM anchor for native-expat funnels. LinkedIn filters are loose: language tags catch N2/N3 holders, "Japanese in KL" returns senior MNC expats not in market, JP companies cluster on Wantedly / Bizreach not LinkedIn. If asked why LinkedIn shows more candidates than the addressable pool, the standard answer is: "LinkedIn-discoverable ≠ addressable. LinkedIn count includes (1) non-native nationals with language tags, (2) anchored MNC expats not switching, (3) profiles not active in market. Published-consensus anchoring filters these out and produces the defensible pool."

6. The first row (top of funnel) SHOULD be "Verified" — use published city-level statistics. If MOFA / equivalent publishes city-level directly (e.g. Japanese KL, Japanese BKK), use that and SKIP the metro-concentration row entirely. Do NOT force a "× 60% Bangkok concentration" step when MOFA already publishes the city figure.

7. Subsequent rows are usually "Estimated" or "Assumption" — be honest about this.

═══ OVERALL FUNNEL CONFIDENCE ═══

Set funnel.confidence to one of:
- "High" — At least the first 2-3 rows are "Verified", remaining rows are "Estimated" (not "Assumption"). Sales/BD can cite this confidently.
- "Medium" — Top row is "Verified", but several mid/bottom rows are "Estimated" or "Assumption". Use as directional, not definitive.
- "Low" — Top row is "Estimated" (no specific data recall) OR most rows are "Assumption". Treat output as a starting framework only — Sales/BD must run live searches before quoting.

═══ FUNNEL STAGE DECOMPOSITION ═══

1. NATIVE-FOREIGN FUNNEL (role requires native foreign nationals).

   Anchor: published city-level statistic, NOT national pop × concentration guess.

   Stage decomposition (5 rows, multipliers compound):
     Row 1 — Pool (TAM): Published city-level anchor. Verified.
     Row 2 — Working-age subset (× ~65–70%): excludes dependents under 18, MM2H retirees, students.
     Row 3 — Locally mobile (× ~25–30%): excludes anchored MNC expats (Sony, Samsung, trading houses, embassies), already-employed work-pass holders unlikely to switch, dependents. Source: Home Ministry expat work-pass counts vs total residents.
     Row 4 — BPO/CS-receptive (× ~30–35%): excludes those drawn to F&B, trading, education, freelance, repatriation. Industry convention — flag as Assumption.
     Row 5 — Active now (× ~20%): active jobseekers in any given month. Industry convention — flag as Assumption.

   Compound pull-through TAM → addressable typically ~5–7% (NOT 2%).
   Compound pull-through TAM → active typically ~1–1.5%.

2. LOCAL-BILINGUAL FUNNEL (role can be filled by local citizens with foreign-language skills, e.g., Thai national speaking Japanese, Malaysian Chinese speaking Mandarin).

   Anchor: census ethnicity data (heritage languages) or higher-education graduation cohorts (studied languages). Apply a language-fluency filter explicitly — heritage Mandarin in MY Chinese ≠ Standard Mandarin for client LOBs; Japanese minor at Thai uni ≠ JLPT N2+.

   Stage decomposition (5 rows):
     Row 1 — Pool (heritage population OR graduate cohort)
     Row 2 — Working-age × language fluency at BPO-grade. For heritage: working-age × fluency rate (e.g. KL Chinese × 93% Mandarin formally schooled). For studied: cumulative 10-year cohort × N2+ pass rate.
     Row 3 — Locally mobile in BPO comp band: excludes those anchored at higher-paying tech/finance/MNC roles unwilling to downshift to BPO comp.
     Row 4 — BPO/CS-receptive (× ~30%)
     Row 5 — Active now (× ~5–10%, LOWER than expat funnel because most are already employed in non-BPO roles)

   Compound pull-through TAM → addressable typically ~5–7% for heritage, ~10–15% for studied (smaller, more focused cohort).

═══ EXAMPLES (CORRECTED FROM EARLIER VERSION — DO NOT REVERT TO 624/94 NUMBERS) ═══

CORRECT Native-Foreign funnel for Native Japanese in Kuala Lumpur (KL is the canonical test case):
  Row 1: label "Japanese nationals in KL" — value 8823 — confidence "Verified" — source "MOFA 海外在留邦人数調査統計, KL city, Oct 2024 (released Jan 2025)" — assumption_note null
  Row 2: label "Working-age (18-60)" — value 5735 — confidence "Estimated" — source "MOFA age-band share for overseas residents" — assumption_note "× 65% working-age"
  Row 3: label "Locally mobile" — value 1435 — confidence "Estimated" — source "MY Home Ministry: 8,739 JP work-pass holders Oct 2024 — most anchored at JP MNCs" — assumption_note "× 25% mobile after excluding anchored MNC expats, MM2H retirees, dependents"
  Row 4: label "BPO/CS-receptive" — value 500 — confidence "Assumption" — source "BPO industry convention — not from a specific survey" — assumption_note "× 35% receptive vs F&B / trading / education"
  Row 5: label "Active now" — value 100 — confidence "Assumption" — source "Standard active-vs-passive industry rule" — assumption_note "× 20% active in given month"
  final_addressable_pool: 500
  final_active_pool: 100
  confidence: "Medium" — top row Verified from MOFA, middle row decomposed defensibly from published expat-worker counts, bottom two rows are industry conventions
  summary_note: "KL Japanese pool is structurally thin — ~500 addressable. Most resident working-age Japanese are anchored at JP MNCs (Sony/Panasonic/trading houses) and not movable. Offshore attraction from Japan is the structural growth lever, not local LinkedIn sourcing. LinkedIn returns more results because filters catch Malaysian N2/N3 holders and senior MNC expats not in-market."

CORRECT Native-Foreign funnel for Native Japanese in Bangkok, Thailand:
  Row 1: label "Japanese nationals in Bangkok" — value 55000 — confidence "Verified" — source "MOFA 海外在留邦人数調査統計, Bangkok, Oct 2024 (~82K nationwide, ~67% BKK)" — assumption_note null
  Row 2: label "Working-age (18-60)" — value 35750 — confidence "Estimated" — source "MOFA age-band share" — assumption_note "× 65%"
  Row 3: label "Locally mobile" — value 8940 — confidence "Estimated" — source "Excludes anchored MNC expats (Toyota, Honda, MUFG, trading houses)" — assumption_note "× 25%"
  Row 4: label "BPO/CS-receptive" — value 3130 — confidence "Assumption" — source "BPO industry convention" — assumption_note "× 35%"
  Row 5: label "Active now" — value 625 — confidence "Assumption" — source "Industry rule" — assumption_note "× 20%"
  final_addressable_pool: 3130
  final_active_pool: 625
  confidence: "Medium"

CORRECT Local-Bilingual funnel for Heritage Mandarin in KL (Malaysian Chinese):
  Row 1: label "Chinese in Klang Valley (KL + Selangor)" — value 2493342 — confidence "Verified" — source "DOSM 2020 Census: KL 737,161 + Selangor 1,756,181" — assumption_note null
  Row 2: label "Working-age × Mandarin-fluent (formally schooled)" — value 1623000 — confidence "Estimated" — source "DOSM 70.1% working-age × ~93% KL Chinese families Mandarin-fluent" — assumption_note "× 65% combined"
  Row 3: label "Locally mobile in BPO comp band" — value 487000 — confidence "Estimated" — source "Excludes tech/finance/MNC roles at higher comp bands" — assumption_note "× 30%"
  Row 4: label "BPO/CS-receptive" — value 146000 — confidence "Assumption" — source "BPO industry convention" — assumption_note "× 30% (vs tech, finance, retail)"
  Row 5: label "Active now" — value 7300 — confidence "Assumption" — source "Industry rule" — assumption_note "× 5%"
  final_addressable_pool: 146000
  final_active_pool: 7300
  confidence: "Medium" — anchor is census, decomposition relies on industry conventions but matches BPO hiring observations
  summary_note: "Mandarin KL is NOT a scarcity problem — it is a competitive share problem against TikTok PG / ColPal / Brex / Aspire. Pool is abundant; bottleneck is winning share of new hires."

CORRECT Local-Bilingual funnel for Thai national speaking Japanese (BKK):
  Row 1: label "Annual JP-language graduates from major Thai universities" — value 1000 — confidence "Estimated" — source "Thammasat, Chulalongkorn, Kasetsart, Chiang Mai published Japanese Studies programs (5 major programs × ~200 avg cohort)" — assumption_note "5 major programs × ~200 avg cohort"
  Row 2: label "Cumulative working-age × N2+ verified" — value 1750 — confidence "Assumption" — source "10-year cumulative × 70% retention × 25% reach N2+" — assumption_note "Most studied-language grads test below N2"
  Row 3: label "Locally mobile in BPO comp band" — value 875 — confidence "Estimated" — source "Excludes Toyota / Honda / MUFG / trading-house Japanese roles paying 2-3× BPO" — assumption_note "× 50%"
  Row 4: label "BPO/CS-receptive" — value 265 — confidence "Assumption" — source "BPO industry convention" — assumption_note "× 30% (vs tourism, embassies, teaching, freelance translation)"
  Row 5: label "Active now" — value 27 — confidence "Assumption" — source "Industry rule" — assumption_note "× 10%"
  final_addressable_pool: 265
  final_active_pool: 27
  confidence: "Low" — top row Estimated (no centralised MOE Thailand breakdown by language), middle rows are assumptions about N2+ pass rate and BPO comp acceptance. Treat as framework, not data.
  summary_note: "Thai N2+ Japanese speakers are thinner than the raw graduate count suggests. The N2+ filter and the BPO comp-band filter each eat ~50%+. Hybrid strategy (native foreign + local bilingual) is usually necessary."

═══ PER-LANGUAGE ANCHORS TO USE ═══
- JP: MOFA 海外在留邦人数調査統計 (annual, January release)
- KR: 외교부 재외동포현황 (MOFA Korea, annual)
- PRC/CN nationals: MY Home Ministry expat counts + MM2H statistics
- HK: HK Government Census & Statistics Department (emigrants by destination)
- Heritage Chinese (MY): DOSM 2020 Census ethnicity by state
- Heritage Cantonese (MY): DOSM × ~30% Cantonese share of Malaysian Chinese (KL/Selangor concentration)
- Heritage Mandarin fluency (MY): ~93% of KL Chinese families formally Mandarin-schooled

═══ NUMBERS MUST BE INTERNALLY CONSISTENT ═══
- The final_addressable_pool = the row before the "active vs passive" split
- The final_active_pool = ~15% of final_addressable_pool (or use actual data if cited)
- Each row's value must equal previous_row_value × assumption_rate (math should add up)
- Be CONSERVATIVE in assumptions — Sales/BD would rather under-promise than over-promise to a client

═══ BID FEASIBILITY LOGIC (when target_seats and timeframe_days are provided) ═══

If user provided target_seats and timeframe_days:
1. Calculate "seats_needed_per_month" = target_seats / (timeframe_days / 30)
2. Compare to addressable pool and active pool from the funnels
3. CONVERSION RATE — USE 5% ACROSS ALL APAC MARKETS:
   - TP operational baseline: 5% leads → hire (confirmed by TP Malaysia ops, applied uniformly across all APAC markets)
   - Always apply 0.05 (5%) regardless of country
   - The 5% is NET CONVERSION from sourced lead to joined agent, accounting for: application drop-off, screening fails, assessment fails (Hallo.ai floor), offer decline, no-show on day one
   - Do NOT vary this rate by country, role complexity, or language rarity — it is a fixed TP operational baseline
4. Required lead volume = target_seats / 0.05 (i.e., 20 leads per 1 hire across all markets)
5. Compare required lead volume to addressable pool from funnels
6. Verdict thresholds — use these strictly:
   - "Feasible" — required leads ≤ 25% of addressable pool AND timeframe ≥ 60 days (allows standard 30-45 day cycle with buffer)
   - "Stretch" — required leads 25-50% of addressable pool OR timeframe 30-59 days
   - "Not Feasible" — required leads > 50% of addressable pool OR timeframe < 30 days OR pool too shallow to absorb the lead extraction
7. Output a 2-3 sentence rationale showing the math explicitly:
   - "Target X seats at 5% conversion requires ~Y leads. Addressable pool is Z, so this represents N% pool extraction. With M days, pacing requires P leads/month."

If user did NOT provide bid inputs:
- Set bid_feasibility to null (applicable: false)
- Do not invent a feasibility verdict

═══ OTHER TALENT MAP OUTPUTS (UNCHANGED) ═══
- supply_signals: 2-3 KEY market signals with cited sources (supplement the funnel)
- competitor_demand: real BPO names with "Run search to verify" for current open roles
- search_urls: 5-7 real clickable URLs for verification (Google X-ray, LinkedIn Jobs, JobStreet country-specific, Glassdoor)
- boolean_strings: 2-3 useful boolean strings
- sourcing_recommendations: 3-4 tactical actions

URLs must work — verify domain patterns:
- Google X-ray for LinkedIn: https://www.google.com/search?q=site%3Alinkedin.com%2Fin+%22{role}%22+%22{language}%22+%22{city}%22
- LinkedIn Jobs (public): https://www.linkedin.com/jobs/search/?keywords={URL-encoded keywords}&location={URL-encoded city}
- JobStreet country-specific: jobstreet.com.my (MY), jobstreet.co.th (TH), jobstreet.com.ph (PH), jobstreet.com.sg (SG), jobstreet.co.id (ID)
- Indeed country subdomain: my.indeed.com, th.indeed.com, ph.indeed.com, sg.indeed.com, id.indeed.com`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: buildApiHeaders(),
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 12000,
          messages: [
            { role: "user", content: prompt }
          ],
        })
      });

      const data = await response.json();
      const text = data.content
        .filter(item => item.type === "text")
        .map(item => item.text)
        .join("\n");

      let clean = text.replace(/```json|```/g, "").trim();

      // Attempt to recover truncated JSON by finding last complete brace
      try {
        const parsed = JSON.parse(clean);
        setAnalysis(parsed);
      } catch (parseErr) {
        // Try to find the last valid JSON by trimming back
        const lastBrace = clean.lastIndexOf('}');
        if (lastBrace > 0) {
          const trimmed = clean.substring(0, lastBrace + 1);
          try {
            const parsed = JSON.parse(trimmed);
            setAnalysis(parsed);
            return;
          } catch (e) {
            // fall through to error
          }
        }
        console.error("Raw response:", text);
        console.error("Parse error:", parseErr);
        setError(`JSON parse failed: ${parseErr.message}. Response was ${text.length} chars. Check console for raw output.`);
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError(`Request failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyResults = () => {
    if (!analysis) return;
    const sb = analysis.salary_benchmark;
    const bt = analysis.behavioral_thresholds;
    const text = `HALLO.AI BENCHMARK & SOURCING RECOMMENDATION
${'='.repeat(50)}

Role: ${analysis.role_summary}
Tier: ${analysis.lob_tier}
Primary Language: ${analysis.primary_language}
Role Type: ${analysis.language_role_type}
CEFR Minimum: ${analysis.cefr_minimum}
Experience: ${analysis.experience_required?.years} (${analysis.experience_required?.level})

LANGUAGE THRESHOLDS (Floor/Ceiling Rule applies)
${'-'.repeat(50)}
Fluency:       ${analysis.thresholds.fluency}
Grammar:       ${analysis.thresholds.grammar}
Vocabulary:    ${analysis.thresholds.vocabulary}
Pronunciation: ${analysis.thresholds.pronunciation}
Coherence:     ${analysis.thresholds.coherence}

${bt ? `BEHAVIORAL ASSESSMENT
${'-'.repeat(50)}
Soft Skills Overall:  ≥ ${bt.soft_skills_overall_min?.toFixed(1)} / 10
Priority Sub-Dimensions:
${bt.soft_skills_priority_subs?.map(s => `  • ${s.name}: ≥ ${s.min?.toFixed(1)} — ${s.rationale}`).join('\n') || '  None specified'}
${bt.soft_skills_reasoning ? `Reasoning: ${bt.soft_skills_reasoning}` : ''}

Personality / Resilience: ≥ ${bt.resilience_min} / 100
${bt.resilience_rationale ? `Rationale: ${bt.resilience_rationale}` : ''}

Cognitive:
  • Numerical Reasoning: ≥ ${bt.cognitive_numerical_min?.toFixed(1)} / 10
  • Abstract Reasoning:  ≥ ${bt.cognitive_abstract_min?.toFixed(1)} / 10

${bt.sales_competency_min !== null && bt.sales_competency_min !== undefined ? `Sales Competency: ≥ ${bt.sales_competency_min} / 100
Priority Sales Stages: ${bt.sales_priority_stages?.join(', ') || 'N/A'}
` : ''}Computer Literacy: ≥ ${bt.computer_literacy_min?.toFixed(1)} / 10
` : ''}
${analysis.secondary_language?.required ? `Secondary Language: ${analysis.secondary_language.language} (${analysis.secondary_language.cefr_minimum})\n` : ''}${sb ? `
COMPETITOR SALARY BENCHMARK (${sb.currency} · ${sb.location})
${'-'.repeat(50)}
Basis: ${sb.nationality_basis || 'N/A'}${sb.visa_required ? ' · EP/WP REQUIRED' : sb.visa_required === false ? ' · No visa sponsorship' : ''}
${sb.visa_type ? `Visa Type: ${sb.visa_type}` : ''}${sb.visa_minimum ? `\nRegulatory Min: ${sb.currency} ${Number(sb.visa_minimum).toLocaleString()}/month (basic only)` : ''}
${sb.visa_regulatory_note ? `⚠ Visa Note: ${sb.visa_regulatory_note}\n` : ''}

                Min          Mid          Max
Basic       ${sb.min.basic.toLocaleString().padEnd(12)} ${sb.mid.basic.toLocaleString().padEnd(12)} ${sb.max.basic.toLocaleString()}
Allowance   ${sb.min.allowance.toLocaleString().padEnd(12)} ${sb.mid.allowance.toLocaleString().padEnd(12)} ${sb.max.allowance.toLocaleString()}
Total       ${sb.min.total.toLocaleString().padEnd(12)} ${sb.mid.total.toLocaleString().padEnd(12)} ${sb.max.total.toLocaleString()}

Market Context: ${sb.notes}
Data Sources: ${sb.data_sources?.join(', ')}
Note: External advertised rates from competitors - NOT TP internal pricing
` : ''}
TARGET SOURCING COMPANIES
${'-'.repeat(50)}
Tier 1 (Direct Competitors):
${analysis.target_companies?.tier_1_direct?.map(c => `  • ${c}`).join('\n') || '  N/A'}

Tier 2 (Adjacent Industries):
${analysis.target_companies?.tier_2_adjacent?.map(c => `  • ${c}`).join('\n') || '  N/A'}

BPO Providers (APAC):
${analysis.target_companies?.bpo_providers?.map(c => `  • ${c}`).join('\n') || '  N/A'}

Cross-Industry Talent:
${analysis.target_companies?.cross_industry?.map(c => `  • ${c}`).join('\n') || '  N/A'}

Sourcing Rationale: ${analysis.company_reasoning || ''}

Avoid: ${analysis.avoid_signals?.join('; ') || 'N/A'}

REASONING
${'-'.repeat(50)}
${analysis.reasoning}

KEY INDICATORS
${analysis.key_indicators.map(k => `• ${k}`).join('\n')}

RISK FACTORS
${analysis.risk_factors.map(r => `• ${r}`).join('\n')}

Confidence: ${analysis.confidence}${analysis.talent_map ? `

TALENT MAP
${'='.repeat(50)}
${analysis.talent_map.bid_feasibility?.applicable ? `BID FEASIBILITY: ${analysis.talent_map.bid_feasibility.verdict}
Target: ${analysis.talent_map.bid_feasibility.target_seats} seats in ${analysis.talent_map.bid_feasibility.timeframe_days} days (${analysis.talent_map.bid_feasibility.seats_per_month_needed}/month)
Rationale: ${analysis.talent_map.bid_feasibility.rationale}
Action: ${analysis.talent_map.bid_feasibility.recommended_action}

` : ''}${analysis.talent_map.funnel_native_foreign?.applicable ? `NATIVE-FOREIGN FUNNEL: ${analysis.talent_map.funnel_native_foreign.title}  [Confidence: ${analysis.talent_map.funnel_native_foreign.confidence || 'N/A'}]
${analysis.talent_map.funnel_native_foreign.confidence_note ? `  ${analysis.talent_map.funnel_native_foreign.confidence_note}\n` : ''}${analysis.talent_map.funnel_native_foreign.rows?.map(r => `  ${r.label}: ${typeof r.value === 'number' ? r.value.toLocaleString() : r.value}  [${r.confidence || 'Estimated'}]${r.assumption_note ? `\n    × ${r.assumption_note}` : ''}${r.source ? `\n    Source: ${r.source}` : ''}`).join('\n') || ''}
  Addressable: ${typeof analysis.talent_map.funnel_native_foreign.final_addressable_pool === 'number' ? analysis.talent_map.funnel_native_foreign.final_addressable_pool.toLocaleString() : analysis.talent_map.funnel_native_foreign.final_addressable_pool} · Active: ${typeof analysis.talent_map.funnel_native_foreign.final_active_pool === 'number' ? analysis.talent_map.funnel_native_foreign.final_active_pool.toLocaleString() : analysis.talent_map.funnel_native_foreign.final_active_pool}
  ${analysis.talent_map.funnel_native_foreign.summary_note || ''}

` : ''}${analysis.talent_map.funnel_local_bilingual?.applicable ? `LOCAL-BILINGUAL FUNNEL: ${analysis.talent_map.funnel_local_bilingual.title}  [Confidence: ${analysis.talent_map.funnel_local_bilingual.confidence || 'N/A'}]
${analysis.talent_map.funnel_local_bilingual.confidence_note ? `  ${analysis.talent_map.funnel_local_bilingual.confidence_note}\n` : ''}${analysis.talent_map.funnel_local_bilingual.rows?.map(r => `  ${r.label}: ${typeof r.value === 'number' ? r.value.toLocaleString() : r.value}  [${r.confidence || 'Estimated'}]${r.assumption_note ? `\n    × ${r.assumption_note}` : ''}${r.source ? `\n    Source: ${r.source}` : ''}`).join('\n') || ''}
  Addressable: ${typeof analysis.talent_map.funnel_local_bilingual.final_addressable_pool === 'number' ? analysis.talent_map.funnel_local_bilingual.final_addressable_pool.toLocaleString() : analysis.talent_map.funnel_local_bilingual.final_addressable_pool} · Active: ${typeof analysis.talent_map.funnel_local_bilingual.final_active_pool === 'number' ? analysis.talent_map.funnel_local_bilingual.final_active_pool.toLocaleString() : analysis.talent_map.funnel_local_bilingual.final_active_pool}
  ${analysis.talent_map.funnel_local_bilingual.summary_note || ''}

` : ''}SEARCH URLS:
${analysis.talent_map.search_urls?.map(u => `  [${u.platform}] ${u.label}\n  ${u.url}`).join('\n\n') || '  N/A'}

BOOLEAN STRINGS:
${analysis.talent_map.boolean_strings?.map(bs => `  ${bs.label}:\n  ${bs.string}`).join('\n\n') || '  N/A'}

SUPPLY SIGNALS:
${analysis.talent_map.supply_signals?.map(s => `  [${s.source_type}] ${s.signal}\n    → ${s.implication}`).join('\n') || '  N/A'}

COMPETITOR ACTIVITY:
${analysis.talent_map.competitor_demand?.map(c => `  ${c.company} — ${c.open_roles_estimate} · ${c.implication}`).join('\n') || '  N/A'}

TACTICAL RECOMMENDATIONS:
${analysis.talent_map.sourcing_recommendations?.map(r => `  • ${r}`).join('\n') || '  N/A'}
` : ''}${analysis.screening_questions ? `

INTERVIEW QUESTIONS & RUBRICS
${'='.repeat(50)}

PHONE SCREENING (TA Recruiter · 15 min)
${'-'.repeat(50)}
${analysis.screening_questions.phone_screening?.map((q, i) => `
Q${i + 1}. ${q.question}
  Purpose: ${q.purpose}
  ✓ Good: ${q.rubric?.good}
  ~ Ok:   ${q.rubric?.ok}
  ✗ Bad:  ${q.rubric?.bad}`).join('\n') || '  N/A'}

OPERATIONAL INTERVIEW (Ops Manager · 45 min)
${'-'.repeat(50)}
${analysis.screening_questions.operational_interview?.map((q, i) => `
Q${i + 1}. [${q.type}] ${q.question}
  Purpose: ${q.purpose}
  ✓ Good: ${q.rubric?.good}
  ~ Ok:   ${q.rubric?.ok}
  ✗ Bad:  ${q.rubric?.bad}`).join('\n') || '  N/A'}
` : ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tierColor = (tier) => {
    if (!tier) return '#676767';
    if (tier.includes('Entry')) return '#848DAD';
    if (tier.includes('Standard')) return '#4B4C6A';
    if (tier.includes('Premium')) return '#706398';
    if (tier.includes('Luxury')) return '#FF0082';
    return '#676767';
  };

  const ThresholdBar = ({ label, value, max = 10 }) => {
    const pct = (value / max) * 100;
    const cefr = value >= 9.1 ? 'C2' : value >= 8.7 ? 'C1' : value >= 7.0 ? 'B2' : value >= 4.5 ? 'B1' : value >= 2.7 ? 'A2' : 'A1';
    return (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'baseline' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#414141', letterSpacing: '0.01em' }}>{label}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
            <span style={{ fontSize: '11px', color: '#676767', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>{cefr}</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#4B4C6A', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>{value.toFixed(1)}</span>
          </div>
        </div>
        <div style={{ height: '6px', background: '#ECE9E7', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #4B4C6A 0%, #706398 100%)',
            borderRadius: '3px',
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ECE9E7',
      fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
      color: '#414141',
      padding: '32px 20px',
    }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" />

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px', borderBottom: '1px solid #CCCCCC', paddingBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                padding: '6px 10px',
                background: '#4B4C6A',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Target size={14} color="#FFFFFF" strokeWidth={2.5} />
                <span style={{ fontSize: '11px', color: '#FFFFFF', fontWeight: 700, letterSpacing: '0.1em', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                  TP
                </span>
              </div>
              <span style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#676767', fontWeight: 600, fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                APAC Talent Acquisition · Hallo.ai Calibration
              </span>
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              title={apiKey ? 'API key configured · Click to update' : 'API key required · Click to set up'}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: apiKey ? '#FFFFFF' : '#FFE5F2',
                border: `1px solid ${apiKey ? '#CCCCCC' : '#FF0082'}`,
                borderRadius: '6px',
                fontSize: '12px',
                color: apiKey ? '#414141' : '#FF0082',
                cursor: 'pointer',
                fontWeight: 600,
                fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                transition: 'all 0.15s'
              }}
            >
              <Settings size={13} />
              {apiKey ? 'Settings' : 'Set API Key'}
              {!apiKey && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '10px',
                  height: '10px',
                  background: '#FF0082',
                  borderRadius: '50%',
                  border: '2px solid #ECE9E7'
                }} />
              )}
            </button>
          </div>
          <h1 style={{
            fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
            fontSize: '40px',
            fontWeight: 700,
            color: '#4B4C6A',
            margin: '0 0 10px 0',
            letterSpacing: '-0.02em',
            lineHeight: 1.05
          }}>
            Profile Recommender
          </h1>
          <p style={{ fontSize: '15px', color: '#676767', margin: '0 0 16px 0', maxWidth: '640px', lineHeight: 1.5, fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
            {mode === 'recommender'
              ? 'Drop a PDF, DOCX, or paste a client RFP. Get Hallo.ai thresholds, competitor salary ranges, and a target sourcing map — calibrated for APAC markets.'
              : 'Upload a JD, candidate CV, and Hallo.ai assessment. Get a fit-match verdict with trainability breakdown and training plan recommendation.'}
          </p>

          {/* Mode Toggle */}
          <div style={{
            display: 'inline-flex',
            background: '#ECE9E7',
            padding: '4px',
            borderRadius: '8px',
            gap: '2px'
          }}>
            <button
              onClick={() => setMode('recommender')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: mode === 'recommender' ? '#4B4C6A' : 'transparent',
                color: mode === 'recommender' ? '#FFFFFF' : '#676767',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                letterSpacing: '0.02em',
                transition: 'all 0.15s'
              }}
            >
              <Target size={13} />
              Profile Recommender
            </button>
            <button
              onClick={() => setMode('fitmatch')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: mode === 'fitmatch' ? '#4B4C6A' : 'transparent',
                color: mode === 'fitmatch' ? '#FFFFFF' : '#676767',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                letterSpacing: '0.02em',
                transition: 'all 0.15s'
              }}
            >
              <UserCheck size={13} />
              Fit Match
            </button>
          </div>
        </div>

        {/* ═══════════════ RECOMMENDER MODE ═══════════════ */}
        {mode === 'recommender' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)', gap: '24px', alignItems: 'start' }}>
          {/* Input Panel */}
          <div>
            {/* Location & Language Context Panel */}
            <div style={{
              background: '#ECE9E7',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid #D4D2CA'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                Operational Context
              </div>
              <div style={{ fontSize: '10px', color: '#706398', marginBottom: '12px', lineHeight: 1.5, fontStyle: 'italic' }}>
                Values entered here OVERRIDE anything mentioned in the JD. Leave a field blank to use the JD's value.
              </div>

              {/* Country + City */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: '#676767', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '13px',
                      fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                      background: '#FFFFFF',
                      border: '1px solid #CCCCCC',
                      borderRadius: '6px',
                      color: '#414141',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select country...</option>
                    {Object.keys(APAC_LOCATIONS).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: '#676767', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                    City
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!country}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '13px',
                      fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                      background: country ? '#FFFFFF' : '#ECE9E7',
                      border: '1px solid #CCCCCC',
                      borderRadius: '6px',
                      color: country ? '#414141' : '#848DAD',
                      outline: 'none',
                      cursor: country ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <option value="">{country ? 'Select city...' : 'Select country first'}</option>
                    {country && APAC_LOCATIONS[country].map(ct => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nationality Preference */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '10px', fontWeight: 600, color: '#676767', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                  Nationality Preference
                </label>
                <select
                  value={nationalityType}
                  onChange={(e) => setNationalityType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                    background: '#FFFFFF',
                    border: '1px solid #CCCCCC',
                    borderRadius: '6px',
                    color: '#414141',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Select nationality basis...</option>
                  {NATIONALITY_TYPES.map(n => (
                    <option key={n.value} value={n.value}>
                      {n.label} — {n.description}
                    </option>
                  ))}
                </select>

                {/* Specific Nationality Multi-Select - only shown for relevant types */}
                {(nationalityType === 'native_foreign' || nationalityType === 'both_acceptable' || nationalityType === 'pan_apac') && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#676767', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                      Specific Target Nationalities (Optional)
                    </div>
                    <div style={{
                      maxHeight: '120px',
                      overflowY: 'auto',
                      padding: '8px',
                      background: '#FFFFFF',
                      border: '1px solid #CCCCCC',
                      borderRadius: '6px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px'
                    }}>
                      {APAC_NATIONALITIES.map(nat => {
                        const selected = specificNationalities.includes(nat);
                        return (
                          <button
                            key={nat}
                            onClick={() => toggleNationality(nat)}
                            style={{
                              fontSize: '11px',
                              padding: '3px 9px',
                              background: selected ? '#4B4C6A' : '#ECE9E7',
                              color: selected ? '#FFFFFF' : '#414141',
                              border: 'none',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              fontWeight: selected ? 600 : 500,
                              fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                              transition: 'all 0.12s'
                            }}
                          >
                            {nat}
                          </button>
                        );
                      })}
                    </div>
                    {specificNationalities.length > 0 && (
                      <div style={{ marginTop: '6px', fontSize: '10px', color: '#676767' }}>
                        <span style={{ fontWeight: 600 }}>{specificNationalities.length} selected:</span> {specificNationalities.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Languages */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: '#676767', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                    Languages & CEFR Requirement (Max 3)
                  </label>
                  {languages.length < 3 && (
                    <button
                      onClick={addLanguage}
                      style={{
                        fontSize: '10px',
                        padding: '3px 10px',
                        background: '#4B4C6A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        letterSpacing: '0.03em',
                        fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                      }}
                    >
                      + Add Language
                    </button>
                  )}
                </div>

                {languages.map((lang, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 28px',
                    gap: '8px',
                    marginBottom: i < languages.length - 1 ? '8px' : 0,
                    alignItems: 'center'
                  }}>
                    <select
                      value={lang.language}
                      onChange={(e) => updateLanguage(i, 'language', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        fontSize: '12px',
                        fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                        background: '#FFFFFF',
                        border: '1px solid #CCCCCC',
                        borderRadius: '6px',
                        color: '#414141',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Select language...</option>
                      {APAC_LANGUAGES.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    <select
                      value={lang.cefr}
                      onChange={(e) => updateLanguage(i, 'cefr', e.target.value)}
                      disabled={!lang.language}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        fontSize: '12px',
                        fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                        background: lang.language ? '#FFFFFF' : '#ECE9E7',
                        border: '1px solid #CCCCCC',
                        borderRadius: '6px',
                        color: lang.language ? '#414141' : '#848DAD',
                        outline: 'none',
                        cursor: lang.language ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <option value="">CEFR level...</option>
                      {CEFR_LEVELS.map(lvl => (
                        <option key={lvl.value} value={lvl.value}>{lvl.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeLanguage(i)}
                      disabled={languages.length === 1 && !lang.language && !lang.cefr}
                      style={{
                        width: '28px',
                        height: '28px',
                        padding: 0,
                        background: 'transparent',
                        border: '1px solid #CCCCCC',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#676767'
                      }}
                      title={languages.length === 1 ? 'Clear' : 'Remove'}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Bid Feasibility Inputs (Optional) */}
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #C2C7CD' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#706398', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                  Bid Feasibility (Optional)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 500, color: '#676767', display: 'block', marginBottom: '4px', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                      Target Seats
                    </label>
                    <input
                      type="number"
                      value={targetSeats}
                      onChange={(e) => setTargetSeats(e.target.value)}
                      placeholder="e.g. 50"
                      min="0"
                      style={{
                        width: '100%', padding: '7px 10px', fontSize: '12px',
                        fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                        background: '#FFFFFF', border: '1px solid #CCCCCC', borderRadius: '6px',
                        color: '#414141', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 500, color: '#676767', display: 'block', marginBottom: '4px', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                      Timeframe (Days)
                    </label>
                    <input
                      type="number"
                      value={timeframeDays}
                      onChange={(e) => setTimeframeDays(e.target.value)}
                      placeholder="e.g. 90"
                      min="0"
                      style={{
                        width: '100%', padding: '7px 10px', fontSize: '12px',
                        fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                        background: '#FFFFFF', border: '1px solid #CCCCCC', borderRadius: '6px',
                        color: '#414141', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#414141', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                Job Description
              </label>
            </div>

            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              placeholder="Paste a job description here, or drag-and-drop a PDF / DOCX / TXT file..."
              style={{
                width: '100%',
                minHeight: uploadedFile ? '320px' : '400px',
                padding: '16px',
                fontSize: '13px',
                fontFamily: '"TP Sans", sans-serif',
                lineHeight: 1.6,
                background: isDragging ? '#E2DFE8' : '#FFFFFF',
                border: isDragging ? '2px dashed #4B4C6A' : '1px solid #CCCCCC',
                borderRadius: '8px',
                resize: 'vertical',
                color: '#414141',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.15s'
              }}
              onFocus={(e) => { if (!isDragging) e.target.style.borderColor = '#4B4C6A'; }}
              onBlur={(e) => { if (!isDragging) e.target.style.borderColor = '#CCCCCC'; }}
            />

            {/* File Upload Controls */}
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={processingFile}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: '#FFFFFF',
                  border: '1px solid #CCCCCC',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#414141',
                  cursor: processingFile ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { if (!processingFile) { e.currentTarget.style.borderColor = '#4B4C6A'; e.currentTarget.style.color = '#4B4C6A'; }}}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CCCCCC'; e.currentTarget.style.color = '#414141'; }}
              >
                <Upload size={13} />
                Upload PDF / DOCX
              </button>

              {processingFile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#676767' }}>
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  Extracting text...
                </div>
              )}

              {uploadedFile && !processingFile && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  background: '#ECE9E7',
                  border: '1px solid #D4D2CA',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#414141',
                  flex: 1,
                  minWidth: 0
                }}>
                  <File size={13} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                    {uploadedFile.name}
                  </span>
                  <span style={{ fontSize: '10px', color: '#676767', flexShrink: 0 }}>
                    {formatFileSize(uploadedFile.size)}
                  </span>
                  <button
                    onClick={clearFile}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#414141',
                      flexShrink: 0
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {!uploadedFile && !processingFile && (
                <span style={{ fontSize: '11px', color: '#848DAD', fontStyle: 'italic' }}>
                  or drop a file directly into the box above
                </span>
              )}
            </div>

            <button
              onClick={analyzeJD}
              disabled={loading || !jobDescription.trim()}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '14px 24px',
                background: loading || !jobDescription.trim() ? '#848DAD' : '#4B4C6A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading || !jobDescription.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                letterSpacing: '0.02em',
                transition: 'all 0.15s',
                fontFamily: '"TP Sans", sans-serif'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Benchmark
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {error && (
              <div style={{
                marginTop: '12px',
                padding: '12px 16px',
                background: '#FFE5F2',
                border: '1px solid #FFB3D5',
                borderRadius: '6px',
                color: '#FF0082',
                fontSize: '13px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                {error}
              </div>
            )}
          </div>

          {/* Output Panel */}
          <div>
            {!analysis && !loading && (
              <div style={{
                padding: '60px 32px',
                background: '#FFFFFF',
                border: '1px dashed #CCCCCC',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <FileText size={32} color="#848DAD" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '14px', color: '#676767', margin: 0 }}>
                  Recommendation will appear here
                </p>
                <p style={{ fontSize: '12px', color: '#848DAD', margin: '4px 0 0 0' }}>
                  Powered by Claude · Hallo.ai methodology
                </p>
              </div>
            )}

            {loading && (
              <div style={{
                padding: '60px 32px',
                background: '#FFFFFF',
                border: '1px solid #CCCCCC',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <Loader2 size={28} color="#4B4C6A" style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: '13px', color: '#676767', margin: 0 }}>
                  Analyzing role complexity, language requirements, and LOB tier...
                </p>
              </div>
            )}

            {analysis && (
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #CCCCCC',
                borderRadius: '8px',
                overflow: 'hidden',
                animation: 'fadeIn 0.4s ease-out'
              }}>
                {/* Header strip */}
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #CCCCCC',
                  background: '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: tierColor(analysis.lob_tier)
                    }} />
                    <span style={{ fontSize: '11px', color: '#676767', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                      {analysis.confidence} Confidence
                    </span>
                  </div>
                  <button
                    onClick={copyResults}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: copied ? '#4B4C6A' : '#FFFFFF',
                      border: '1px solid #CCCCCC',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: copied ? '#FFFFFF' : '#414141',
                      cursor: 'pointer',
                      fontWeight: 500,
                      transition: 'all 0.15s'
                    }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                {/* Role Summary */}
                <div style={{ padding: '20px' }}>
                  <p style={{ fontSize: '13px', color: '#4B4C6A', margin: '0 0 16px 0', lineHeight: 1.5, fontWeight: 500 }}>
                    {analysis.role_summary}
                  </p>

                  {/* Tier + Language Tags */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <span style={{
                      padding: '4px 10px',
                      background: tierColor(analysis.lob_tier),
                      color: '#FFFFFF',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase'
                    }}>
                      {analysis.lob_tier}
                    </span>
                    <span style={{
                      padding: '4px 10px',
                      background: '#ECE9E7',
                      color: '#414141',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 500,
                      display: 'flex',
                      gap: '4px',
                      alignItems: 'center'
                    }}>
                      <Languages size={11} />
                      {analysis.primary_language}
                    </span>
                    <span style={{
                      padding: '4px 10px',
                      background: '#ECE9E7',
                      color: '#414141',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 500
                    }}>
                      {analysis.language_role_type}
                    </span>
                    <span style={{
                      padding: '4px 10px',
                      background: '#E2DFE8',
                      color: '#706398',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                    }}>
                      Min: {analysis.cefr_minimum}
                    </span>
                    {analysis.experience_required && (
                      <span style={{
                        padding: '4px 10px',
                        background: '#ECE9E7',
                        color: '#414141',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 500,
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'center'
                      }}>
                        <Calendar size={11} />
                        {analysis.experience_required.years} · {analysis.experience_required.level}
                      </span>
                    )}
                  </div>

                  {/* TAB NAVIGATION */}
                  <div style={{
                    display: 'flex',
                    gap: '2px',
                    marginBottom: '16px',
                    borderBottom: '1px solid #CCCCCC',
                    overflowX: 'auto'
                  }}>
                    {[
                      { id: 'overview', label: 'Assessment', icon: Target },
                      { id: 'salary', label: 'Salary', icon: Wallet },
                      { id: 'sourcing', label: 'Sourcing', icon: Building2 },
                      { id: 'talent_map', label: 'Talent Map', icon: Map },
                      { id: 'questions', label: 'Interview Q&A', icon: MessageSquare },
                      { id: 'rationale', label: 'Rationale', icon: Brain }
                    ].map(tab => {
                      const isActive = activeTab === tab.id;
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 14px',
                            background: isActive ? '#4B4C6A' : 'transparent',
                            color: isActive ? '#FFFFFF' : '#676767',
                            border: 'none',
                            borderTopLeftRadius: '6px',
                            borderTopRightRadius: '6px',
                            fontSize: '12px',
                            fontWeight: isActive ? 600 : 500,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s',
                            fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                            letterSpacing: '0.02em',
                            marginBottom: '-1px',
                            borderBottom: isActive ? '2px solid #4B4C6A' : '2px solid transparent'
                          }}
                          onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = '#ECE9E7'; e.currentTarget.style.color = '#414141'; }}}
                          onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#676767'; }}}
                        >
                          <Icon size={13} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* TAB: ASSESSMENT (Thresholds + Behavioral) */}
                  {activeTab === 'overview' && (
                  <>

                  {/* Thresholds */}
                  <div style={{
                    padding: '16px',
                    background: '#FFFFFF',
                    borderRadius: '6px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Threshold Requirements
                      </span>
                      <span style={{ fontSize: '10px', color: '#706398', background: '#E2DFE8', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>
                        Floor/Ceiling Rule
                      </span>
                    </div>
                    <ThresholdBar label="Fluency" value={analysis.thresholds.fluency} />
                    <ThresholdBar label="Grammar" value={analysis.thresholds.grammar} />
                    <ThresholdBar label="Vocabulary" value={analysis.thresholds.vocabulary} />
                    <ThresholdBar label="Pronunciation" value={analysis.thresholds.pronunciation} />
                    <ThresholdBar label="Coherence" value={analysis.thresholds.coherence} />
                  </div>

                  {/* Behavioral Assessment Block */}
                  {analysis.behavioral_thresholds && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '12px', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <Heart size={13} color="#4B4C6A" />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                            Behavioral Assessment
                          </span>
                        </div>
                        <span style={{ fontSize: '10px', color: '#676767', fontStyle: 'italic' }}>
                          Soft skills · Personality · Cognitive
                        </span>
                      </div>

                      {/* Soft Skills */}
                      <div style={{ padding: '14px', background: '#FFFFFF', border: '1px solid #CCCCCC', borderRadius: '6px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Heart size={12} color="#4B4C6A" />
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B4C6A', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                              Soft Skills
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '10px', color: '#676767' }}>Overall min:</span>
                            <span style={{ fontSize: '16px', fontWeight: 700, color: '#4B4C6A', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                              {analysis.behavioral_thresholds.soft_skills_overall_min?.toFixed(1)}
                            </span>
                            <span style={{ fontSize: '10px', color: '#676767' }}>/ 10</span>
                          </div>
                        </div>

                        {analysis.behavioral_thresholds.soft_skills_priority_subs?.length > 0 && (
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: '#676767', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                              Priority Sub-Dimensions
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {analysis.behavioral_thresholds.soft_skills_priority_subs.map((sub, i) => (
                                <div key={i} style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr auto',
                                  gap: '8px',
                                  alignItems: 'center',
                                  padding: '6px 10px',
                                  background: '#ECE9E7',
                                  borderRadius: '4px'
                                }}>
                                  <div>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#414141' }}>
                                      {sub.name}
                                    </div>
                                    {sub.rationale && (
                                      <div style={{ fontSize: '10px', color: '#676767', marginTop: '2px', lineHeight: 1.4 }}>
                                        {sub.rationale}
                                      </div>
                                    )}
                                  </div>
                                  <span style={{
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: '#4B4C6A',
                                    fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                                    padding: '2px 8px',
                                    background: '#FFFFFF',
                                    borderRadius: '3px'
                                  }}>
                                    ≥ {sub.min?.toFixed(1)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {analysis.behavioral_thresholds.soft_skills_reasoning && (
                          <div style={{ fontSize: '11px', color: '#676767', lineHeight: 1.5, fontStyle: 'italic', borderTop: '1px solid #ECE9E7', paddingTop: '8px', marginTop: '8px' }}>
                            {analysis.behavioral_thresholds.soft_skills_reasoning}
                          </div>
                        )}
                      </div>

                      {/* Personality / Resilience */}
                      <div style={{
                        padding: '14px',
                        background: '#FFFFFF',
                        border: '1px solid #CCCCCC',
                        borderRadius: '6px',
                        marginBottom: '10px',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: '14px',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                            <Shield size={12} color="#4B4C6A" />
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B4C6A', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                              Personality / Resilience
                            </span>
                          </div>
                          {analysis.behavioral_thresholds.resilience_rationale && (
                            <div style={{ fontSize: '11px', color: '#676767', lineHeight: 1.5 }}>
                              {analysis.behavioral_thresholds.resilience_rationale}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '10px', color: '#676767', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Min
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                            <span style={{ fontSize: '22px', fontWeight: 700, color: '#4B4C6A', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif', lineHeight: 1 }}>
                              {analysis.behavioral_thresholds.resilience_min}
                            </span>
                            <span style={{ fontSize: '11px', color: '#676767' }}>/ 100</span>
                          </div>
                        </div>
                      </div>

                      {/* Cognitive Sub-Dimensions */}
                      <div style={{ padding: '14px', background: '#FFFFFF', border: '1px solid #CCCCCC', borderRadius: '6px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '10px' }}>
                          <Activity size={12} color="#4B4C6A" />
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B4C6A', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            Cognitive Sub-Dimensions
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div style={{ padding: '8px 10px', background: '#ECE9E7', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#414141', fontWeight: 500 }}>Numerical Reasoning</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#4B4C6A', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                              ≥ {analysis.behavioral_thresholds.cognitive_numerical_min?.toFixed(1)}
                            </span>
                          </div>
                          <div style={{ padding: '8px 10px', background: '#ECE9E7', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#414141', fontWeight: 500 }}>Abstract Reasoning</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#4B4C6A', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                              ≥ {analysis.behavioral_thresholds.cognitive_abstract_min?.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sales Competency - conditional */}
                      {analysis.behavioral_thresholds.sales_competency_min !== null && analysis.behavioral_thresholds.sales_competency_min !== undefined && (
                        <div style={{ padding: '14px', background: '#FFFFFF', border: '1px solid #CCCCCC', borderRadius: '6px', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <ShoppingBag size={12} color="#4B4C6A" />
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B4C6A', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                Sales Competency
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '10px', color: '#676767' }}>Min:</span>
                              <span style={{ fontSize: '16px', fontWeight: 700, color: '#4B4C6A', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                                {analysis.behavioral_thresholds.sales_competency_min}
                              </span>
                              <span style={{ fontSize: '10px', color: '#676767' }}>/ 100</span>
                            </div>
                          </div>
                          {analysis.behavioral_thresholds.sales_priority_stages?.length > 0 && (
                            <div>
                              <div style={{ fontSize: '10px', fontWeight: 600, color: '#676767', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                Priority Sales Cycle Stages
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {analysis.behavioral_thresholds.sales_priority_stages.map((stage, i) => (
                                  <span key={i} style={{
                                    fontSize: '11px',
                                    padding: '3px 9px',
                                    background: '#E2DFE8',
                                    color: '#4B4C6A',
                                    borderRadius: '3px',
                                    fontWeight: 500
                                  }}>
                                    {stage}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Computer Literacy */}
                      {analysis.behavioral_thresholds.computer_literacy_min !== undefined && (
                        <div style={{
                          padding: '10px 14px',
                          background: '#FFFFFF',
                          border: '1px solid #CCCCCC',
                          borderRadius: '6px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Monitor size={12} color="#4B4C6A" />
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B4C6A', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                              Computer Literacy
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '10px', color: '#676767' }}>Min:</span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#4B4C6A', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                              {analysis.behavioral_thresholds.computer_literacy_min?.toFixed(1)}
                            </span>
                            <span style={{ fontSize: '10px', color: '#676767' }}>/ 10</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Secondary Language */}
                  {analysis.secondary_language?.required && (
                    <div style={{
                      padding: '12px 14px',
                      background: '#E2DFE8',
                      borderLeft: '3px solid #706398',
                      borderRadius: '4px',
                      marginBottom: '20px',
                      fontSize: '12px',
                      color: '#706398'
                    }}>
                      <strong>Secondary Language:</strong> {analysis.secondary_language.language} · {analysis.secondary_language.cefr_minimum}
                    </div>
                  )}

                  </>
                  )}

                  {/* TAB: SALARY */}
                  {activeTab === 'salary' && (
                  <>

                  {/* Salary Benchmark */}
                  {analysis.salary_benchmark && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '10px', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <Wallet size={13} color="#4B4C6A" />
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Competitor Salary Benchmark
                          </span>
                        </div>
                        <span style={{ fontSize: '10px', color: '#706398', background: '#E2DFE8', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>
                          External Advertised · Not Internal Pricing
                        </span>
                      </div>

                      {/* Nationality Basis Strip */}
                      {(analysis.salary_benchmark.nationality_basis || analysis.salary_benchmark.visa_required !== undefined) && (
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginBottom: '10px',
                          alignItems: 'center'
                        }}>
                          {analysis.salary_benchmark.nationality_basis && (
                            <span style={{
                              fontSize: '11px',
                              padding: '4px 10px',
                              background: '#4B4C6A',
                              color: '#FFFFFF',
                              borderRadius: '4px',
                              fontWeight: 500,
                              fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                            }}>
                              Basis: {analysis.salary_benchmark.nationality_basis}
                            </span>
                          )}
                          {analysis.salary_benchmark.visa_required === true && (
                            <span style={{
                              fontSize: '11px',
                              padding: '4px 10px',
                              background: '#FF0082',
                              color: '#FFFFFF',
                              borderRadius: '4px',
                              fontWeight: 600,
                              fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                            }}>
                              EP / WP Required
                            </span>
                          )}
                          {analysis.salary_benchmark.visa_required === false && (
                            <span style={{
                              fontSize: '11px',
                              padding: '4px 10px',
                              background: '#D4D2CA',
                              color: '#414141',
                              borderRadius: '4px',
                              fontWeight: 500,
                              fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                            }}>
                              No Visa Sponsorship
                            </span>
                          )}
                        </div>
                      )}

                      {/* Visa Regulatory Note */}
                      {analysis.salary_benchmark.visa_regulatory_note && (
                        <div style={{
                          padding: '12px 14px',
                          background: '#FFE5F2',
                          borderLeft: '4px solid #FF0082',
                          borderRadius: '4px',
                          marginBottom: '12px',
                          fontSize: '11px',
                          color: '#414141',
                          lineHeight: 1.55
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 700, color: '#FF0082', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={11} />
                              Visa Regulatory Floor
                            </span>
                            {analysis.salary_benchmark.visa_type && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 8px',
                                background: '#FFFFFF',
                                color: '#FF0082',
                                border: '1px solid #FF0082',
                                borderRadius: '3px',
                                fontWeight: 700,
                                letterSpacing: '0.03em',
                                fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                              }}>
                                {analysis.salary_benchmark.visa_type}
                              </span>
                            )}
                          </div>
                          {analysis.salary_benchmark.visa_minimum && (
                            <div style={{ fontSize: '12px', color: '#414141', marginBottom: '6px' }}>
                              <span style={{ fontWeight: 600 }}>Regulatory minimum: </span>
                              <span style={{ fontWeight: 700, color: '#FF0082', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                                {analysis.salary_benchmark.currency} {Number(analysis.salary_benchmark.visa_minimum).toLocaleString()}/month
                              </span>
                              <span style={{ color: '#676767', fontSize: '10px' }}> (basic salary only — allowances don't count for Malaysia EP)</span>
                            </div>
                          )}
                          <div>{analysis.salary_benchmark.visa_regulatory_note}</div>
                        </div>
                      )}

                      <div style={{
                        background: '#4B4C6A',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        color: '#FFFFFF'
                      }}>
                        {/* Header */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '90px 1fr 1fr 1fr',
                          padding: '10px 14px',
                          background: '#3D3E58',
                          fontSize: '10px',
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#C2C7CD'
                        }}>
                          <div></div>
                          <div style={{ textAlign: 'right' }}>Min</div>
                          <div style={{ textAlign: 'right' }}>Mid</div>
                          <div style={{ textAlign: 'right' }}>Max</div>
                        </div>

                        {/* Basic Row */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '90px 1fr 1fr 1fr',
                          padding: '12px 14px',
                          fontSize: '13px',
                          borderBottom: '1px solid #5F607D'
                        }}>
                          <div style={{ color: '#C2C7CD', fontSize: '11px', fontWeight: 500, alignSelf: 'center' }}>Basic</div>
                          <div style={{ textAlign: 'right', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif', fontWeight: 500 }}>
                            {analysis.salary_benchmark.min.basic.toLocaleString()}
                          </div>
                          <div style={{ textAlign: 'right', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif', fontWeight: 500 }}>
                            {analysis.salary_benchmark.mid.basic.toLocaleString()}
                          </div>
                          <div style={{ textAlign: 'right', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif', fontWeight: 500 }}>
                            {analysis.salary_benchmark.max.basic.toLocaleString()}
                          </div>
                        </div>

                        {/* Allowance Row */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '90px 1fr 1fr 1fr',
                          padding: '12px 14px',
                          fontSize: '13px',
                          borderBottom: '1px solid #5F607D'
                        }}>
                          <div style={{ color: '#C2C7CD', fontSize: '11px', fontWeight: 500, alignSelf: 'center' }}>Allowance</div>
                          <div style={{ textAlign: 'right', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif', fontWeight: 500 }}>
                            {analysis.salary_benchmark.min.allowance.toLocaleString()}
                          </div>
                          <div style={{ textAlign: 'right', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif', fontWeight: 500 }}>
                            {analysis.salary_benchmark.mid.allowance.toLocaleString()}
                          </div>
                          <div style={{ textAlign: 'right', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif', fontWeight: 500 }}>
                            {analysis.salary_benchmark.max.allowance.toLocaleString()}
                          </div>
                        </div>

                        {/* Total Row */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '90px 1fr 1fr 1fr',
                          padding: '14px 14px',
                          fontSize: '14px',
                          background: '#3D3E58',
                          fontWeight: 600
                        }}>
                          <div style={{ color: '#FFFFFF', fontSize: '11px', fontWeight: 600, alignSelf: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Total
                          </div>
                          <div style={{ textAlign: 'right', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                            <span style={{ fontSize: '10px', color: '#C2C7CD', marginRight: '4px' }}>{analysis.salary_benchmark.currency}</span>
                            {analysis.salary_benchmark.min.total.toLocaleString()}
                          </div>
                          <div style={{ textAlign: 'right', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif', color: '#FF0082' }}>
                            <span style={{ fontSize: '10px', color: '#C2C7CD', marginRight: '4px' }}>{analysis.salary_benchmark.currency}</span>
                            {analysis.salary_benchmark.mid.total.toLocaleString()}
                          </div>
                          <div style={{ textAlign: 'right', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                            <span style={{ fontSize: '10px', color: '#C2C7CD', marginRight: '4px' }}>{analysis.salary_benchmark.currency}</span>
                            {analysis.salary_benchmark.max.total.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Notes & Sources */}
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {analysis.salary_benchmark.notes && (
                          <div style={{
                            padding: '8px 12px',
                            background: '#FFFFFF',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#414141',
                            lineHeight: 1.5,
                            borderLeft: '3px solid #706398'
                          }}>
                            <span style={{ fontWeight: 600, color: '#706398' }}>Market context: </span>
                            {analysis.salary_benchmark.notes}
                          </div>
                        )}

                        {analysis.salary_benchmark.data_sources?.length > 0 && (
                          <div style={{
                            fontSize: '10px',
                            color: '#848DAD',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexWrap: 'wrap'
                          }}>
                            <TrendingUp size={10} />
                            <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sources:</span>
                            {analysis.salary_benchmark.data_sources.join(' · ')}
                            {analysis.salary_benchmark.location && (
                              <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
                                Location: {analysis.salary_benchmark.location}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  </>
                  )}

                  {/* TAB: SOURCING */}
                  {activeTab === 'sourcing' && (
                  <>

                  {/* Target Companies - Sourcing */}
                  {analysis.target_companies && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '12px', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <Building2 size={13} color="#4B4C6A" />
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Target Sourcing Companies
                          </span>
                        </div>
                        <span style={{ fontSize: '10px', color: '#676767', fontStyle: 'italic' }}>
                          Where to look for candidates
                        </span>
                      </div>

                      {/* Tier 1 */}
                      {analysis.target_companies.tier_1_direct?.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <span style={{
                              padding: '1px 6px',
                              background: '#4B4C6A',
                              color: '#FFFFFF',
                              fontSize: '9px',
                              fontWeight: 700,
                              borderRadius: '3px',
                              letterSpacing: '0.05em'
                            }}>TIER 1</span>
                            <span style={{ fontSize: '11px', color: '#414141', fontWeight: 500 }}>Direct Competitors</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {analysis.target_companies.tier_1_direct.map((company, i) => (
                              <span key={i} style={{
                                fontSize: '11px',
                                padding: '3px 9px',
                                background: '#4B4C6A',
                                color: '#FFFFFF',
                                borderRadius: '3px',
                                fontWeight: 500
                              }}>
                                {company}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tier 2 */}
                      {analysis.target_companies.tier_2_adjacent?.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <span style={{
                              padding: '1px 6px',
                              background: '#706398',
                              color: '#FFFFFF',
                              fontSize: '9px',
                              fontWeight: 700,
                              borderRadius: '3px',
                              letterSpacing: '0.05em'
                            }}>TIER 2</span>
                            <span style={{ fontSize: '11px', color: '#414141', fontWeight: 500 }}>Adjacent Industries</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {analysis.target_companies.tier_2_adjacent.map((company, i) => (
                              <span key={i} style={{
                                fontSize: '11px',
                                padding: '3px 9px',
                                background: '#E2DFE8',
                                color: '#706398',
                                borderRadius: '3px',
                                fontWeight: 500
                              }}>
                                {company}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* BPO Providers */}
                      {analysis.target_companies.bpo_providers?.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <span style={{
                              padding: '1px 6px',
                              background: '#706398',
                              color: '#FFFFFF',
                              fontSize: '9px',
                              fontWeight: 700,
                              borderRadius: '3px',
                              letterSpacing: '0.05em'
                            }}>BPO</span>
                            <span style={{ fontSize: '11px', color: '#414141', fontWeight: 500 }}>APAC BPO Providers (same account)</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {analysis.target_companies.bpo_providers.map((company, i) => (
                              <span key={i} style={{
                                fontSize: '11px',
                                padding: '3px 9px',
                                background: '#E2DFE8',
                                color: '#4B4C6A',
                                borderRadius: '3px',
                                fontWeight: 500
                              }}>
                                {company}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cross-Industry */}
                      {analysis.target_companies.cross_industry?.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <span style={{
                              padding: '1px 6px',
                              background: '#918E81',
                              color: '#FFFFFF',
                              fontSize: '9px',
                              fontWeight: 700,
                              borderRadius: '3px',
                              letterSpacing: '0.05em'
                            }}>CROSS</span>
                            <span style={{ fontSize: '11px', color: '#414141', fontWeight: 500 }}>Cross-Industry (transferable)</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {analysis.target_companies.cross_industry.map((company, i) => (
                              <span key={i} style={{
                                fontSize: '11px',
                                padding: '3px 9px',
                                background: '#D4D2CA',
                                color: '#414141',
                                borderRadius: '3px',
                                fontWeight: 500
                              }}>
                                {company}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sourcing Rationale */}
                      {analysis.company_reasoning && (
                        <div style={{
                          padding: '10px 12px',
                          background: '#FFFFFF',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#414141',
                          lineHeight: 1.5,
                          marginTop: '8px',
                          borderLeft: '3px solid #4B4C6A'
                        }}>
                          <span style={{ fontWeight: 600, color: '#4B4C6A' }}>Rationale: </span>
                          {analysis.company_reasoning}
                        </div>
                      )}

                      {/* Avoid Signals */}
                      {analysis.avoid_signals?.length > 0 && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          background: '#FFE5F2',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: '#FF0082',
                          lineHeight: 1.5,
                          borderLeft: '3px solid #FF0082'
                        }}>
                          <span style={{ fontWeight: 600 }}>Avoid: </span>
                          {analysis.avoid_signals.join(' · ')}
                        </div>
                      )}
                    </div>
                  )}

                  </>
                  )}

                  {/* TAB: TALENT MAP */}
                  {activeTab === 'talent_map' && analysis.talent_map && (
                  <>
                    {/* Sourcing workbench disclaimer */}
                    <div style={{
                      padding: '12px 14px',
                      background: '#E2DFE8',
                      borderLeft: '3px solid #706398',
                      borderRadius: '4px',
                      marginBottom: '20px',
                      fontSize: '11px',
                      color: '#414141',
                      lineHeight: 1.5
                    }}>
                      <span style={{ fontWeight: 700, color: '#706398', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>Methodology · </span>
                      Pool numbers below come from cited public sources (government statistics, embassy data, university enrollment, competitor BPO Glassdoor data). Each funnel row shows the assumption rate used, so Sales/BD can defend or challenge the math row-by-row. Use the search URLs below to verify in real time.
                    </div>

                    {/* BID FEASIBILITY VERDICT (if applicable) */}
                    {analysis.talent_map.bid_feasibility?.applicable && (() => {
                      const bf = analysis.talent_map.bid_feasibility;
                      const verdictColor = bf.verdict === 'Feasible' ? '#4B4C6A' : bf.verdict === 'Stretch' ? '#706398' : '#FF0082';
                      const verdictBg = bf.verdict === 'Feasible' ? '#4B4C6A' : bf.verdict === 'Stretch' ? '#706398' : '#FF0082';
                      return (
                        <div style={{
                          marginBottom: '20px',
                          border: `2px solid ${verdictColor}`,
                          borderRadius: '8px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            padding: '14px 18px',
                            background: verdictBg,
                            color: '#FFFFFF'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '6px' }}>
                              <div>
                                <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85, marginBottom: '4px', fontWeight: 600 }}>
                                  Bid Feasibility · {bf.target_seats} seats · {bf.timeframe_days} days
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.1, fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                                  {bf.verdict}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85, marginBottom: '4px', fontWeight: 600 }}>
                                  Pace
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1, fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                                  {bf.seats_per_month_needed}<span style={{ fontSize: '11px', opacity: 0.75 }}>/mo</span>
                                </div>
                              </div>
                            </div>

                            {/* Math metrics row */}
                            {(bf.conversion_rate_used || bf.required_lead_volume || bf.pool_extraction_pct) && (
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                                gap: '8px',
                                marginTop: '12px',
                                paddingTop: '10px',
                                borderTop: '1px solid rgba(255,255,255,0.25)'
                              }}>
                                {bf.conversion_rate_used && (
                                  <div>
                                    <div style={{ fontSize: '9px', opacity: 0.85, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                      Conversion
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                                      {(bf.conversion_rate_used * 100).toFixed(1)}%
                                    </div>
                                    <div style={{ fontSize: '8px', opacity: 0.7, letterSpacing: '0.03em' }}>
                                      leads → hire
                                    </div>
                                  </div>
                                )}
                                {bf.required_lead_volume && (
                                  <div>
                                    <div style={{ fontSize: '9px', opacity: 0.85, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                      Leads Needed
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                                      {Number(bf.required_lead_volume).toLocaleString()}
                                    </div>
                                    <div style={{ fontSize: '8px', opacity: 0.7, letterSpacing: '0.03em' }}>
                                      total sourced
                                    </div>
                                  </div>
                                )}
                                {bf.leads_per_month_needed && (
                                  <div>
                                    <div style={{ fontSize: '9px', opacity: 0.85, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                      Leads/Mo
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                                      {Number(bf.leads_per_month_needed).toLocaleString()}
                                    </div>
                                    <div style={{ fontSize: '8px', opacity: 0.7, letterSpacing: '0.03em' }}>
                                      sourcing pace
                                    </div>
                                  </div>
                                )}
                                {bf.pool_extraction_pct !== undefined && bf.pool_extraction_pct !== null && (
                                  <div>
                                    <div style={{ fontSize: '9px', opacity: 0.85, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                      Pool Extract
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                                      {typeof bf.pool_extraction_pct === 'number' ? `${bf.pool_extraction_pct.toFixed(0)}%` : bf.pool_extraction_pct}
                                    </div>
                                    <div style={{ fontSize: '8px', opacity: 0.7, letterSpacing: '0.03em' }}>
                                      of addressable
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            <div style={{ fontSize: '12px', opacity: 0.95, lineHeight: 1.5, marginTop: '12px' }}>
                              {bf.rationale}
                            </div>
                          </div>
                          {bf.recommended_action && (
                            <div style={{
                              padding: '10px 18px',
                              background: '#FFFFFF',
                              borderTop: `1px solid ${verdictColor}`,
                              fontSize: '12px',
                              color: '#414141',
                              lineHeight: 1.5
                            }}>
                              <span style={{ fontWeight: 700, color: verdictColor, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px', marginRight: '6px' }}>
                                ACTION →
                              </span>
                              {bf.recommended_action}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* FUNNEL: Native Foreign + Local Bilingual (side by side or stacked) */}
                    {(analysis.talent_map.funnel_native_foreign?.applicable || analysis.talent_map.funnel_local_bilingual?.applicable) && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '12px' }}>
                          <Users size={13} color="#4B4C6A" />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                            Public-Source Talent Funnel
                          </span>
                        </div>

                        <div style={{
                          padding: '10px 12px',
                          background: '#E2DFE8',
                          borderLeft: '3px solid #706398',
                          borderRadius: '4px',
                          fontSize: '10px',
                          color: '#414141',
                          marginBottom: '12px',
                          lineHeight: 1.5
                        }}>
                          <div style={{ fontStyle: 'italic', marginBottom: '6px' }}>
                            Each row cites a public source and is tagged by confidence tier. Sales/BD can defend or challenge the math row-by-row in front of clients.
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', fontSize: '9px' }}>
                            <span style={{ fontWeight: 700, color: '#706398', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend:</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ padding: '1px 6px', background: '#E2DFE8', color: '#4B4C6A', border: '1px solid #4B4C6A40', borderRadius: '3px', fontWeight: 700, fontSize: '8px', letterSpacing: '0.05em' }}>VERIFIED</span>
                              <span style={{ color: '#414141' }}>= published in a specific report</span>
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ padding: '1px 6px', background: '#E2DFE8', color: '#706398', border: '1px solid #70639840', borderRadius: '3px', fontWeight: 700, fontSize: '8px', letterSpacing: '0.05em' }}>ESTIMATED</span>
                              <span style={{ color: '#414141' }}>= applied demographic norm</span>
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ padding: '1px 6px', background: '#ECE9E7', color: '#918E81', border: '1px solid #918E8140', borderRadius: '3px', fontWeight: 700, fontSize: '8px', letterSpacing: '0.05em' }}>ASSUMPTION</span>
                              <span style={{ color: '#414141' }}>= industry rule of thumb</span>
                            </span>
                          </div>
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: analysis.talent_map.funnel_native_foreign?.applicable && analysis.talent_map.funnel_local_bilingual?.applicable ? '1fr 1fr' : '1fr',
                          gap: '12px'
                        }}>
                          {[
                            { key: 'funnel_native_foreign', accent: '#FF0082', label: 'Native Foreign' },
                            { key: 'funnel_local_bilingual', accent: '#706398', label: 'Local Bilingual' }
                          ].map(f => {
                            const funnel = analysis.talent_map[f.key];
                            if (!funnel?.applicable) return null;
                            return (
                              <div key={f.key} style={{
                                background: '#FFFFFF',
                                border: `1px solid #CCCCCC`,
                                borderTop: `3px solid ${f.accent}`,
                                borderRadius: '6px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  padding: '10px 14px',
                                  background: '#ECE9E7',
                                  borderBottom: '1px solid #CCCCCC'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '9px', fontWeight: 700, color: f.accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>
                                        {f.label}
                                      </div>
                                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#414141' }}>
                                        {funnel.title}
                                      </div>
                                    </div>
                                    {funnel.confidence && (() => {
                                      const c = funnel.confidence;
                                      const cBg = c === 'High' ? '#4B4C6A' : c === 'Medium' ? '#706398' : '#FF0082';
                                      return (
                                        <span style={{
                                          fontSize: '9px',
                                          padding: '3px 8px',
                                          background: cBg,
                                          color: '#FFFFFF',
                                          borderRadius: '3px',
                                          fontWeight: 700,
                                          letterSpacing: '0.05em',
                                          textTransform: 'uppercase',
                                          flexShrink: 0,
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {c} Conf.
                                        </span>
                                      );
                                    })()}
                                  </div>
                                  {funnel.confidence_note && (
                                    <div style={{ fontSize: '10px', color: '#676767', fontStyle: 'italic', lineHeight: 1.4, marginTop: '6px' }}>
                                      {funnel.confidence_note}
                                    </div>
                                  )}
                                </div>

                                {/* Funnel rows */}
                                <div style={{ padding: '8px 14px' }}>
                                  {funnel.rows?.map((row, i) => {
                                    // Per-row confidence chip styling
                                    const rc = row.confidence || 'Estimated';
                                    const chipColor = rc === 'Verified' ? '#4B4C6A' : rc === 'Estimated' ? '#706398' : '#918E81';
                                    const chipBg = rc === 'Verified' ? '#E2DFE8' : rc === 'Estimated' ? '#E2DFE8' : '#ECE9E7';
                                    return (
                                    <div key={i} style={{
                                      padding: '8px 0',
                                      borderBottom: i < funnel.rows.length - 1 ? '1px dashed #ECE9E7' : 'none'
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                                        <div style={{ fontSize: '11px', color: '#414141', flex: 1, lineHeight: 1.4 }}>
                                          {row.label}
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#4B4C6A', flexShrink: 0, fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                                          {typeof row.value === 'number' ? row.value.toLocaleString() : row.value}
                                        </div>
                                      </div>
                                      {/* Per-row confidence chip */}
                                      <div style={{ marginBottom: '4px' }}>
                                        <span style={{
                                          fontSize: '8px',
                                          padding: '1px 6px',
                                          background: chipBg,
                                          color: chipColor,
                                          borderRadius: '3px',
                                          fontWeight: 700,
                                          letterSpacing: '0.05em',
                                          textTransform: 'uppercase',
                                          border: `1px solid ${chipColor}40`
                                        }}>
                                          {rc}
                                        </span>
                                      </div>
                                      {row.assumption_note && (
                                        <div style={{ fontSize: '9px', color: '#706398', fontStyle: 'italic', lineHeight: 1.4, marginTop: '2px' }}>
                                          × {row.assumption_note}
                                        </div>
                                      )}
                                      {row.source && (
                                        <div style={{ fontSize: '9px', color: '#676767', lineHeight: 1.4, marginTop: '2px' }}>
                                          ◦ {row.source}
                                        </div>
                                      )}
                                    </div>
                                    );
                                  })}
                                </div>

                                {/* Footer totals */}
                                <div style={{
                                  padding: '10px 14px',
                                  background: f.accent,
                                  color: '#FFFFFF',
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: '8px'
                                }}>
                                  <div>
                                    <div style={{ fontSize: '9px', opacity: 0.85, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                      Addressable Pool
                                    </div>
                                    <div style={{ fontSize: '17px', fontWeight: 700, fontFamily: '"TP Sans", "Inter", Calibri, sans-serif', lineHeight: 1.1 }}>
                                      {typeof funnel.final_addressable_pool === 'number' ? funnel.final_addressable_pool.toLocaleString() : funnel.final_addressable_pool}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '9px', opacity: 0.85, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                      Active Now
                                    </div>
                                    <div style={{ fontSize: '17px', fontWeight: 700, fontFamily: '"TP Sans", "Inter", Calibri, sans-serif', lineHeight: 1.1 }}>
                                      {typeof funnel.final_active_pool === 'number' ? funnel.final_active_pool.toLocaleString() : funnel.final_active_pool}
                                    </div>
                                  </div>
                                </div>

                                {funnel.summary_note && (
                                  <div style={{
                                    padding: '8px 14px',
                                    fontSize: '10px',
                                    color: '#414141',
                                    lineHeight: 1.5,
                                    fontStyle: 'italic',
                                    background: '#ECE9E7'
                                  }}>
                                    {funnel.summary_note}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Search URLs - The Money Shot */}
                    {analysis.talent_map.search_urls?.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '12px' }}>
                          <ExternalLink size={13} color="#4B4C6A" />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                            Ready-to-Click Search URLs
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {analysis.talent_map.search_urls.map((u, i) => (
                            <a
                              key={i}
                              href={u.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 14px',
                                background: '#FFFFFF',
                                border: '1px solid #CCCCCC',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                color: '#414141',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4B4C6A'; e.currentTarget.style.background = '#ECE9E7'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CCCCCC'; e.currentTarget.style.background = '#FFFFFF'; }}
                            >
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                background: '#4B4C6A',
                                color: '#FFFFFF',
                                borderRadius: '3px',
                                letterSpacing: '0.03em',
                                flexShrink: 0,
                                whiteSpace: 'nowrap',
                                fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                              }}>
                                {u.platform}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#414141', marginBottom: '2px' }}>
                                  {u.label}
                                </div>
                                {u.note && (
                                  <div style={{ fontSize: '10px', color: '#676767' }}>
                                    {u.note}
                                  </div>
                                )}
                              </div>
                              <ExternalLink size={14} color="#706398" style={{ flexShrink: 0 }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Boolean Search Strings */}
                    {analysis.talent_map.boolean_strings?.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '12px' }}>
                          <Code size={13} color="#4B4C6A" />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                            Boolean Search Strings
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {analysis.talent_map.boolean_strings.map((bs, i) => (
                            <div key={i} style={{
                              padding: '10px 12px',
                              background: '#414141',
                              borderRadius: '6px',
                              color: '#FFFFFF'
                            }}>
                              <div style={{ fontSize: '10px', fontWeight: 600, color: '#C2C7CD', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                {bs.label}
                              </div>
                              <div style={{
                                fontSize: '12px',
                                fontFamily: 'ui-monospace, "SF Mono", Monaco, monospace',
                                color: '#FFFFFF',
                                lineHeight: 1.5,
                                wordBreak: 'break-word'
                              }}>
                                {bs.string}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Supply Signals */}
                    {analysis.talent_map.supply_signals?.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '12px' }}>
                          <BarChart3 size={13} color="#4B4C6A" />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                            Supply Signals
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {analysis.talent_map.supply_signals.map((s, i) => (
                            <div key={i} style={{
                              padding: '10px 12px',
                              background: '#FFFFFF',
                              border: '1px solid #CCCCCC',
                              borderRadius: '6px',
                              display: 'grid',
                              gridTemplateColumns: '110px 1fr',
                              gap: '10px',
                              alignItems: 'center'
                            }}>
                              <span style={{
                                fontSize: '9px',
                                padding: '3px 6px',
                                background: '#E2DFE8',
                                color: '#706398',
                                borderRadius: '3px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                                textAlign: 'center',
                                fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                              }}>
                                {s.source_type}
                              </span>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#414141', marginBottom: '2px', lineHeight: 1.4 }}>
                                  {s.signal}
                                </div>
                                {s.implication && (
                                  <div style={{ fontSize: '10px', color: '#676767', fontStyle: 'italic', lineHeight: 1.4 }}>
                                    → {s.implication}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Competitor Demand */}
                    {analysis.talent_map.competitor_demand?.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '12px' }}>
                          <Building2 size={13} color="#4B4C6A" />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                            Competitor Hiring Activity
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {analysis.talent_map.competitor_demand.map((c, i) => (
                            <div key={i} style={{
                              padding: '10px 12px',
                              background: '#FFFFFF',
                              border: '1px solid #CCCCCC',
                              borderRadius: '6px',
                              display: 'grid',
                              gridTemplateColumns: 'auto auto 1fr',
                              gap: '12px',
                              alignItems: 'center'
                            }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#4B4C6A' }}>
                                {c.company}
                              </span>
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 8px',
                                background: c.open_roles_estimate?.toLowerCase().includes('high') ? '#FFE5F2' : c.open_roles_estimate?.toLowerCase().includes('medium') ? '#E2DFE8' : '#ECE9E7',
                                color: c.open_roles_estimate?.toLowerCase().includes('high') ? '#FF0082' : c.open_roles_estimate?.toLowerCase().includes('medium') ? '#706398' : '#676767',
                                borderRadius: '3px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                                fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                              }}>
                                {c.open_roles_estimate}
                              </span>
                              {c.implication && (
                                <span style={{ fontSize: '11px', color: '#676767', fontStyle: 'italic' }}>
                                  → {c.implication}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tactical Recommendations */}
                    {analysis.talent_map.sourcing_recommendations?.length > 0 && (
                      <div style={{
                        padding: '14px',
                        background: '#ECE9E7',
                        borderRadius: '6px',
                        borderLeft: '3px solid #4B4C6A'
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#4B4C6A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                          Tactical Sourcing Recommendations
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#414141', lineHeight: 1.6 }}>
                          {analysis.talent_map.sourcing_recommendations.map((rec, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                  )}

                  {/* TAB: INTERVIEW Q&A */}
                  {activeTab === 'questions' && analysis.screening_questions && (
                  <>
                    {/* Phone Screening Section */}
                    {analysis.screening_questions.phone_screening?.length > 0 && (
                      <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '12px' }}>
                          <HelpCircle size={13} color="#4B4C6A" />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                            Phone Screening · TA Recruiter (15 min)
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {analysis.screening_questions.phone_screening.map((q, i) => (
                            <div key={i} style={{
                              padding: '14px',
                              background: '#FFFFFF',
                              border: '1px solid #CCCCCC',
                              borderRadius: '6px'
                            }}>
                              <div style={{ display: 'flex', gap: '10px', marginBottom: '6px', alignItems: 'flex-start' }}>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: '#FFFFFF',
                                  background: '#4B4C6A',
                                  padding: '2px 8px',
                                  borderRadius: '3px',
                                  flexShrink: 0,
                                  marginTop: '1px',
                                  fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                                }}>Q{i + 1}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#414141', lineHeight: 1.4, marginBottom: '4px' }}>
                                    {q.question}
                                  </div>
                                  {q.purpose && (
                                    <div style={{ fontSize: '11px', color: '#676767', fontStyle: 'italic', lineHeight: 1.4 }}>
                                      Purpose: {q.purpose}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {q.rubric && (
                                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '6px 10px', background: '#ECE9E7', borderRadius: '4px', borderLeft: '3px solid #4B4C6A' }}>
                                    <ThumbsUp size={11} color="#4B4C6A" style={{ flexShrink: 0, marginTop: '3px' }} />
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#4B4C6A', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '6px' }}>Good</span>
                                      <span style={{ fontSize: '11px', color: '#414141', lineHeight: 1.5 }}>{q.rubric.good}</span>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '6px 10px', background: '#ECE9E7', borderRadius: '4px', borderLeft: '3px solid #848DAD' }}>
                                    <Minus size={11} color="#848DAD" style={{ flexShrink: 0, marginTop: '3px' }} />
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#848DAD', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '6px' }}>Ok</span>
                                      <span style={{ fontSize: '11px', color: '#414141', lineHeight: 1.5 }}>{q.rubric.ok}</span>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '6px 10px', background: '#FFE5F2', borderRadius: '4px', borderLeft: '3px solid #FF0082' }}>
                                    <ThumbsDown size={11} color="#FF0082" style={{ flexShrink: 0, marginTop: '3px' }} />
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#FF0082', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '6px' }}>Bad</span>
                                      <span style={{ fontSize: '11px', color: '#414141', lineHeight: 1.5 }}>{q.rubric.bad}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Operational Interview Section */}
                    {analysis.screening_questions.operational_interview?.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '12px' }}>
                          <MessageSquare size={13} color="#706398" />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#706398', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                            Operational Interview · Ops Manager (45 min)
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {analysis.screening_questions.operational_interview.map((q, i) => (
                            <div key={i} style={{
                              padding: '14px',
                              background: '#FFFFFF',
                              border: '1px solid #CCCCCC',
                              borderRadius: '6px'
                            }}>
                              <div style={{ display: 'flex', gap: '10px', marginBottom: '6px', alignItems: 'flex-start' }}>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: '#FFFFFF',
                                  background: '#706398',
                                  padding: '2px 8px',
                                  borderRadius: '3px',
                                  flexShrink: 0,
                                  marginTop: '1px',
                                  fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                                }}>Q{i + 1}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#414141', lineHeight: 1.4, marginBottom: '4px' }}>
                                    {q.question}
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {q.type && (
                                      <span style={{
                                        fontSize: '9px',
                                        fontWeight: 700,
                                        color: '#706398',
                                        background: '#E2DFE8',
                                        padding: '2px 7px',
                                        borderRadius: '3px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                                      }}>{q.type}</span>
                                    )}
                                    {q.purpose && (
                                      <span style={{ fontSize: '11px', color: '#676767', fontStyle: 'italic', lineHeight: 1.4 }}>
                                        Purpose: {q.purpose}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {q.rubric && (
                                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '6px 10px', background: '#ECE9E7', borderRadius: '4px', borderLeft: '3px solid #4B4C6A' }}>
                                    <ThumbsUp size={11} color="#4B4C6A" style={{ flexShrink: 0, marginTop: '3px' }} />
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#4B4C6A', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '6px' }}>Good</span>
                                      <span style={{ fontSize: '11px', color: '#414141', lineHeight: 1.5 }}>{q.rubric.good}</span>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '6px 10px', background: '#ECE9E7', borderRadius: '4px', borderLeft: '3px solid #848DAD' }}>
                                    <Minus size={11} color="#848DAD" style={{ flexShrink: 0, marginTop: '3px' }} />
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#848DAD', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '6px' }}>Ok</span>
                                      <span style={{ fontSize: '11px', color: '#414141', lineHeight: 1.5 }}>{q.rubric.ok}</span>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '6px 10px', background: '#FFE5F2', borderRadius: '4px', borderLeft: '3px solid #FF0082' }}>
                                    <ThumbsDown size={11} color="#FF0082" style={{ flexShrink: 0, marginTop: '3px' }} />
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#FF0082', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '6px' }}>Bad</span>
                                      <span style={{ fontSize: '11px', color: '#414141', lineHeight: 1.5 }}>{q.rubric.bad}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                  )}

                  {/* TAB: RATIONALE */}
                  {activeTab === 'rationale' && (
                  <>

                  {/* Reasoning */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                      <Brain size={13} color="#4B4C6A" />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Reasoning
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#414141', margin: 0, lineHeight: 1.6 }}>
                      {analysis.reasoning}
                    </p>
                  </div>

                  {/* Key Indicators */}
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                      Key Indicators
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {analysis.key_indicators.map((indicator, i) => (
                        <span key={i} style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          background: '#FFFFFF',
                          border: '1px solid #CCCCCC',
                          borderRadius: '12px',
                          color: '#414141'
                        }}>
                          {indicator}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#FF0082', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                      Risk Factors
                    </span>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#414141', lineHeight: 1.6 }}>
                      {analysis.risk_factors.map((risk, i) => (
                        <li key={i} style={{ marginBottom: '4px' }}>{risk}</li>
                      ))}
                    </ul>
                  </div>

                  </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* ═══════════════ FIT MATCH MODE ═══════════════ */}
        {mode === 'fitmatch' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)', gap: '24px', alignItems: 'start' }}>

          {/* FIT MATCH INPUT PANEL */}
          <div>
            {/* Operational Context Panel - shared with Recommender */}
            <div style={{
              background: '#ECE9E7',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              border: '1px solid #D4D2CA'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                Operational Context
              </div>
              <div style={{ fontSize: '10px', color: '#706398', marginBottom: '12px', lineHeight: 1.5, fontStyle: 'italic' }}>
                Values entered here OVERRIDE anything mentioned in the JD or CV. Leave a field blank to use the JD's value.
              </div>

              {/* Country + City */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: '#676767', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', fontSize: '13px',
                      fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                      background: '#FFFFFF', border: '1px solid #CCCCCC', borderRadius: '6px',
                      color: '#414141', outline: 'none', cursor: 'pointer'
                    }}
                  >
                    <option value="">Select country...</option>
                    {Object.keys(APAC_LOCATIONS).map(c => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: '#676767', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                    City
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!country}
                    style={{
                      width: '100%', padding: '8px 10px', fontSize: '13px',
                      fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                      background: country ? '#FFFFFF' : '#ECE9E7',
                      border: '1px solid #CCCCCC', borderRadius: '6px',
                      color: country ? '#414141' : '#848DAD',
                      outline: 'none', cursor: country ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <option value="">{country ? 'Select city...' : 'Select country first'}</option>
                    {country && APAC_LOCATIONS[country].map(ct => (<option key={ct} value={ct}>{ct}</option>))}
                  </select>
                </div>
              </div>

              {/* Nationality */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '10px', fontWeight: 600, color: '#676767', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                  Nationality Preference
                </label>
                <select
                  value={nationalityType}
                  onChange={(e) => setNationalityType(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', fontSize: '13px',
                    fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                    background: '#FFFFFF', border: '1px solid #CCCCCC', borderRadius: '6px',
                    color: '#414141', outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="">Select nationality basis...</option>
                  {NATIONALITY_TYPES.map(n => (
                    <option key={n.value} value={n.value}>{n.label} — {n.description}</option>
                  ))}
                </select>
              </div>

              {/* Languages */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: '#676767', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                    Languages & CEFR (Max 3)
                  </label>
                  {languages.length < 3 && (
                    <button onClick={addLanguage} style={{
                      fontSize: '10px', padding: '3px 10px', background: '#4B4C6A', color: '#FFFFFF',
                      border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600,
                      letterSpacing: '0.03em', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                    }}>+ Add</button>
                  )}
                </div>
                {languages.map((lang, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 28px', gap: '8px',
                    marginBottom: i < languages.length - 1 ? '8px' : 0, alignItems: 'center'
                  }}>
                    <select value={lang.language} onChange={(e) => updateLanguage(i, 'language', e.target.value)}
                      style={{
                        width: '100%', padding: '8px 10px', fontSize: '12px',
                        fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                        background: '#FFFFFF', border: '1px solid #CCCCCC', borderRadius: '6px',
                        color: '#414141', outline: 'none', cursor: 'pointer'
                      }}>
                      <option value="">Select language...</option>
                      {APAC_LANGUAGES.map(l => (<option key={l} value={l}>{l}</option>))}
                    </select>
                    <select value={lang.cefr} onChange={(e) => updateLanguage(i, 'cefr', e.target.value)}
                      disabled={!lang.language}
                      style={{
                        width: '100%', padding: '8px 10px', fontSize: '12px',
                        fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                        background: lang.language ? '#FFFFFF' : '#ECE9E7',
                        border: '1px solid #CCCCCC', borderRadius: '6px',
                        color: lang.language ? '#414141' : '#848DAD',
                        outline: 'none', cursor: lang.language ? 'pointer' : 'not-allowed'
                      }}>
                      <option value="">CEFR level...</option>
                      {CEFR_LEVELS.map(lvl => (<option key={lvl.value} value={lvl.value}>{lvl.label}</option>))}
                    </select>
                    <button onClick={() => removeLanguage(i)}
                      disabled={languages.length === 1 && !lang.language && !lang.cefr}
                      style={{
                        width: '28px', height: '28px', padding: 0, background: 'transparent',
                        border: '1px solid #CCCCCC', borderRadius: '6px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#676767'
                      }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              background: '#ECE9E7',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid #D4D2CA'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                Three Documents Required
              </div>
              <div style={{ fontSize: '11px', color: '#676767', lineHeight: 1.5 }}>
                Upload PDF or DOCX files for each. All three are required to generate a fit-match verdict.
              </div>
            </div>

            {/* FILE INPUT CARDS */}
            {[
              { kind: 'jd', label: 'Job Description', icon: FileText, ref: jdInputRef, file: fmJDFile, processing: fmProcessing.jd, color: '#4B4C6A' },
              { kind: 'cv', label: 'Candidate CV / Resume', icon: Briefcase, ref: cvInputRef, file: fmCVFile, processing: fmProcessing.cv, color: '#706398' },
              { kind: 'hallo', label: 'Hallo.ai Assessment Result', icon: Activity, ref: halloInputRef, file: fmHalloFile, processing: fmProcessing.hallo, color: '#FF0082' }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.kind} style={{
                  background: '#FFFFFF',
                  border: `1px solid ${item.file ? item.color : '#CCCCCC'}`,
                  borderLeft: `4px solid ${item.color}`,
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '12px',
                  transition: 'all 0.15s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: item.file ? '10px' : '0' }}>
                    <Icon size={16} color={item.color} />
                    <div style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#414141' }}>
                      {item.label}
                    </div>
                    {!item.file && !item.processing && (
                      <button
                        onClick={() => item.ref.current?.click()}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          background: item.color,
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '5px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                        }}
                      >
                        <Upload size={11} /> Upload
                      </button>
                    )}
                    {item.processing && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#676767' }}>
                        <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        Extracting...
                      </div>
                    )}
                  </div>
                  <input
                    ref={item.ref}
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={(e) => { const f = e.target.files[0]; if (f) processFitMatchFile(f, item.kind); }}
                    style={{ display: 'none' }}
                  />
                  {item.file && !item.processing && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      background: '#ECE9E7',
                      borderRadius: '5px',
                      fontSize: '11px',
                      color: '#414141'
                    }}>
                      <File size={12} color={item.color} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                        {item.file.name}
                      </span>
                      <span style={{ fontSize: '10px', color: '#676767', flexShrink: 0 }}>
                        {formatFileSize(item.file.size)}
                      </span>
                      <button
                        onClick={() => clearFitMatchFile(item.kind)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          color: '#676767',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={runFitMatch}
              disabled={fmLoading || !fmJDText || !fmCVText || !fmHalloText}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '14px 24px',
                background: fmLoading || !fmJDText || !fmCVText || !fmHalloText ? '#848DAD' : '#4B4C6A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: fmLoading || !fmJDText || !fmCVText || !fmHalloText ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: '"TP Sans", "Inter", Calibri, sans-serif',
                letterSpacing: '0.02em'
              }}
            >
              {fmLoading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Analyzing fit...
                </>
              ) : (
                <>
                  <UserCheck size={16} />
                  Run Fit Match Analysis
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {fmError && (
              <div style={{
                marginTop: '12px',
                padding: '12px 16px',
                background: '#FFE5F2',
                border: '1px solid #FFB3D5',
                borderRadius: '6px',
                color: '#FF0082',
                fontSize: '13px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                {fmError}
              </div>
            )}
          </div>

          {/* FIT MATCH OUTPUT PANEL */}
          <div>
            {!fmAnalysis && !fmLoading && (
              <div style={{
                padding: '60px 32px',
                background: '#FFFFFF',
                border: '1px dashed #CCCCCC',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <UserCheck size={32} color="#848DAD" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '14px', color: '#676767', margin: 0 }}>
                  Fit Match verdict will appear here
                </p>
                <p style={{ fontSize: '12px', color: '#848DAD', margin: '4px 0 0 0' }}>
                  Upload all three documents to begin
                </p>
              </div>
            )}

            {fmLoading && (
              <div style={{
                padding: '60px 32px',
                background: '#FFFFFF',
                border: '1px solid #CCCCCC',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <Loader2 size={28} color="#4B4C6A" style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: '13px', color: '#676767', margin: 0 }}>
                  Cross-referencing JD requirements with CV evidence and Hallo.ai scores...
                </p>
              </div>
            )}

            {fmAnalysis && (
              <div ref={fmOutputRef} style={{
                background: '#FFFFFF',
                border: '1px solid #CCCCCC',
                borderRadius: '8px',
                overflow: 'hidden',
                animation: 'fadeIn 0.4s ease-out'
              }}>
                {/* Verdict Banner */}
                {(() => {
                  const verdictColors = {
                    'Hire': { bg: '#4B4C6A', text: '#FFFFFF', accent: '#FFFFFF' },
                    'Hire with Training Plan': { bg: '#706398', text: '#FFFFFF', accent: '#FFFFFF' },
                    'Hold': { bg: '#918E81', text: '#FFFFFF', accent: '#FFFFFF' },
                    'Do Not Hire': { bg: '#FF0082', text: '#FFFFFF', accent: '#FFFFFF' }
                  };
                  const vc = verdictColors[fmAnalysis.verdict] || verdictColors['Hold'];
                  return (
                    <div style={{
                      padding: '20px 24px',
                      background: vc.bg,
                      color: vc.text
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.8, marginBottom: '4px', fontWeight: 600 }}>
                            Verdict · {fmAnalysis.confidence} Confidence
                          </div>
                          <div style={{ fontSize: '26px', fontWeight: 700, lineHeight: 1.1, fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                            {fmAnalysis.verdict}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.8, marginBottom: '4px', fontWeight: 600 }}>
                            Overall Fit
                          </div>
                          <div style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1, fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                            {fmAnalysis.overall_fit_score}<span style={{ fontSize: '14px', opacity: 0.7 }}>/100</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.95, lineHeight: 1.5, marginTop: '8px' }}>
                        {fmAnalysis.verdict_rationale}
                      </div>

                      {/* Score Band Indicator */}
                      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.25)' }}>
                        <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px', position: 'relative' }}>
                          <div style={{ flex: 35, background: 'rgba(255,255,255,0.25)' }} title="0-34: Do Not Hire" />
                          <div style={{ flex: 15, background: 'rgba(255,255,255,0.4)' }} title="35-49: Hold" />
                          <div style={{ flex: 25, background: 'rgba(255,255,255,0.6)' }} title="50-74: Hire with Training" />
                          <div style={{ flex: 25, background: 'rgba(255,255,255,0.9)' }} title="75-100: Hire" />
                          {/* Score marker */}
                          {(() => {
                            const score = Math.max(0, Math.min(100, fmAnalysis.overall_fit_score || 0));
                            return (
                              <div style={{
                                position: 'absolute',
                                left: `${score}%`,
                                top: '-3px',
                                width: '2px',
                                height: '14px',
                                background: '#FFFFFF',
                                boxShadow: '0 0 4px rgba(0,0,0,0.3)',
                                transform: 'translateX(-1px)'
                              }} />
                            );
                          })()}
                        </div>
                        <div style={{ display: 'flex', fontSize: '9px', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600, opacity: 0.85 }}>
                          <div style={{ flex: 35, textAlign: 'left' }}>0 · Do Not Hire</div>
                          <div style={{ flex: 15, textAlign: 'center' }}>35 · Hold</div>
                          <div style={{ flex: 25, textAlign: 'center' }}>50 · Hire + Train</div>
                          <div style={{ flex: 25, textAlign: 'right' }}>75 · Hire</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Action bar */}
                <div data-pdf-exclude style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid #CCCCCC',
                  background: '#ECE9E7',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ fontSize: '12px', color: '#414141', flex: 1, minWidth: 0 }}>
                    <strong style={{ color: '#4B4C6A' }}>{fmAnalysis.candidate_name}</strong> · {fmAnalysis.role_summary}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={copyFitMatchResults}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: fmCopied ? '#4B4C6A' : '#FFFFFF',
                        border: '1px solid #CCCCCC',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: fmCopied ? '#FFFFFF' : '#414141',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                      }}
                    >
                      {fmCopied ? <Check size={12} /> : <Copy size={12} />}
                      {fmCopied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={downloadFitMatchPDF}
                      disabled={fmDownloading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: fmDownloading ? '#848DAD' : '#4B4C6A',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#FFFFFF',
                        cursor: fmDownloading ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                      }}
                    >
                      {fmDownloading ? (
                        <>
                          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download size={12} />
                          Save as PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div style={{ padding: '20px' }}>
                  {/* Headline Metrics */}
                  {fmAnalysis.headline_metrics && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
                      {[
                        { label: 'Language', value: fmAnalysis.headline_metrics.language_match, icon: Languages },
                        { label: 'Experience', value: fmAnalysis.headline_metrics.experience_match, icon: Briefcase },
                        { label: 'Behavioral', value: fmAnalysis.headline_metrics.behavioral_match, icon: Heart },
                        { label: 'Cognitive', value: fmAnalysis.headline_metrics.cognitive_match, icon: Brain }
                      ].map((m, i) => {
                        const MIcon = m.icon;
                        return (
                          <div key={i} style={{
                            padding: '10px 12px',
                            background: '#ECE9E7',
                            borderRadius: '6px',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start'
                          }}>
                            <MIcon size={14} color="#4B4C6A" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '10px', fontWeight: 700, color: '#676767', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                                {m.label}
                              </div>
                              <div style={{ fontSize: '11px', color: '#414141', lineHeight: 1.4 }}>
                                {m.value}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TRAINABILITY — Highlighted special section */}
                  {fmAnalysis.dimensions?.trainability && (
                    <div style={{
                      marginBottom: '20px',
                      border: '2px solid #4B4C6A',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        padding: '12px 16px',
                        background: '#4B4C6A',
                        color: '#FFFFFF',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <GraduationCap size={16} />
                          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Trainability Analysis
                          </span>
                        </div>
                        {(() => {
                          const s = fmAnalysis.dimensions.trainability.score;
                          const scoreBg = s === 'Strong' ? '#ECE9E7' : s === 'Adequate' ? '#E2DFE8' : s === 'Gap' ? '#FFE5F2' : '#FFB3D5';
                          const scoreColor = s === 'Strong' ? '#4B4C6A' : s === 'Adequate' ? '#706398' : s === 'Gap' ? '#FF0082' : '#FF0082';
                          return (
                            <span style={{
                              fontSize: '10px',
                              padding: '3px 10px',
                              background: scoreBg,
                              color: scoreColor,
                              borderRadius: '3px',
                              fontWeight: 700,
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase'
                            }}>
                              {s}
                            </span>
                          );
                        })()}
                      </div>
                      <div style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '11px', color: '#414141', lineHeight: 1.5, marginBottom: '12px' }}>
                          <span style={{ fontWeight: 600, color: '#4B4C6A' }}>Evidence: </span>
                          {fmAnalysis.dimensions.trainability.evidence}
                        </div>

                        {/* Trainable Gaps */}
                        {fmAnalysis.dimensions.trainability.trainable_gaps?.length > 0 && (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#4B4C6A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                              Trainable Gaps
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {fmAnalysis.dimensions.trainability.trainable_gaps.map((g, i) => {
                                const costColor = g.cost_impact === 'High' ? '#FF0082' : g.cost_impact === 'Medium' ? '#706398' : '#4B4C6A';
                                return (
                                  <div key={i} style={{
                                    padding: '10px 12px',
                                    background: '#ECE9E7',
                                    borderLeft: `3px solid ${costColor}`,
                                    borderRadius: '4px'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#414141' }}>
                                        {g.gap}
                                      </span>
                                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                        <span style={{
                                          fontSize: '10px',
                                          padding: '2px 8px',
                                          background: '#4B4C6A',
                                          color: '#FFFFFF',
                                          borderRadius: '3px',
                                          fontWeight: 600
                                        }}>
                                          {g.training_duration}
                                        </span>
                                        <span style={{
                                          fontSize: '10px',
                                          padding: '2px 8px',
                                          background: costColor,
                                          color: '#FFFFFF',
                                          borderRadius: '3px',
                                          fontWeight: 600
                                        }}>
                                          {g.cost_impact}
                                        </span>
                                      </div>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#676767', marginBottom: '4px' }}>
                                      <span style={{ fontWeight: 600 }}>Method: </span>{g.training_type}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#414141', fontStyle: 'italic', lineHeight: 1.4 }}>
                                      {g.rationale}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Non-Trainable Concerns */}
                        {fmAnalysis.dimensions.trainability.non_trainable_concerns?.length > 0 && (
                          <div style={{
                            padding: '10px 12px',
                            background: '#FFE5F2',
                            borderLeft: '3px solid #FF0082',
                            borderRadius: '4px',
                            marginBottom: '8px'
                          }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#FF0082', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                              Non-Trainable Concerns
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#414141', lineHeight: 1.5 }}>
                              {fmAnalysis.dimensions.trainability.non_trainable_concerns.map((c, i) => (
                                <li key={i} style={{ marginBottom: '2px' }}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Training Plan Summary */}
                        {fmAnalysis.training_plan_summary && (
                          <div style={{
                            padding: '12px',
                            background: '#E2DFE8',
                            borderRadius: '6px',
                            marginTop: '8px'
                          }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#706398', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                              Training Plan Summary
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                              <div>
                                <div style={{ fontSize: '9px', fontWeight: 600, color: '#676767', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#4B4C6A' }}>{fmAnalysis.training_plan_summary.total_duration}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '9px', fontWeight: 600, color: '#676767', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#4B4C6A' }}>{fmAnalysis.training_plan_summary.total_cost_impact}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '9px', fontWeight: 600, color: '#676767', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time to Productive</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#4B4C6A' }}>{fmAnalysis.training_plan_summary.ramp_time_to_productive}</div>
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: '#414141', lineHeight: 1.5, paddingTop: '6px', borderTop: '1px solid #C2C7CD' }}>
                              {fmAnalysis.training_plan_summary.training_plan_summary_text}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* OTHER DIMENSIONS */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#4B4C6A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px', fontFamily: '"TP Sans", "Inter", Calibri, sans-serif' }}>
                      Dimension Breakdown
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { key: 'language_fit', label: 'Language Fit', icon: Languages },
                        { key: 'behavioral_fit', label: 'Behavioral Fit', icon: Heart },
                        { key: 'experience_match', label: 'Experience Match', icon: Briefcase },
                        { key: 'cultural_context', label: 'Cultural & Context Fit', icon: Building2 },
                        { key: 'cognitive_personality', label: 'Cognitive & Personality Headroom', icon: Brain }
                      ].map(dim => {
                        const d = fmAnalysis.dimensions?.[dim.key];
                        if (!d) return null;
                        const DIcon = dim.icon;
                        const scoreColor = d.score === 'Strong' ? '#4B4C6A' : d.score === 'Adequate' ? '#706398' : d.score === 'Gap' ? '#918E81' : '#FF0082';
                        const scoreBg = d.score === 'Strong' ? '#ECE9E7' : d.score === 'Adequate' ? '#E2DFE8' : d.score === 'Gap' ? '#D4D2CA' : '#FFE5F2';
                        const gapColor = d.gap_type === 'None' ? '#4B4C6A' : d.gap_type === 'Highly Trainable' ? '#706398' : d.gap_type === 'Moderately Trainable' ? '#918E81' : '#FF0082';

                        return (
                          <div key={dim.key} style={{
                            padding: '12px 14px',
                            background: '#FFFFFF',
                            border: '1px solid #CCCCCC',
                            borderLeft: `4px solid ${scoreColor}`,
                            borderRadius: '6px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                                <DIcon size={14} color={scoreColor} />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#414141' }}>
                                  {dim.label}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 8px',
                                  background: scoreBg,
                                  color: scoreColor,
                                  borderRadius: '3px',
                                  fontWeight: 700,
                                  letterSpacing: '0.03em',
                                  textTransform: 'uppercase'
                                }}>
                                  {d.score}
                                </span>
                                {d.gap_type && d.gap_type !== 'None' && (
                                  <span style={{
                                    fontSize: '10px',
                                    padding: '2px 8px',
                                    background: '#FFFFFF',
                                    color: gapColor,
                                    border: `1px solid ${gapColor}`,
                                    borderRadius: '3px',
                                    fontWeight: 600
                                  }}>
                                    {d.gap_type}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: '#676767', lineHeight: 1.5, marginBottom: '4px' }}>
                              <span style={{ fontWeight: 600, color: '#4B4C6A' }}>Evidence: </span>
                              {d.evidence}
                            </div>
                            {d.sub_scores?.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '6px 0' }}>
                                {d.sub_scores.map((s, i) => (
                                  <span key={i} style={{
                                    fontSize: '10px',
                                    padding: '2px 8px',
                                    background: s.status === 'Strong' ? '#ECE9E7' : s.status === 'Adequate' ? '#E2DFE8' : '#FFE5F2',
                                    color: s.status === 'Strong' ? '#4B4C6A' : s.status === 'Adequate' ? '#706398' : '#FF0082',
                                    borderRadius: '3px',
                                    fontWeight: 500
                                  }}>
                                    {s.dimension}: {s.candidate_score} / {s.required}
                                  </span>
                                ))}
                              </div>
                            )}
                            {dim.key === 'experience_match' && (d.tenure_signal || d.company_relevance) && (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '6px 0' }}>
                                {d.tenure_signal && (
                                  <span style={{ fontSize: '10px', padding: '2px 8px', background: '#ECE9E7', color: '#414141', borderRadius: '3px', fontWeight: 500 }}>
                                    Tenure: {d.tenure_signal}
                                  </span>
                                )}
                                {d.company_relevance && (
                                  <span style={{ fontSize: '10px', padding: '2px 8px', background: '#ECE9E7', color: '#414141', borderRadius: '3px', fontWeight: 500 }}>
                                    Relevance: {d.company_relevance}
                                  </span>
                                )}
                              </div>
                            )}
                            <div style={{ fontSize: '11px', color: '#414141', fontStyle: 'italic', lineHeight: 1.5, paddingTop: '4px', borderTop: '1px solid #ECE9E7' }}>
                              <span style={{ fontWeight: 600, fontStyle: 'normal', color: '#4B4C6A' }}>→ </span>
                              {d.recommendation}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Green & Red Flags */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {fmAnalysis.green_flags?.length > 0 && (
                      <div style={{
                        padding: '12px',
                        background: '#ECE9E7',
                        borderLeft: '3px solid #4B4C6A',
                        borderRadius: '4px'
                      }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                          <ThumbsUp size={12} color="#4B4C6A" />
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#4B4C6A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Green Flags
                          </span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#414141', lineHeight: 1.5 }}>
                          {fmAnalysis.green_flags.map((f, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {fmAnalysis.red_flags?.length > 0 && (
                      <div style={{
                        padding: '12px',
                        background: '#FFE5F2',
                        borderLeft: '3px solid #FF0082',
                        borderRadius: '4px'
                      }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                          <ThumbsDown size={12} color="#FF0082" />
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#FF0082', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Red Flags
                          </span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#414141', lineHeight: 1.5 }}>
                          {fmAnalysis.red_flags.map((f, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* ═══════════════ SETTINGS MODAL ═══════════════ */}
        {showSettings && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(75, 76, 106, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
            onClick={(e) => { if (e.target === e.currentTarget && apiKey) setShowSettings(false); }}
          >
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
              fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #ECE9E7',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Key size={18} color="#4B4C6A" />
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#4B4C6A' }}>
                      Anthropic API Key
                    </div>
                    <div style={{ fontSize: '11px', color: '#676767', marginTop: '2px' }}>
                      Required to run analyses
                    </div>
                  </div>
                </div>
                {apiKey && (
                  <button
                    onClick={() => setShowSettings(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: '#676767',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px 24px' }}>
                <div style={{
                  padding: '12px 14px',
                  background: '#E2DFE8',
                  borderLeft: '3px solid #706398',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  color: '#414141',
                  lineHeight: 1.55
                }}>
                  <strong style={{ color: '#4B4C6A' }}>How this works:</strong> Each user provides their own Anthropic API key.
                  The key is stored ONLY in your browser's localStorage — it never goes to TP servers, and your usage
                  is billed to your own Anthropic account at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color: '#706398', fontWeight: 600 }}>console.anthropic.com</a>.
                </div>

                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#4B4C6A',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginBottom: '6px'
                }}>
                  API Key
                </label>
                <div style={{ position: 'relative', marginBottom: '6px' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 12px',
                      fontSize: '13px',
                      fontFamily: 'ui-monospace, "SF Mono", Monaco, monospace',
                      background: '#FFFFFF',
                      border: '1px solid #CCCCCC',
                      borderRadius: '6px',
                      color: '#414141',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4B4C6A'}
                    onBlur={(e) => e.target.style.borderColor = '#CCCCCC'}
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    type="button"
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: '#676767',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div style={{ fontSize: '10px', color: '#676767', marginBottom: '20px', lineHeight: 1.5 }}>
                  Don't have a key? Get one at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#706398', fontWeight: 600 }}>console.anthropic.com/settings/keys</a>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  {apiKey && (
                    <button
                      onClick={clearApiKey}
                      style={{
                        padding: '9px 16px',
                        background: '#FFFFFF',
                        color: '#FF0082',
                        border: '1px solid #FFB3D5',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                      }}
                    >
                      Clear Key
                    </button>
                  )}
                  <button
                    onClick={saveApiKey}
                    disabled={!apiKeyInput.trim() || keySaved}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 18px',
                      background: keySaved ? '#706398' : (apiKeyInput.trim() ? '#4B4C6A' : '#848DAD'),
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: apiKeyInput.trim() && !keySaved ? 'pointer' : 'not-allowed',
                      fontFamily: '"TP Sans", "Inter", Calibri, sans-serif'
                    }}
                  >
                    {keySaved ? <><Check size={13} /> Saved</> : 'Save Key'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          paddingTop: '20px',
          borderTop: '1px solid #CCCCCC',
          fontSize: '11px',
          color: '#848DAD',
          textAlign: 'center'
        }}>
          Hallo.ai CEFR methodology · 70+ languages · Floor/Ceiling rating · Salary benchmarks from JobStreet, LinkedIn, Glassdoor, JobsDB (external advertised rates)
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          [style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
