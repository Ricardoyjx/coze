import { useState, useMemo, useRef } from 'react'
import {
  Card, Upload, Button, Steps, Input, Row, Col, Progress, Tag, Space, Table, message,
  Statistic, Slider, Segmented, Tooltip,
} from 'antd'
import {
  UploadOutlined, FileTextOutlined, PlayCircleOutlined, CheckCircleOutlined,
  DownloadOutlined, FilterOutlined, TeamOutlined, RiseOutlined,
  EyeOutlined, WarningOutlined, CheckCircleFilled, CloseCircleFilled,
} from '@ant-design/icons'
import { streamBatchScreen } from '../services/api'
import type { BatchScreenResult } from '../services/api'
import MarioRunning from '../components/MarioRunning'

const { TextArea } = Input
const { Dragger } = Upload

export default function BatchScreeningPage() {
  const [step, setStep] = useState(0)
  const [files, setFiles] = useState<File[]>([])
  const [jdContent, setJdContent] = useState('')
  const [threshold, setThreshold] = useState(60)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [result, setResult] = useState<BatchScreenResult | null>(null)
  const [filterPass, setFilterPass] = useState<string>('all')
  const abortRef = useRef(false)

  const handleUpload = (info: any) => {
    setFiles(info.fileList.map((f: any) => f.originFileObj))
  }

  const handleStart = async () => {
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
    setResult(null)

    streamBatchScreen(
      files,
      jdContent.trim(),
      threshold,
      (data) => {
        if (abortRef.current) return
        const pct = Math.round((data.processedResumes / data.totalResumes) * 100)
        setProgress(pct)
        setStatusText(`正在分析第 ${data.processedResumes}/${data.totalResumes} 份简历`)
      },
      (data) => {
        if (abortRef.current) return
        setProgress(100)
        setResult(data)
        setProcessing(false)
        setStep(2)
        message.success(`审查完成！通过 ${data.passedCount} 人`)
      },
      (err) => {
        if (abortRef.current) return
        message.error('简历审查失败：' + err.message)
        setProcessing(false)
      },
    )
  }

  const filteredResults = useMemo(() => {
    if (!result) return []
    if (filterPass === 'pass') return result.results.filter((r) => r.passed)
    if (filterPass === 'fail') return result.results.filter((r) => !r.passed)
    if (filterPass === 'integrity') return result.results.filter((r) => r.integrityIssues && r.integrityIssues.length > 0)
    return result.results
  }, [result, filterPass])

  const handleViewFile = (resumeId: string) => {
    const link = document.createElement('a')
    link.href = `/api/resume/${resumeId}/file`
    link.download = ''
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExport = () => {
    if (!result) return
    const headers = ['排名', '姓名', '主技术栈', '技能', '工作年限', '学历', '匹配得分', '推荐等级', '通过', '可信度', '时间线一致', '异常项']
    const rows = result.results.map((r, i) => [
      i + 1,
      r.name,
      r.mainTech,
      r.skills,
      r.workYears,
      r.education,
      r.score,
      r.recommendation === 'strong' ? '强烈推荐' : r.recommendation === 'weak' ? '不推荐' : '建议考虑',
      r.passed ? '通过' : '未通过',
      r.integrityScore || 100,
      r.timelineConsistent ? '是' : '否',
      (r.integrityIssues || []).join('; '),
    ])
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `简历审查报告_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    message.success('已导出CSV文件')
  }

  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: 50,
      render: (_: any, __: any, i: number) => (
        <span style={{ fontWeight: 600, color: i < 3 ? '#1677ff' : '#999' }}>
          {i + 1}
        </span>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (name: string, record: any) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{name}</span>
          {record.passed
            ? <Tag color="green" style={{ fontSize: 11, lineHeight: '18px' }}>通过</Tag>
            : <Tag color="red" style={{ fontSize: 11, lineHeight: '18px' }}>未通过</Tag>}
        </Space>
      ),
      sorter: (a: any, b: any) => a.name.localeCompare(b.name, 'zh'),
    },
    {
      title: '主技术栈',
      dataIndex: 'mainTech',
      key: 'mainTech',
      width: 90,
    },
    {
      title: '工作年限',
      dataIndex: 'workYears',
      key: 'workYears',
      width: 70,
      sorter: (a: any, b: any) => a.workYears - b.workYears,
    },
    {
      title: '匹配得分',
      dataIndex: 'score',
      key: 'score',
      width: 70,
      sorter: (a: any, b: any) => a.score - b.score,
      defaultSortOrder: 'descend' as const,
      render: (score: number) => (
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f',
        }}>
          {score}分
        </span>
      ),
    },
    {
      title: '可信度',
      dataIndex: 'integrityScore',
      key: 'integrityScore',
      width: 80,
      sorter: (a: any, b: any) => (a.integrityScore || 100) - (b.integrityScore || 100),
      render: (score: number, record: any) => {
        const s = score || 100
        const hasIssues = record.integrityIssues && record.integrityIssues.length > 0
        return (
          <Tooltip title={hasIssues ? record.integrityIssues.join('\n') : '未发现异常'}>
            <span style={{
              fontWeight: 600,
              color: s >= 80 ? '#52c41a' : s >= 60 ? '#faad14' : '#ff4d4f',
              cursor: hasIssues ? 'pointer' : 'default',
            }}>
              {hasIssues && <WarningOutlined style={{ marginRight: 2 }} />}
              {s}分
            </span>
          </Tooltip>
        )
      },
    },
    {
      title: '推荐',
      dataIndex: 'recommendation',
      key: 'recommendation',
      width: 80,
      render: (rec: string) => {
        const map: Record<string, { color: string; text: string }> = {
          strong: { color: 'green', text: '强烈推荐' },
          moderate: { color: 'orange', text: '建议考虑' },
          weak: { color: 'red', text: '不推荐' },
        }
        const item = map[rec] || map.moderate
        return <Tag color={item.color} style={{ fontSize: 11 }}>{item.text}</Tag>
      },
    },
    {
      title: '异常',
      dataIndex: 'integrityIssues',
      key: 'integrityIssues',
      width: 60,
      render: (issues: string[]) => {
        if (!issues || issues.length === 0) {
          return <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
        }
        return (
          <Tooltip title={issues.join('\n')}>
            <WarningOutlined style={{ color: '#faad14', fontSize: 16, cursor: 'pointer' }} />
          </Tooltip>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: any) => (
        <Button
          size="small"
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewFile(record.id)}
        >
          查看
        </Button>
      ),
    },
  ]

  const scoreColor = (score: number) => {
    if (score >= 80) return '#52c41a'
    if (score >= 60) return '#faad14'
    return '#ff4d4f'
  }

  const integrityCount = result ? result.results.filter((r) => r.integrityIssues && r.integrityIssues.length > 0).length : 0

  return (
    <div>
      <div className="page-header">
        <h2><FilterOutlined /> 简历审查</h2>
        <p>批量上传简历文件，AI自动解析、评分、核查真实性，高效筛选候选人</p>
      </div>

      <Steps
        current={step}
        items={[
          { title: '上传简历 & 配置', icon: <UploadOutlined /> },
          { title: 'AI批量分析', icon: <PlayCircleOutlined /> },
          { title: '查看结果', icon: <CheckCircleOutlined /> },
        ]}
        style={{ marginBottom: 24 }}
      />

      {step === 0 && (
        <Row gutter={24}>
          <Col xs={24} lg={14}>
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
          <Col xs={24} lg={10}>
            <Card title="⚙️ 筛选配置" style={{ marginBottom: 24 }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#333' }}>
                    及格分数线
                  </div>
                  <Row gutter={12} align="middle">
                    <Col flex="auto">
                      <Slider
                        min={0}
                        max={100}
                        value={threshold}
                        onChange={setThreshold}
                        marks={{ 0: '0', 40: '40', 60: '60', 80: '80', 100: '100' }}
                      />
                    </Col>
                    <Col>
                      <Tag color={scoreColor(threshold)} style={{ fontSize: 14, padding: '2px 12px' }}>
                        {threshold}分
                      </Tag>
                    </Col>
                  </Row>
                </div>
                <div style={{
                  padding: 12, background: '#f6ffed', borderRadius: 6,
                  border: '1px solid #b7eb8f',
                }}>
                  <Space>
                    <RiseOutlined style={{ color: '#52c41a' }} />
                    <span style={{ fontSize: 13, color: '#333' }}>
                      {files.length > 0
                        ? `已上传 ${files.length} 份简历`
                        : '上传简历后即可开始审查'}
                    </span>
                  </Space>
                </div>
              </Space>
            </Card>
          </Col>
          <Col span={24}>
            <Card title="📝 粘贴JD内容">
              <TextArea
                value={jdContent}
                onChange={(e) => setJdContent(e.target.value)}
                placeholder="将岗位说明书（JD）内容粘贴到此处..."
                autoSize={{ minRows: 6, maxRows: 10 }}
              />
            </Card>
          </Col>
          <Col span={24} style={{ textAlign: 'center', marginTop: 24 }}>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleStart}
              disabled={files.length === 0 || !jdContent.trim()}
            >
              开始简历审查（{files.length} 份简历）
            </Button>
          </Col>
        </Row>
      )}

      {step === 1 && (
        <Card style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <MarioRunning />
            <h3 style={{ margin: 0, fontSize: 18 }}>AI正在审查简历...</h3>
            <p style={{ color: '#666', margin: 0 }}>
              {statusText || `正在逐份分析简历内容并核查真实性，共 ${files.length} 份简历`}
            </p>
            <div style={{
              width: 200, height: 6, background: '#f0f0f0',
              borderRadius: 3, overflow: 'hidden', marginTop: 8,
            }}>
              <div style={{
                width: `${progress}%`, height: '100%',
                background: 'linear-gradient(90deg, #e53e30, #f5a623)',
                borderRadius: 3, transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{ color: '#999', fontSize: 13 }}>
              {progress}% ({result?.results?.length || 0}/{files.length})
            </span>
          </div>
        </Card>
      )}

      {step === 2 && result && (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic title="简历总数" value={result.total} prefix={<TeamOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic title="通过" value={result.passedCount} valueStyle={{ color: '#52c41a' }} suffix={`/ ${result.total}`} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic title="未通过" value={result.failedCount} valueStyle={{ color: '#ff4d4f' }} suffix={`/ ${result.total}`} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="存疑简历"
                  value={integrityCount}
                  valueStyle={{ color: integrityCount > 0 ? '#faad14' : '#52c41a' }}
                  prefix={integrityCount > 0 ? <WarningOutlined /> : <CheckCircleFilled />}
                />
              </Card>
            </Col>
          </Row>

          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>分数分布：</span>
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((rangeStart) => {
                const count = result.results.filter((r) => r.score >= rangeStart && r.score < rangeStart + 10).length
                const maxCount = Math.max(
                  ...Array.from({ length: 11 }, (_, i) =>
                    result.results.filter((r) => r.score >= i * 10 && r.score < i * 10 + 10).length,
                  ), 1,
                )
                return (
                  <div key={rangeStart} style={{ textAlign: 'center', flex: 1, minWidth: 28 }}>
                    <div style={{
                      height: Math.max((count / maxCount) * 40, count > 0 ? 8 : 2),
                      width: '100%',
                      background: rangeStart >= result.threshold ? '#52c41a' : '#ff4d4f',
                      borderRadius: '2px 2px 0 0',
                      opacity: count > 0 ? 1 : 0.2,
                      transition: 'height 0.3s',
                    }} />
                    <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{rangeStart}</div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card
            title={<Space><FilterOutlined /> 筛选结果</Space>}
            extra={
              <Space>
                <Segmented
                  value={filterPass}
                  onChange={setFilterPass}
                  options={[
                    { label: `全部 (${result.results.length})`, value: 'all' },
                    { label: `通过 (${result.passedCount})`, value: 'pass' },
                    { label: `未通过 (${result.failedCount})`, value: 'fail' },
                    { label: `存疑 (${integrityCount})`, value: 'integrity' },
                  ]}
                />
                <Button icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
              </Space>
            }
          >
            <Table
              dataSource={filteredResults}
              columns={columns}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showTotal: (total) => `共 ${total} 份简历`,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
              }}
              size="middle"
              onRow={(record) => ({
                style: {
                  background: record.passed ? undefined : '#fff8f8',
                },
              })}
            />
          </Card>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Space>
              <Button onClick={() => {
                setStep(0); setResult(null); setFiles([]); setJdContent(''); setProgress(0)
              }}>
                重新审查
              </Button>
              <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                导出审查报告
              </Button>
            </Space>
          </div>
        </>
      )}
    </div>
  )
}
