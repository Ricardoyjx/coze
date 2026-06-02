export interface JobDescription {
  id: string
  title: string
  content: string
  keywords: string
  createdAt: string
}

export interface Resume {
  id: string
  filename: string
  name: string
  phone: string
  email: string
  education: string
  workYears: number
  skills: string[]
  experience: string
  uploadedAt: string
}

export interface ScreeningResult {
  id: string
  resume: Resume
  score: number
  matchPoints: string[]
  missingPoints: string[]
  recommendation: 'strong' | 'moderate' | 'weak'
  summary: string
}

export interface ScreeningTask {
  id: string
  jdTitle: string
  jdContent: string
  totalResumes: number
  processedResumes: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  results: ScreeningResult[]
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface WorkflowRun {
  runId: string
  status: 'running' | 'completed' | 'failed'
  output?: string
}
