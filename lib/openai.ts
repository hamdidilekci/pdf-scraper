import OpenAI from 'openai'
import { config } from './config'

export function getOpenAI() {
	return new OpenAI({ apiKey: config.openai.apiKey })
}
