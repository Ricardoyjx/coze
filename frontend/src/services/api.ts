import axios from 'axios'
import type { ScreeningTask, WorkflowRun } from '../types'

const api = axios.create({
  baseURL: '/api',
  timeout: 300000,
})

// ====== JD生成相关 API ======

/** 发送JD生成聊天消息（SSE流式返回） */
export async function streamJDGeneration(
  message: string,
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
  onError?: (err: Error) => void,
) {
  try {
    const response = await fetch('/api/jd/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    if (!reader) throw new Error('No reader available')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })

      // Backend may send full accumulated text (Coze SSE events) or
      // incremental deltas (mock chars). Compute delta to avoid doubling.
      if (text.length > fullText.length) {
        // Accumulated format: text contains the full response so far
        const delta = text.slice(fullText.length)
        if (delta) onChunk(delta)
        fullText = text
      } else {
        fullText += text
        onChunk(text)
      }
    }

    onDone(fullText)
  } catch (err) {
    onError?.(err as Error)
  }
}

/** 获取已保存的JD列表 */
export async function fetchJDList() {
  const res = await api.get('/jd/list')
  return res.data
}

// ====== 简历初筛相关 API ======

/** 上传简历文件 */
export async function uploadResumes(files: File[]) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  const res = await api.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

/** 启动简历初筛任务 */
export async function startScreening(jdContent: string, resumeIds: string[]) {
  const res = await api.post('/resume/screen', { jdContent, resumeIds })
  return res.data as ScreeningTask
}

/** 查询初筛任务状态 */
export async function getScreeningTask(taskId: string) {
  const res = await api.get(`/resume/screen/${taskId}`)
  return res.data as ScreeningTask
}

/** SSE流式获取初筛进度 */
export function streamScreeningProgress(
  taskId: string,
  onProgress: (task: ScreeningTask) => void,
  onDone: (task: ScreeningTask) => void,
  onError?: (err: Error) => void,
) {
  const eventSource = new EventSource(`/api/resume/screen/${taskId}/stream`)

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.status === 'completed') {
        onDone(data)
        eventSource.close()
      } else {
        onProgress(data)
      }
    } catch {
      // plain text progress
    }
  }

  eventSource.onerror = () => {
    onError?.(new Error('SSE connection failed'))
    eventSource.close()
  }

  return () => eventSource.close()
}

/** 获取历史任务列表 */
export async function fetchHistory() {
  const res = await api.get('/history')
  return res.data as ScreeningTask[]
}

export default api

// ====== Offer邮件相关 API ======

/** 流式生成Offer邮件 */
export async function streamOfferEmail(
  data: {
    candidateName: string
    position: string
    salary: string
    startDate: string
    location: string
    notes?: string
    companyName?: string
  },
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
  onError?: (err: Error) => void,
) {
  try {
    const response = await fetch('/api/offer-email/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_name: data.candidateName,
        position: data.position,
        salary: data.salary,
        start_date: data.startDate,
        location: data.location,
        notes: data.notes || '',
        company_name: data.companyName || '',
      }),
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    if (!reader) throw new Error('No reader available')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })

      if (text.length > fullText.length) {
        const delta = text.slice(fullText.length)
        if (delta) onChunk(delta)
        fullText = text
      } else {
        fullText += text
        onChunk(text)
      }
    }

    onDone(fullText)
  } catch (err) {
    onError?.(err as Error)
  }
}

// ====== 薪资分析相关 API ======

export interface SalaryAnalysisData {
  position: string
  city: string
  experience: string
  education: string
  salaryRange: { min: number; max: number; median: number }
  percentiles: { p10: number; p25: number; p50: number; p75: number; p90: number }
  industryAvg: number
  cityAvg: number
  experienceLevels: { level: string; salary: number }[]
  educationImpact: { level: string; salary: number }[]
  recommendedRange: string
  confidence: string
}

export async function analyzeSalary(params: {
  position: string
  city?: string
  experience?: string
  education?: string
}): Promise<SalaryAnalysisData> {
  const res = await fetch('/api/salary/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ====== 批量筛选相关 API ======

export interface BatchScreenResult {
  total: number
  threshold: number
  passedCount: number
  failedCount: number
  avgScore: number
  results: {
    id: string
    name: string
    filename: string
    mainTech: string
    skills: string
    score: number
    recommendation: string
    passed: boolean
    education: string
    workYears: number
  }[]
}

export async function batchScreen(params: {
  jdContent: string
  resumeCount?: number
  threshold?: number
}): Promise<BatchScreenResult> {
  const res = await fetch('/api/batch-screen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ====== 简历初筛（新） ======

/** 上传简历并执行初筛（SSE流式返回进度和结果） */
export async function streamScreeningRun(
  files: File[],
  jdContent: string,
  onProgress: (data: any) => void,
  onDone: (data: any) => void,
  onError?: (err: Error) => void,
) {
  try {
    // 1. 上传简历
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    const uploadRes = await fetch('/api/resume/upload', {
      method: 'POST',
      body: formData,
    })
    if (!uploadRes.ok) throw new Error(`上传失败 HTTP ${uploadRes.status}`)
    const uploadData = await uploadRes.json()
    const resumeIds: string[] = uploadData.resumes.map((r: any) => r.id)

    // 2. 发起筛选任务（SSE）
    const response = await fetch('/api/resume/screening/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jdContent, resumeIds }),
    })
    if (!response.ok) throw new Error(`筛选失败 HTTP ${response.status}`)

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    if (!reader) throw new Error('No reader available')

    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        try {
          const data = JSON.parse(trimmed.slice(6))
          if (data.status === 'completed') {
            onDone(data)
          } else {
            onProgress(data)
          }
        } catch {
          // skip unparseable lines
        }
      }
    }
  } catch (err) {
    onError?.(err as Error)
  }
}

// ====== Coze 配置相关 API ======

export interface CozeStatus {
  token_configured: boolean
  workflows: {
    [key: string]: { id: string; configured: boolean }
  }
  bots: { bot_id: string; name: string; description: string; status: string }[]
  workspaces: { id: string; name: string }[]
  error: string | null
}

export async function fetchCozeStatus(): Promise<CozeStatus> {
  const res = await fetch('/api/coze/status')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
