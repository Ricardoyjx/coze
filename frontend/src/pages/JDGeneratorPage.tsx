import { useState, useRef, useEffect } from 'react'
import { Row, Col, Card, Input, Button, List, Tag, Space, message, Spin } from 'antd'
import { SendOutlined, SaveOutlined, CopyOutlined, ThunderboltOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import { streamJDGeneration } from '../services/api'
import type { ChatMessage } from '../types'

const quickPrompts = [
  '高级Java开发工程师，5年经验，熟悉微服务',
  '产品经理，3年B端经验，有SaaS背景',
  '前端开发工程师，React/Vue，3年以上',
  '数据分析师，Python/SQL，有业务分析经验',
]

export default function JDGeneratorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentJD, setCurrentJD] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || loading) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, assistantMsg])

    await streamJDGeneration(
      msg,
      (chunk) => {
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'assistant') {
            last.content += chunk
          }
          return updated
        })
      },
      (fullText) => {
        setCurrentJD(fullText)
        setLoading(false)
      },
      (err) => {
        message.error('生成失败：' + err.message)
        setLoading(false)
      },
    )
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(currentJD)
    message.success('已复制到剪贴板')
  }

  return (
    <div>
      <div className="page-header">
        <h2>📝 JD智能生成</h2>
        <p>输入岗位名称和关键要求，AI将自动生成结构完整的岗位说明书（JD）</p>
      </div>

      <Row gutter={24}>
        {/* 左侧：对话区域 */}
        <Col xs={24} lg={12}>
          <Card
            title="对话"
            style={{ height: 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' } }}
          >
            {/* 快捷提示 */}
            {messages.length === 0 && (
              <div style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <span style={{ color: '#666', fontSize: 13 }}>
                    <ThunderboltOutlined /> 快速开始：
                  </span>
                  {quickPrompts.map((prompt, i) => (
                    <Tag
                      key={i}
                      color="blue"
                      style={{ cursor: 'pointer', padding: '4px 12px', fontSize: 13 }}
                      onClick={() => handleSend(prompt)}
                    >
                      {prompt}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {/* 消息列表 */}
            <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
              {messages.map((msg) => (
                <div key={msg.id} className={`chat-message ${msg.role}`}>
                  <div className="content">
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown>{msg.content || ' '}</ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {loading && messages[messages.length - 1]?.content === '' && (
                <div className="chat-message assistant">
                  <div className="content">
                    <Spin size="small" /> 正在生成...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 输入框 */}
            <Space.Compact style={{ width: '100%' }}>
              <Input.TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入岗位需求，如：高级Java开发工程师，5年经验，熟悉微服务..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                disabled={loading}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => handleSend()}
                loading={loading}
                style={{ height: 'auto' }}
              >
                发送
              </Button>
            </Space.Compact>
          </Card>
        </Col>

        {/* 右侧：JD预览 */}
        <Col xs={24} lg={12}>
          <Card
            title="JD预览"
            extra={
              currentJD && (
                <Space>
                  <Button icon={<CopyOutlined />} onClick={handleCopy}>
                    复制
                  </Button>
                  <Button icon={<SaveOutlined />} type="primary">
                    保存
                  </Button>
                </Space>
              )
            }
            style={{ height: 'calc(100vh - 260px)' }}
            styles={{ body: { overflow: 'auto', height: 'calc(100% - 56px)' } }}
          >
            {currentJD ? (
              <div className="jd-preview">
                <ReactMarkdown>{currentJD}</ReactMarkdown>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#999' }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>📄</p>
                <p>在左侧输入岗位需求，生成的JD将在此处预览</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
