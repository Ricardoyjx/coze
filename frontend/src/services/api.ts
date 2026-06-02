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
      const chunk = decoder.decode(value, { stream: true })
      fullText += chunk
      onChunk(chunk)
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
