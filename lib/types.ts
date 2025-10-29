import { z } from 'zod'

export const employmentTypeEnum = z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT'])
export const locationTypeEnum = z.enum(['ONSITE', 'REMOTE', 'HYBRID'])
export const degreeEnum = z.enum(['HIGH_SCHOOL', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE'])
export const languageLevelEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'NATIVE'])

export const resumeJsonSchema = z.object({
	profile: z.object({
		name: z.string(),
		surname: z.string(),
		email: z.string().email(),
		headline: z.string().optional().default(''),
		professionalSummary: z.string().optional().default(''),
		linkedIn: z.string().url().optional().default(''),
		website: z.string().url().optional().default(''),
		country: z.string().optional().default(''),
		city: z.string().optional().default(''),
		relocation: z.boolean().optional().default(false),
		remote: z.boolean().optional().default(true)
	}),
	workExperiences: z
		.array(
			z.object({
				jobTitle: z.string(),
				employmentType: employmentTypeEnum,
				locationType: locationTypeEnum,
				company: z.string(),
				startMonth: z.number().int().min(1).max(12).optional().nullable(),
				startYear: z.number().int().min(1900).max(2100).optional().nullable(),
				endMonth: z.number().int().min(1).max(12).optional().nullable(),
				endYear: z.number().int().min(1900).max(2100).optional().nullable(),
				current: z.boolean().optional().default(false),
				description: z.string().optional().default('')
			})
		)
		.optional()
		.default([]),
	educations: z
		.array(
			z.object({
				school: z.string(),
				degree: degreeEnum,
				major: z.string(),
				startYear: z.number().int().min(1900).max(2100).optional().nullable(),
				endYear: z.number().int().min(1900).max(2100).optional().nullable(),
				current: z.boolean().optional().default(false),
				description: z.string().optional().default('')
			})
		)
		.optional()
		.default([]),
	skills: z.array(z.string()).optional().default([]),
	licenses: z
		.array(
			z.object({
				name: z.string(),
				issuer: z.string(),
				issueYear: z.number().int().min(1900).max(2100).optional().nullable(),
				description: z.string().optional().default('')
			})
		)
		.optional()
		.default([]),
	languages: z
		.array(
			z.object({
				language: z.string(),
				level: languageLevelEnum
			})
		)
		.optional()
		.default([]),
	achievements: z
		.array(
			z.object({
				title: z.string(),
				organization: z.string(),
				achieveDate: z.string().optional().default(''),
				description: z.string().optional().default('')
			})
		)
		.optional()
		.default([]),
	publications: z
		.array(
			z.object({
				title: z.string(),
				publisher: z.string(),
				publicationDate: z.string().optional().default(''),
				publicationUrl: z.string().url().optional().default(''),
				description: z.string().optional().default('')
			})
		)
		.optional()
		.default([]),
	honors: z
		.array(
			z.object({
				title: z.string(),
				issuer: z.string(),
				issueMonth: z.number().int().min(1).max(12).optional().nullable(),
				issueYear: z.number().int().min(1900).max(2100).optional().nullable(),
				description: z.string().optional().default('')
			})
		)
		.optional()
		.default([])
})

export type ResumeJson = z.infer<typeof resumeJsonSchema>
