import { useState, useMemo } from 'react'
import {
  Card, Upload, Button, Steps, Input, Row, Col, Progress, Tag, Space, Table, message,
  Statistic, Slider, Segmented,
} from 'antd'
import {
  UploadOutlined, FileTextOutlined, PlayCircleOutlined, CheckCircleOutlined,
  DownloadOutlined, FilterOutlined, TeamOutlined, RiseOutlined,
} from '@ant-design/icons'
import { batchScreen } from '../services/api'
import type { BatchScreenResult } from '../services/api'

const { TextArea } = Input
const { Dragger } = Upload

export default function BatchScreeningPage() {
  const [step, setStep] = useState(0)
  const [files, setFiles] = useState<File[]>([])
  const [jdContent, setJdContent] = useState('')
  const [threshold, setThreshold] = useState(60)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<BatchScreenResult | null>(null)
  const [filterPass, setFilterPass] = useState<string>('all')

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

    setProcessing(true)
    setStep(1)
    setProgress(0)

    // 模拟处理进度
    for (let i = 0; i <= 100; i += 3) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      setProgress(i)
    }

    try {
      const data = await batchScreen({
        jdContent: jdContent.trim(),
        resumeCount: files.length,
        threshold,
      })
      setResult(data)
      setStep(2)
      message.success(`筛选完成！通过 ${data.passedCount} 人`)
    } catch (err: any) {
      message.error('批量筛选失败：' + (err.message || '未知错误'))
    } finally {
      setProcessing(false)
    }
  }

  const filteredResults = useMemo(() => {
    if (!result) return []
    if (filterPass === 'pass') return result.results.filter((r) => r.passed)
    if (filterPass === 'fail') return result.results.filter((r) => !r.passed)
    return result.results
  }, [result, filterPass])

  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
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
      width: 80,
      sorter: (a: any, b: any) => a.workYears - b.workYears,
    },
    {
      title: '匹配得分',
      dataIndex: 'score',
      key: 'score',
      width: 200,
      sorter: (a: any, b: any) => a.score - b.score,
      defaultSortOrder: 'descend' as const,
      render: (score: number) => (
        <Space style={{ width: '100%' }}>
          <Progress
            percent={score}
            size="small"
            strokeColor={score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f'}
            format={(p) => `${p}`}
            style={{ width: 120, marginBottom: 0 }}
          />
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f',
          }}>
            {score}分
          </span>
        </Space>
      ),
    },
    {
      title: '推荐等级',
      dataIndex: 'recommendation',
      key: 'recommendation',
      width: 100,
      render: (rec: string) => {
        const map: Record<string, { color: string; text: string }> = {
          strong: { color: 'green', text: '强烈推荐' },
          moderate: { color: 'orange', text: '建议考虑' },
          weak: { color: 'red', text: '不推荐' },
        }
        const item = map[rec] || map.moderate
        return <Tag color={item.color}>{item.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button size="small" type="link">查看简历</Button>
          {record.passed && <Button size="small" type="link" style={{ color: '#52c41a' }}>发Offer</Button>}
        </Space>
      ),
    },
  ]

  const scoreColor = (score: number) => {
    if (score >= 80) return '#52c41a'
    if (score >= 60) return '#faad14'
    return '#ff4d4f'
  }

  return (
    <div>
      <div className="page-header">
        <h2><FilterOutlined /> 批量筛选</h2>
        <p>批量上传简历文件，AI自动解析、评分并排序，高效筛选候选人</p>
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

      {/* Step 0: 上传和配置 */}
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
                <p className="ant-upload-hint">支持 PDF、Word 格式，可批量上传，文件数量不限</p>
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
                        ? `已上传 ${files.length} 份简历，将通过分数线筛选`
                        : '上传简历后即可开始批量筛选'}
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
              开始批量筛选（{files.length} 份简历）
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
          <h3 style={{ marginTop: 24 }}>AI正在批量分析简历...</h3>
          <p style={{ color: '#666' }}>
            正在逐份解析简历内容并进行匹配度计算，共 {files.length} 份简历
          </p>
        </Card>
      )}

      {/* Step 2: 结果展示 */}
      {step === 2 && result && (
        <>
          {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic title="简历总数" value={result.total} prefix={<TeamOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="通过"
                  value={result.passedCount}
                  valueStyle={{ color: '#52c41a' }}
                  suffix={`/ ${result.total}`}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="未通过"
                  value={result.failedCount}
                  valueStyle={{ color: '#ff4d4f' }}
                  suffix={`/ ${result.total}`}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="平均分"
                  value={result.avgScore}
                  suffix="/ 100"
                  prefix={<RiseOutlined />}
                  valueStyle={{ color: scoreColor(result.avgScore) }}
                />
              </Card>
            </Col>
          </Row>

          {/* 分数分布 */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>分数分布：</span>
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((rangeStart) => {
                const rangeEnd = rangeStart + 10
                const count = result.results.filter(
                  (r) => r.score >= rangeStart && r.score < rangeEnd,
                ).length
                const maxCount = Math.max(
                  ...Array.from({ length: 11 }, (_, i) =>
                    result.results.filter((r) => r.score >= i * 10 && r.score < i * 10 + 10).length,
                  ),
                  1,
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
                    <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                      {rangeStart}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* 筛选 + 表格 */}
          <Card
            title={
              <Space>
                <FilterOutlined />
                筛选结果
              </Space>
            }
            extra={
              <Space>
                <Segmented
                  value={filterPass}
                  onChange={setFilterPass}
                  options={[
                    { label: `全部 (${result.results.length})`, value: 'all' },
                    { label: `通过 (${result.passedCount})`, value: 'pass' },
                    { label: `未通过 (${result.failedCount})`, value: 'fail' },
                  ]}
                />
                <Button icon={<DownloadOutlined />} onClick={() => message.success('已导出Excel')}>
                  导出
                </Button>
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
              rowClassName={(record) => record.passed ? '' : 'row-weak'}
              onRow={(record) => ({
                style: { background: record.passed ? undefined : '#fff8f8' },
              })}
            />
          </Card>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Space>
              <Button onClick={() => {
                setStep(0); setResult(null); setFiles([]); setJdContent(''); setProgress(0)
              }}>
                重新筛选
              </Button>
              <Button type="primary" icon={<DownloadOutlined />} onClick={() => message.success('已导出Excel')}>
                导出筛选报告
              </Button>
            </Space>
          </div>
        </>
      )}
    </div>
  )
}
