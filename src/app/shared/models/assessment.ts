import { Protocol } from './protocol'
import { Question } from './question'
import { MultiLanguageText } from './text'

export interface Assessment {
  questionnaire?: QuestionnaireMetadata
  estimatedCompletionTime?: number
  name: string
  protocol: Protocol
  startText?: MultiLanguageText
  endText?: MultiLanguageText
  warn?: MultiLanguageText
  showIntroduction?: boolean | ShowIntroductionType
  isDemo?: boolean
  questions: Question[]
  showInCalendar?: boolean
  order?: number
}

export interface QuestionnaireMetadata {
  repository?: string
  name: string
  avsc: string
  type?: string
  format?: string
  icon?: IconMetaData
}

export interface IconMetaData {
  name: string
  value: string
  type: string
  fallbackOption?: IconMetaData
}

export enum ShowIntroductionType {
  ALWAYS = 'always',
  ONCE = 'once',
  NEVER = 'never'
}
