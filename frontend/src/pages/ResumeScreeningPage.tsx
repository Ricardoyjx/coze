import { useState, useEffect, useRef } from 'react'
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
  message,
  Statistic,
} from 'antd'
import {
  UploadOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  StarFilled,
} from '@ant-design/icons'
import MarioRunning from '../components/MarioRunning'
import { streamScreeningRun } from '../services/api'

const { TextArea } = Input
const { Dragger } = Upload

export default function ResumeScreeningPage() {
  const [step, setStep] = useState(0)
  const [uploadFiles, setUploadFiles] = useState<any[]>([])
  const [jdContent, setJdContent] = useState('')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<any[]>([])
  const [statusText, setStatusText] = useState('')
  const abortRef = useRef(false)

  useEffect(() => {
    return () => { abortRef.current = true }
  }, [])

  const getRealFiles = () =>
    uploadFiles.map((f: any) => f.originFileObj).filter(Boolean)

  const handleStartScreening = async () => {
    const files = getRealFiles()
    if (files.length === 0) {
      message.warning('请先上传简历文件')
      return
    }
    if (!jdContent.trim()) {
      message.warning('请输入或粘贴JD内容')
      return
    }

    abortRef.current = false
    setProcessing(true)
    setStep(1)
    setProgress(0)
    setResults([])

    await streamScreeningRun(
      files,
      jdContent.trim(),
      (data) => {
        if (abortRef.current) return
        const pct = Math.round((data.processedResumes / data.totalResumes) * 100)
        setProgress(pct)
        setStatusText(`正在分析第 ${data.processedResumes}/${data.totalResumes} 份简历`)
        if (data.results?.length > 0) {
          setResults([...data.results])
        }
      },
      (data) => {
        if (abortRef.current) return
        setProgress(100)
        setResults(data.results || [])
        setProcessing(false)
        setStep(2)
        message.success(`初筛完成！共分析 ${data.totalResumes} 份简历`)
      },
      (err) => {
        if (abortRef.current) return
        message.error('初筛失败：' + err.message)
        setProcessing(false)
      },
    )
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
  const hasFiles = uploadFiles.length > 0

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

      {step === 0 && (
        <Row gutter={24}>
          <Col xs={24} lg={12}>
            <Card title="📄 上传简历文件" style={{ marginBottom: 24 }}>
              <Dragger
                multiple
                accept=".pdf,.doc,.docx"
                fileList={uploadFiles}
                beforeUpload={(file) => {
                  const newFile = {
                    uid: file.uid || `file-${Date.now()}`,
                    name: file.name,
                    status: 'done' as const,
                    size: file.size,
                    type: file.type,
                    originFileObj: file,
                  }
                  setUploadFiles((prev) => [...prev, newFile])
                  return false
                }}
                onRemove={(file) => {
                  setUploadFiles((prev) => prev.filter((f) => f.uid !== file.uid))
                }}
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
                placeholder="将岗位说明书（JD）内容粘贴到此处..."
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
              disabled={!hasFiles || !jdContent.trim()}
            >
              开始AI初筛（已上传 {uploadFiles.length} 份简历）
            </Button>
          </Col>
        </Row>
      )}

      {step === 1 && (
        <Card style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <MarioRunning />
            <h3 style={{ margin: 0, fontSize: 18 }}>AI正在分析简历...</h3>
            <p style={{ color: '#666', margin: 0 }}>
              {statusText || `正在解析简历内容并进行匹配度计算，共 ${uploadFiles.length} 份简历`}
            </p>
            <div style={{
              width: 200,
              height: 6,
              background: '#f0f0f0',
              borderRadius: 3,
              overflow: 'hidden',
              marginTop: 8,
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #e53e30, #f5a623)',
                borderRadius: 3,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{ color: '#999', fontSize: 13 }}>
              {progress}% ({results.length}/{uploadFiles.length})
            </span>
          </div>
        </Card>
      )}

      {step === 2 && (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic title="总简历数" value={results.length} prefix={<FileTextOutlined />} />
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
                  value={results.length > 0
                    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
                    : 0}
                  suffix="/ 100"
                />
              </Card>
            </Col>
          </Row>

          {sortedResults.map((result, index) => (
            <Card key={result.id} className="score-card" style={{ marginBottom: 16 }}>
              <Row gutter={24}>
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
                  <p style={{ margin: 0, color: '#666', fontSize: 13 }}>{result.resume.email}</p>
                  <div style={{ marginTop: 4 }}>{recommendTag(result.recommendation)}</div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ fontSize: 13, marginBottom: 4, color: '#52c41a' }}>✅ 匹配点：</div>
                  <div>
                    {(result.matchPoints || []).map((p: string, i: number) => (
                      <Tag key={i} color="green" style={{ marginBottom: 4, fontSize: 12, whiteSpace: 'normal', height: 'auto', padding: '2px 8px', lineHeight: '20px' }}>{p}</Tag>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 4, marginTop: 8, color: '#ff4d4f' }}>❌ 缺失项：</div>
                  <div>
                    {(result.missingPoints || []).map((p: string, i: number) => (
                      <Tag key={i} color="red" style={{ marginBottom: 4, fontSize: 12, whiteSpace: 'normal', height: 'auto', padding: '2px 8px', lineHeight: '20px' }}>{p}</Tag>
                    ))}
                  </div>
                  {/* 真实性核查结果 */}
                  {result.integrityIssues && result.integrityIssues.length > 0 && (
                    <>
                      <div style={{ fontSize: 13, marginBottom: 4, marginTop: 12, color: '#faad14', fontWeight: 600 }}>
                        ⚠️ 真实性核查（可信度: {result.integrityScore || 100}分）
                      </div>
                      <div>
                        {result.integrityIssues.map((issue: string, i: number) => (
                          <Tag key={i} color="orange" style={{ marginBottom: 4, fontSize: 12, whiteSpace: 'normal', height: 'auto', padding: '2px 8px', lineHeight: '20px' }}>{issue}</Tag>
                        ))}
                      </div>
                    </>
                  )}
                  {result.timelineConsistent === false && (
                    <div style={{ fontSize: 12, marginTop: 4, color: '#ff4d4f' }}>
                      ⏰ 毕业年份与工作年限不匹配
                    </div>
                  )}
                </Col>
                <Col xs={24} sm={6}>
                  <p style={{ fontSize: 13, lineHeight: 1.8, margin: 0, wordBreak: 'break-word' }}>{result.summary}</p>
                  <Space style={{ marginTop: 8 }}>
                    <Button size="small" onClick={() => window.open(`/api/resume/${result.id}/file`, "_blank")}>查看简历</Button>

                  </Space>
                </Col>
              </Row>
            </Card>
          ))}

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button onClick={() => { setStep(0); setResults([]); setUploadFiles([]); setJdContent('') }}>
              重新筛选
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
