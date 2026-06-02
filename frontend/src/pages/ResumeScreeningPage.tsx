import { useState } from 'react'
import {
  Card,
  Upload,
  Button,
  Steps,
  Input,
  Row,
  Col,
  Progress,
  Tag,
  Space,
  Table,
  Badge,
  message,
  Empty,
  Statistic,
  Divider,
} from 'antd'
import {
  UploadOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  StarFilled,
} from '@ant-design/icons'
import type { ScreeningResult, Resume } from '../types'

const { TextArea } = Input
const { Dragger } = Upload

// Mock数据用于演示
const mockResults: ScreeningResult[] = [
  {
    id: '1',
    resume: {
      id: 'r1', filename: '张三_简历.pdf', name: '张三', phone: '13800138001',
      email: 'zhangsan@email.com', education: '本科·北京大学', workYears: 6,
      skills: ['Java', 'Spring Boot', '微服务', 'MySQL', 'Redis', 'Docker'],
      experience: '6年Java开发经验', uploadedAt: '2026-06-01',
    },
    score: 92,
    matchPoints: ['6年Java开发经验', '精通Spring Boot微服务', '熟悉Docker容器化部署'],
    missingPoints: ['缺少大数据处理经验'],
    recommendation: 'strong',
    summary: '候选人技术栈与岗位高度匹配，微服务经验丰富，强烈推荐面试。',
  },
  {
    id: '2',
    resume: {
      id: 'r2', filename: '李四_简历.pdf', name: '李四', phone: '13800138002',
      email: 'lisi@email.com', education: '硕士·清华大学', workYears: 4,
      skills: ['Java', 'Spring Cloud', 'MySQL', 'Kafka'],
      experience: '4年Java后端开发', uploadedAt: '2026-06-01',
    },
    score: 78,
    matchPoints: ['硕士学历背景优秀', '熟悉Spring Cloud体系'],
    missingPoints: ['工作年限略短', '缺少Docker/K8s经验'],
    recommendation: 'moderate',
    summary: '候选人学历优秀，技术基础扎实，但微服务部署经验偏弱，建议考虑。',
  },
  {
    id: '3',
    resume: {
      id: 'r3', filename: '王五_简历.pdf', name: '王五', phone: '13800138003',
      email: 'wangwu@email.com', education: '本科·武汉大学', workYears: 3,
      skills: ['Python', 'Django', 'PostgreSQL'],
      experience: '3年Python开发经验', uploadedAt: '2026-06-01',
    },
    score: 35,
    matchPoints: ['有后端开发经验'],
    missingPoints: ['主要技术栈为Python非Java', '无微服务经验', '工作年限不足'],
    recommendation: 'weak',
    summary: '候选人技术栈与岗位需求不匹配，主要使用Python而非Java，不推荐。',
  },
]

export default function ResumeScreeningPage() {
  const [step, setStep] = useState(0)
  const [files, setFiles] = useState<File[]>([])
  const [jdContent, setJdContent] = useState('')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ScreeningResult[]>([])

  const handleUpload = (info: any) => {
    setFiles(info.fileList.map((f: any) => f.originFileObj))
  }

  const handleStartScreening = async () => {
    if (files.length === 0) {
      message.warning('请先上传简历文件')
      return
    }
    if (!jdContent.trim()) {
      message.warning('请输入或粘贴JD内容')
      return
    }

    setProcessing(true)
    setStep(1)
    setProgress(0)

    // 模拟处理进度
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      setProgress(i)
    }

    setResults(mockResults)
    setProcessing(false)
    setStep(2)
    message.success('初筛完成！')
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return '#52c41a'
    if (score >= 60) return '#faad14'
    return '#ff4d4f'
  }

  const recommendTag = (rec: string) => {
    const map: Record<string, { color: string; text: string }> = {
      strong: { color: 'green', text: '强烈推荐' },
      moderate: { color: 'orange', text: '建议考虑' },
      weak: { color: 'red', text: '不推荐' },
    }
    const item = map[rec] || map.moderate
    return <Tag color={item.color}>{item.text}</Tag>
  }

  const sortedResults = [...results].sort((a, b) => b.score - a.score)

  return (
    <div>
      <div className="page-header">
        <h2>🔍 简历初筛</h2>
        <p>上传简历文件并输入JD内容，AI将自动解析、评分并排序推荐候选人</p>
      </div>

      <Steps
        current={step}
        items={[
          { title: '上传简历 & 输入JD', icon: <UploadOutlined /> },
          { title: 'AI分析中', icon: <PlayCircleOutlined /> },
          { title: '查看结果', icon: <CheckCircleOutlined /> },
        ]}
        style={{ marginBottom: 24 }}
      />

      {/* Step 0: 上传和输入 */}
      {step === 0 && (
        <Row gutter={24}>
          <Col xs={24} lg={12}>
            <Card title="📄 上传简历文件" style={{ marginBottom: 24 }}>
              <Dragger
                multiple
                accept=".pdf,.doc,.docx"
                onChange={handleUpload}
                beforeUpload={() => false}
                fileList={files.map((f, i) => ({
                  uid: i.toString(),
                  name: f.name,
                  status: 'done',
                } as any))}
              >
                <p className="ant-upload-drag-icon">
                  <FileTextOutlined style={{ fontSize: 48, color: '#1677ff' }} />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">支持 PDF、Word 格式，可批量上传</p>
              </Dragger>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="📝 粘贴JD内容">
              <TextArea
                value={jdContent}
                onChange={(e) => setJdContent(e.target.value)}
                placeholder="将岗位说明书（JD）内容粘贴到此处，或从左侧【JD智能生成】页面复制..."
                autoSize={{ minRows: 12, maxRows: 20 }}
              />
            </Card>
          </Col>
          <Col span={24} style={{ textAlign: 'center', marginTop: 24 }}>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleStartScreening}
              disabled={files.length === 0 || !jdContent.trim()}
            >
              开始AI初筛（已上传 {files.length} 份简历）
            </Button>
          </Col>
        </Row>
      )}

      {/* Step 1: 处理中 */}
      {step === 1 && (
        <Card style={{ textAlign: 'center', padding: '60px 0' }}>
          <Progress
            type="circle"
            percent={progress}
            size={160}
            strokeColor="#1677ff"
            format={(p) => `${p}%`}
          />
          <h3 style={{ marginTop: 24 }}>AI正在分析简历...</h3>
          <p style={{ color: '#666' }}>
            正在解析简历内容并进行匹配度计算，共 {files.length} 份简历
          </p>
        </Card>
      )}

      {/* Step 2: 结果展示 */}
      {step === 2 && (
        <>
          {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="总简历数"
                  value={results.length}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="强烈推荐"
                  value={results.filter((r) => r.recommendation === 'strong').length}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<StarFilled />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="建议考虑"
                  value={results.filter((r) => r.recommendation === 'moderate').length}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="平均分"
                  value={Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)}
                  suffix="/ 100"
                />
              </Card>
            </Col>
          </Row>

          {/* 结果列表 */}
          {sortedResults.map((result, index) => (
            <Card
              key={result.id}
              className="score-card"
              style={{ marginBottom: 16 }}
            >
              <Row gutter={24} align="middle">
                <Col xs={24} sm={4} style={{ textAlign: 'center' }}>
                  {index < 3 && (
                    <TrophyOutlined
                      style={{
                        fontSize: 28,
                        color: ['#ffd700', '#c0c0c0', '#cd7f32'][index],
                        display: 'block',
                        marginBottom: 4,
                      }}
                    />
                  )}
                  <div style={{ fontSize: 14, color: '#999' }}>TOP {index + 1}</div>
                  <Progress
                    type="circle"
                    percent={result.score}
                    size={64}
                    strokeColor={scoreColor(result.score)}
                    format={(p) => `${p}`}
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <h3 style={{ margin: '0 0 4px' }}>{result.resume.name}</h3>
                  <p style={{ margin: 0, color: '#666', fontSize: 13 }}>
                    {result.resume.education} · {result.resume.workYears}年经验
                  </p>
                  <p style={{ margin: 0, color: '#666', fontSize: 13 }}>
                    {result.resume.email}
                  </p>
                  <div style={{ marginTop: 4 }}>
                    {recommendTag(result.recommendation)}
                  </div>
                </Col>
                <Col xs={24} sm={7}>
                  <div style={{ fontSize: 13, marginBottom: 4, color: '#52c41a' }}>
                    ✅ 匹配点：
                  </div>
                  {result.matchPoints.map((p, i) => (
                    <Tag key={i} color="green" style={{ marginBottom: 4, fontSize: 12 }}>
                      {p}
                    </Tag>
                  ))}
                  <div style={{ fontSize: 13, marginBottom: 4, marginTop: 8, color: '#ff4d4f' }}>
                    ❌ 缺失项：
                  </div>
                  {result.missingPoints.map((p, i) => (
                    <Tag key={i} color="red" style={{ marginBottom: 4, fontSize: 12 }}>
                      {p}
                    </Tag>
                  ))}
                </Col>
                <Col xs={24} sm={7}>
                  <p style={{ fontSize: 13, lineHeight: 1.8, margin: 0 }}>
                    {result.summary}
                  </p>
                  <Space style={{ marginTop: 8 }}>
                    <Button size="small">查看简历</Button>
                    <Button size="small" type="primary">安排面试</Button>
                  </Space>
                </Col>
              </Row>
            </Card>
          ))}

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Space>
              <Button onClick={() => { setStep(0); setResults([]); setFiles([]); setJdContent(''); }}>
                重新筛选
              </Button>
              <Button type="primary" onClick={() => message.success('已导出Excel')}>
                导出Excel
              </Button>
            </Space>
          </div>
        </>
      )}
    </div>
  )
}
