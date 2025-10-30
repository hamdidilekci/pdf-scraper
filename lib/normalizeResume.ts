import { ResumeJson, employmentTypeEnum, locationTypeEnum, degreeEnum, languageLevelEnum } from '@/lib/types'

function coerceEnum<T extends readonly [string, ...string[]]>(value: any, allowed: T, fallback: T[number]): T[number] {
	if (typeof value !== 'string') return fallback
	const upper = value.replace(/\s+/g, '_').toUpperCase()
	return (allowed as readonly string[]).includes(upper) ? (upper as T[number]) : fallback
}

export function normalizeResume(json: any): ResumeJson {
	// Shallow normalization/coercion where helpful
	if (Array.isArray(json?.workExperiences)) {
		json.workExperiences = json.workExperiences.map((w: any) => ({
			...w,
			employmentType: coerceEnum(w?.employmentType, employmentTypeEnum.options, 'FULL_TIME'),
			locationType: coerceEnum(w?.locationType, locationTypeEnum.options, 'ONSITE')
		}))
	}

	if (Array.isArray(json?.educations)) {
		json.educations = json.educations.map((e: any) => ({
			...e,
			degree: coerceEnum(e?.degree, degreeEnum.options, 'BACHELOR')
		}))
	}

	if (Array.isArray(json?.languages)) {
		json.languages = json.languages.map((l: any) => ({
			...l,
			level: coerceEnum(l?.level, languageLevelEnum.options, 'INTERMEDIATE')
		}))
	}

	// Trim strings in common fields
	if (json?.profile) {
		for (const k of ['name', 'surname', 'email', 'headline', 'professionalSummary', 'linkedIn', 'website', 'country', 'city']) {
			if (typeof json.profile[k] === 'string') json.profile[k] = json.profile[k].trim()
		}
	}

	return json as ResumeJson
}
