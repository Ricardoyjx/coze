import { useState } from 'react'
import { Row, Col, Card, Input, Button, Space, message, Tag } from 'antd'
import { SendOutlined, CopyOutlined, ThunderboltOutlined, FileTextOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import { streamJDGeneration } from '../services/api'

const { TextArea } = Input

const quickPrompts = [
  { label: 'Java后端', value: '高级Java开发工程师，5年经验，熟悉微服务' },
  { label: '产品经理', value: '产品经理，3年B端经验，有SaaS背景' },
  { label: '前端开发', value: '前端开发工程师，React/Vue，3年以上' },
  { label: '数据分析', value: '数据分析师，Python/SQL，有业务分析经验' },
  { label: 'UI/UX设计', value: 'UI/UX设计师，3年B端产品设计经验，熟悉Figma、Sketch' },
]

export default function JDGeneratorPage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentJD, setCurrentJD] = useState('')

  const handleGenerate = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || loading) return

    setCurrentJD('')
    setLoading(true)

    await streamJDGeneration(
      msg,
      (chunk) => {
        setCurrentJD((prev) => prev + chunk)
      },
      (_fullText) => {
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
        <h2><FileTextOutlined /> JD智能生成</h2>
        <p>输入岗位名称和关键要求，AI将自动生成结构完整的岗位说明书</p>
      </div>

      <Row gutter={24}>
        {/* 左侧：输入表单 */}
        <Col xs={24} lg={10}>
          <Card
            title="输入需求"
            style={{ height: 'calc(100vh - 260px)' }}
            styles={{ body: { overflow: 'auto', height: 'calc(100% - 56px)' } }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* 快捷模板 */}
              <div>
                <span style={{ color: '#666', fontSize: 13, marginBottom: 8, display: 'block' }}>
                  <ThunderboltOutlined /> 快捷填充：
                </span>
                <Space wrap>
                  {quickPrompts.map((tpl, i) => (
                    <Tag
                      key={i}
                      color="blue"
                      style={{ cursor: 'pointer', padding: '2px 10px' }}
                      onClick={() => { setInput(tpl.value); handleGenerate(tpl.value) }}
                    >
                      {tpl.label}
                    </Tag>
                  ))}
                </Space>
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                  岗位名称与关键要求 <Tag color="red">必填</Tag>
                </div>
                <TextArea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="例：高级Java开发工程师，5年经验，熟悉微服务、Spring Boot、MySQL，有高并发经验"
                  autoSize={{ minRows: 6, maxRows: 12 }}
                />
              </div>

              <Button
                type="primary"
                size="large"
                icon={<SendOutlined />}
                onClick={() => handleGenerate()}
                loading={loading}
                disabled={!input.trim()}
                block
              >
                {loading ? '正在生成...' : '生成JD'}
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 右侧：JD预览 */}
        <Col xs={24} lg={14}>
          <Card
            title="JD预览"
            extra={
              currentJD && (
                <Button icon={<CopyOutlined />} onClick={handleCopy}>
                  复制全文
                </Button>
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
                <p>在左侧输入岗位需求，点击「生成JD」</p>
                <p style={{ fontSize: 13 }}>AI将自动生成结构完整的岗位说明书</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
