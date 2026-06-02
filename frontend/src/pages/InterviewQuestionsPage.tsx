import { useState } from 'react'
import {
  Row, Col, Card, Input, Button, Space, message, Tag, Slider, Select, Radio,
} from 'antd'
import {
  SendOutlined, CopyOutlined, ThunderboltOutlined, QuestionCircleOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import { streamInterviewQuestions } from '../services/api'

const { TextArea } = Input

const difficultyOptions = [
  { label: '简单', value: 'easy' },
  { label: '中等', value: 'medium' },
  { label: '困难', value: 'hard' },
]

const typeOptions = [
  { label: '技术题', value: 'technical' },
  { label: '行为题', value: 'behavioral' },
  { label: '场景题', value: 'scenario' },
  { label: '系统设计', value: 'system_design' },
]

const quickTemplates = [
  { label: 'Java后端', value: '高级Java开发工程师' },
  { label: '前端开发', value: '前端开发工程师' },
  { label: '产品经理', value: '产品经理（B端）' },
  { label: '算法', value: '算法工程师' },
  { label: '测试开发', value: '测试开发工程师' },
  { label: '运维', value: '运维工程师' },
]

export default function InterviewQuestionsPage() {
  const [position, setPosition] = useState('')
  const [jdContent, setJdContent] = useState('')
  const [count, setCount] = useState(5)
  const [difficulty, setDifficulty] = useState('medium')
  const [type, setType] = useState('technical')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  const formFilled = position.trim().length > 0

  const handleGenerate = async () => {
    if (!formFilled || loading) return

    setResult('')
    setLoading(true)

    await streamInterviewQuestions(
      {
        position: position.trim(),
        jdContent: jdContent.trim(),
        count,
        difficulty,
        types: [type],
      },
      (chunk) => {
        setResult((prev) => prev + chunk)
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
    navigator.clipboard.writeText(result)
    message.success('已复制到剪贴板')
  }

  const handleClear = () => {
    setResult('')
  }

  return (
    <div>
      <div className="page-header">
        <h2><QuestionCircleOutlined /> 面试题</h2>
        <p>根据岗位要求和JD内容，AI自动生成针对性的面试题目</p>
      </div>

      <Row gutter={24}>
        {/* 左侧：配置表单 */}
        <Col xs={24} lg={10}>
          <Card
            title="生成配置"
            style={{ height: 'calc(100vh - 260px)' }}
            styles={{ body: { overflow: 'auto', height: 'calc(100% - 56px)' } }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* 快捷模板 */}
              <div>
                <span style={{ color: '#666', fontSize: 13, marginBottom: 8, display: 'block' }}>
                  <ThunderboltOutlined /> 快捷填充岗位：
                </span>
                <Space wrap>
                  {quickTemplates.map((tpl, i) => (
                    <Tag
                      key={i}
                      color="blue"
                      style={{ cursor: 'pointer', padding: '2px 10px' }}
                      onClick={() => setPosition(tpl.value)}
                    >
                      {tpl.label}
                    </Tag>
                  ))}
                </Space>
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500 }}>岗位名称 *</div>
                <Input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="如：高级Java开发工程师"
                />
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500 }}>岗位描述（JD）</div>
                <TextArea
                  value={jdContent}
                  onChange={(e) => setJdContent(e.target.value)}
                  placeholder="粘贴JD内容，让AI生成更有针对性的面试题..."
                  autoSize={{ minRows: 3, maxRows: 6 }}
                />
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500 }}>题目数量：{count} 题</div>
                <Slider
                  min={3}
                  max={15}
                  value={count}
                  onChange={setCount}
                  marks={{ 3: '3', 5: '5', 10: '10', 15: '15' }}
                />
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500 }}>难度</div>
                <Select
                  value={difficulty}
                  onChange={setDifficulty}
                  options={difficultyOptions}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>题目类型</div>
                <Radio.Group
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  options={typeOptions}
                />
              </div>

              <Button
                type="primary"
                size="large"
                icon={<SendOutlined />}
                onClick={handleGenerate}
                loading={loading}
                disabled={!formFilled}
                block
              >
                {loading ? '正在生成...' : '生成面试题'}
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 右侧：结果预览 */}
        <Col xs={24} lg={14}>
          <Card
            title="面试题预览"
            extra={
              result && (
                <Space>
                  <Button icon={<CopyOutlined />} onClick={handleCopy}>
                    复制全文
                  </Button>
                  <Button onClick={handleClear}>
                    清除
                  </Button>
                </Space>
              )
            }
            style={{ height: 'calc(100vh - 260px)' }}
            styles={{ body: { overflow: 'auto', height: 'calc(100% - 56px)' } }}
          >
            {result ? (
              <div className="jd-preview">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#999' }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>📋</p>
                <p>在左侧填写岗位信息后，点击「生成面试题」</p>
                <p style={{ fontSize: 13 }}>AI将自动生成针对性的面试题目及参考答案</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
