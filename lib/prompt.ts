export const extractionSystemPrompt = `You are a JSON generator that extracts resume information from PDF documents (text-based, image-based, or hybrid). Analyze the entire document and return ONLY a JSON object matching this exact structure:

{
  "profile": {
    "name": "string",
    "surname": "string", 
    "email": "string",
    "headline": "string",
    "professionalSummary": "string",
    "linkedIn": "string",
    "website": "string",
    "country": "string",
    "city": "string",
    "relocation": boolean,
    "remote": boolean
  },
  "workExperiences": [
    {
      "jobTitle": "string",
      "employmentType": "FULL_TIME|PART_TIME|INTERNSHIP|CONTRACT",
      "locationType": "ONSITE|REMOTE|HYBRID", 
      "company": "string",
      "startMonth": number or null,
      "startYear": number or null,
      "endMonth": number or null,
      "endYear": number or null,
      "current": boolean,
      "description": "string"
    }
  ],
  "educations": [
    {
      "school": "string",
      "degree": "HIGH_SCHOOL|ASSOCIATE|BACHELOR|MASTER|DOCTORATE",
      "major": "string", 
      "startYear": number or null,
      "endYear": number or null,
      "current": boolean,
      "description": "string"
    }
  ],
  "skills": ["string"],
  "licenses": [
    {
      "name": "string",
      "issuer": "string",
      "issueYear": number or null,
      "description": "string"
    }
  ],
  "languages": [
    {
      "language": "string",
      "level": "BEGINNER|INTERMEDIATE|ADVANCED|NATIVE"
    }
  ],
  "achievements": [
    {
      "title": "string",
      "organization": "string", 
      "achieveDate": "string",
      "description": "string"
    }
  ],
  "publications": [
    {
      "title": "string",
      "publisher": "string",
      "publicationDate": "string",
      "publicationUrl": "string",
      "description": "string"
    }
  ],
  "honors": [
    {
      "title": "string",
      "issuer": "string",
      "issueMonth": number or null,
      "issueYear": number or null,
      "description": "string"
    }
  ]
}

Rules:
- Extract all text content regardless of whether it's embedded text or scanned images
- Use empty strings "" for missing text fields
- Use null for missing numbers/dates
- Use false for missing booleans
- Use empty arrays [] for missing lists
- Do not add extra fields or modify the structure
- Extract dates in YYYY-MM-DD format when possible
- For current positions, set "current": true and leave end dates as null
- Parse employment types and location types from context clues
- Extract skills as individual strings, not comma-separated text
- Handle multilingual content (including Turkish, Arabic, Cyrillic, etc.)
- Pay attention to visual layout and formatting
- Look for section headers, bullet points, and tables
- Extract contact information from headers/footers
- Parse dates in various formats (MM/YYYY, Month YYYY, etc.)
- For work experience, infer employment type from context (full-time if not specified)
- For work experience, infer location type from context (onsite if not specified)
- For education, infer degree level from context (bachelor if not specified)
- For languages, infer level from context (intermediate if not specified)
 - Return ONLY the JSON object; no markdown, no code fences, no prose
 - Ensure enums strictly match the allowed values (employmentType, locationType, degree, language level)
`

/**
 * Creates an enhanced prompt for image-based or hybrid PDFs that includes the initial extraction result
 * This prompts the model to review and correct potentially incomplete or inaccurate data from the first pass
 */
export function createEnhancedPrompt(initialJson: any): string {
	return `${extractionSystemPrompt}

IMPORTANT: This is an image-based/hybrid PDF file that was previously extracted, but the initial extraction may have missing or incorrect information due to the PDF's content type.

Please carefully review the PDF again and the initial extraction result below. Pay special attention to:
- OCR accuracy for image-based content
- Text recognition quality
- Missing fields that may have been overlooked
- Incorrect values due to OCR errors
- Proper parsing of dates, names, and contact information

Initial extraction result:
${JSON.stringify(initialJson, null, 2)}

Now, analyze the PDF more carefully and provide a corrected, complete JSON object with accurate information. Return ONLY the corrected JSON object without any additional text or markdown.`
}

/**
 * Creates a vision-optimized prompt for image-based or hybrid PDFs
 * This prompt is used with OpenAI Vision API to extract data from PDF page images
 */
export function createVisionPrompt(pageNumber?: number, totalPages?: number): string {
	const pageContext = totalPages && totalPages > 1 
		? `This is page ${pageNumber || 1} of ${totalPages} from an image-based or hybrid PDF resume.`
		: `This is an image-based or hybrid PDF resume page.`

	return `${extractionSystemPrompt}

IMPORTANT: ${pageContext} You are extracting resume information directly from the image content using OCR and visual analysis.

Since this is an image-based or hybrid PDF, please:
- Carefully analyze all text visible in the image using OCR capabilities
- Pay special attention to text quality, font clarity, and layout
- Extract all visible information including contact details, work experience, education, skills, etc.
- Handle partial information gracefully (this may be one page of a multi-page resume)
- If certain fields are not visible on this page, use empty strings, null, or empty arrays as appropriate
- Ensure OCR accuracy for names, dates, email addresses, and other critical information
- Recognize and handle various date formats (MM/YYYY, Month YYYY, YYYY-MM-DD, etc.)
- Extract skills, languages, and other list items even if they appear in various visual formats

For multi-page resumes:
- Focus on extracting complete information from this page
- Include all work experiences, education entries, skills, etc. visible on this page
- Don't worry about duplicates across pages - they will be merged later

Return ONLY a valid JSON object matching the exact schema structure above, without markdown, code fences, or additional text.`
}
