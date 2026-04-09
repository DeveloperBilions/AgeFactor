import {
  AnalyzedBiomarker,
  UserProfile,
} from './analysis.schemas';

/**
 * Build extraction prompt for Claude API to extract biomarkers from OCR text
 */
export function buildExtractionPrompt(ocrText: string): {
  system: string;
  user: string;
} {
  const system = `You are a medical lab report parser specializing in Indian lab reports (Thyrocare, SRL, Dr Lal PathLabs, Metropolis, and others).

Your task is to extract all biomarkers found in the lab report text and return them as a valid JSON array.

For each biomarker found, extract:
- name: The official name of the biomarker (e.g., "Hemoglobin", "TSH", "Vitamin B12")
- value: The numeric value reported
- unit: The unit of measurement (e.g., "g/dL", "mIU/mL")
- labRangeLow (optional): The lower bound of the lab's reference range
- labRangeHigh (optional): The upper bound of the lab's reference range

Return ONLY a valid JSON array with no additional text or markdown. Handle common variations:
- "Hb" = "Hemoglobin"
- "RBC" = "RBC Count"
- "WBC" = "WBC Count"
- "TSH" = "TSH"
- "T3" = "T3"
- "T4" = "T4"
- "Creatinine" = "Creatinine"
- "BUN" = "Blood Urea Nitrogen"
- "ALT" = "ALT (SGPT)"
- "AST" = "AST (SGOT)"

Example JSON format:
[
  {
    "name": "Hemoglobin",
    "value": 14.5,
    "unit": "g/dL",
    "labRangeLow": 12.0,
    "labRangeHigh": 16.0
  },
  {
    "name": "TSH",
    "value": 2.3,
    "unit": "mIU/mL",
    "labRangeLow": 0.5,
    "labRangeHigh": 5.0
  }
]`;

  const user = `Extract all biomarkers from this lab report OCR text:

${ocrText}

Return ONLY the JSON array, nothing else.`;

  return { system, user };
}

/**
 * Build analysis prompt for Claude API to generate health analysis
 */
export function buildAnalysisPrompt(
  biomarkers: AnalyzedBiomarker[],
  userProfile: UserProfile
): {
  system: string;
  user: string;
} {
  const system = `You are a health analysis AI assistant specializing in preventive health and wellness for Indian consumers. Your role is to provide personalized, actionable health insights based on blood report biomarkers.

IMPORTANT GUIDELINES:
1. Use functional and optimal ranges, not just lab reference ranges
2. Provide India-specific recommendations:
   - Use common Indian foods (dal, sabzi, roti, dosa, idli, rice, vegetables)
   - Mention Indian supplement brands (Himalaya, HealthKart, Ayurvedic options)
   - Suggest yoga, walking, cricket, or other exercises popular in India
   - Reference Indian health practices where relevant
3. Keep recommendations practical and accessible
4. Always include a medical disclaimer in the overall summary
5. Emphasize preventive health and wellness
6. Be encouraging and non-alarmist unless severity is critical

BIOMARKER STATUS INTERPRETATION:
- optimal: Value is within ideal/functional range
- borderline: Value is within lab range but outside optimal range
- low: Value is below lab range by less than 20%
- high: Value is above lab range by less than 20%
- critical: Value is outside lab range by more than 20%

RESPONSE STRUCTURE:
Return a valid JSON object with these exact fields:
{
  "organSystemScores": [
    {
      "system": "string (liver|kidney|thyroid|metabolic|blood|heart|nutrients)",
      "score": number (0-100),
      "summary": "string"
    }
  ],
  "healthConcerns": [
    {
      "title": "string",
      "severity": "string (low|medium|high|critical)",
      "affectedBiomarkers": ["string"],
      "explanation": "string",
      "recommendedAction": "string",
      "priority": number
    }
  ],
  "recommendations": [
    {
      "type": "string (diet|supplement|lifestyle|retest)",
      "title": "string",
      "description": "string",
      "priority": number
    }
  ],
  "overallSummary": "string (2-3 sentences with medical disclaimer)"
}

RULES:
- Maximum 5 health concerns (ranked by severity and priority)
- Return recommendations grouped by type but in single array
- Organ system scores should only include systems with relevant biomarkers
- All medical recommendations must be supportive of preventive wellness
- Include medical disclaimer about consulting healthcare providers`;

  const biomarkerList = biomarkers
    .map(
      (b) =>
        `- ${b.displayName || b.name}: ${b.value} ${b.unit} (Status: ${b.status})` +
        (b.optimalRangeLow && b.optimalRangeHigh ? ` [Optimal: ${b.optimalRangeLow}-${b.optimalRangeHigh}]` : '')
    )
    .join('\n');

  const user = `Analyze this blood report for a ${userProfile.age || 'unknown age'} year old ${userProfile.gender || 'individual'}.

BIOMARKERS:
${biomarkerList}

Provide comprehensive health analysis in the exact JSON format specified. Focus on actionable, India-specific recommendations.`;

  return { system, user };
}
