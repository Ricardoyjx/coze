import { useState } from 'react'
import {
  Row, Col, Card, Input, Button, Space, Tag, Statistic, Progress, Divider, message, Select,
} from 'antd'
import {
  BarChartOutlined, ThunderboltOutlined, RiseOutlined, FallOutlined,
} from '@ant-design/icons'
import { analyzeSalary } from '../services/api'
import type { SalaryAnalysisData } from '../services/api'

const quickPositions = [
  '高级Java开发工程师',
  '产品经理（B端）',
  '前端开发工程师',
  '数据分析师',
  '算法工程师',
  'UI/UX设计师',
]

const cityOptions = [
  { label: '全国', value: '' },
  { label: '北京', value: '北京' },
  { label: '上海', value: '上海' },
  { label: '深圳', value: '深圳' },
  { label: '广州', value: '广州' },
  { label: '杭州', value: '杭州' },
  { label: '成都', value: '成都' },
  { label: '南京', value: '南京' },
  { label: '武汉', value: '武汉' },
  { label: '西安', value: '西安' },
]

export default function SalaryAnalysisPage() {
  const [position, setPosition] = useState('')
  const [city, setCity] = useState('')
  const [experience, setExperience] = useState('3-5年')
  const [education, setEducation] = useState('本科')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SalaryAnalysisData | null>(null)

  const handleAnalyze = async () => {
    if (!position.trim() || loading) return

    setLoading(true)
    setResult(null)

    try {
      const data = await analyzeSalary({
        position: position.trim(),
        city,
        experience,
        education,
      })
      // Check for error response from backend
      if (data && (data as any).error) {
        message.error((data as any).error)
        return
      }
      // Validate required fields before setting
      if (!data?.percentiles || !data?.experienceLevels || !data?.educationImpact) {
        message.error('返回数据格式异常，请重试')
        return
      }
      setResult(data)
    } catch (err: any) {
      message.error('分析失败：' + (err.message || '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  const maxPercentile = result?.percentiles?.p90 || 100

  return (
    <div>
      <div className="page-header">
        <h2><BarChartOutlined /> 薪资分析</h2>
        <p>输入岗位信息，基于市场数据提供合理薪资建议和行业对比分析</p>
      </div>

      <Row gutter={24}>
        {/* 左侧：输入表单 */}
        <Col xs={24} lg={10}>
          <Card
            title="分析条件"
            style={{ height: 'calc(100vh - 260px)' }}
            styles={{ body: { overflow: 'auto', height: 'calc(100% - 56px)' } }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* 快捷标签 */}
              <div>
                <span style={{ color: '#666', fontSize: 13, marginBottom: 8, display: 'block' }}>
                  <ThunderboltOutlined /> 热门岗位：
                </span>
                <Space wrap>
                  {quickPositions.map((pos, i) => (
                    <Tag
                      key={i}
                      color="blue"
                      style={{ cursor: 'pointer', padding: '2px 10px', fontSize: 12 }}
                      onClick={() => setPosition(pos)}
                    >
                      {pos}
                    </Tag>
                  ))}
                </Space>
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#333' }}>岗位名称 *</div>
                <Input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="如：高级Java开发工程师"
                />
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#333' }}>所在城市</div>
                <Select
                  value={city}
                  onChange={setCity}
                  options={cityOptions}
                  style={{ width: '100%' }}
                  placeholder="选择城市"
                />
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#333' }}>工作经验</div>
                <Select
                  value={experience}
                  onChange={setExperience}
                  options={[
                    { label: '1年以下', value: '1年以下' },
                    { label: '1-3年', value: '1-3年' },
                    { label: '3-5年', value: '3-5年' },
                    { label: '5-10年', value: '5-10年' },
                    { label: '10年以上', value: '10年以上' },
                  ]}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#333' }}>学历要求</div>
                <Select
                  value={education}
                  onChange={setEducation}
                  options={[
                    { label: '不限', value: '不限' },
                    { label: '大专', value: '大专' },
                    { label: '本科', value: '本科' },
                    { label: '硕士', value: '硕士' },
                    { label: '博士', value: '博士' },
                  ]}
                  style={{ width: '100%' }}
                />
              </div>

              <Button
                type="primary"
                size="large"
                icon={<BarChartOutlined />}
                onClick={handleAnalyze}
                loading={loading}
                disabled={!position.trim()}
                block
              >
                {loading ? '分析中...' : '开始分析'}
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 右侧：分析结果 */}
        <Col xs={24} lg={14}>
          <Card
            title="分析结果"
            style={{ height: 'calc(100vh - 260px)' }}
            styles={{ body: { overflow: 'auto', height: 'calc(100% - 56px)' } }}
          >
            {result ? (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* 概览卡片 */}
                <Row gutter={16}>
                  <Col span={8}>
                    <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
                      <Statistic
                        title="建议薪资范围"
                        value={result.recommendedRange || "-"}
                        valueStyle={{ fontSize: 18, color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" style={{ textAlign: 'center', background: '#e6f7ff' }}>
                      <Statistic
                        title="市场中位数"
                        value={result.percentiles?.p50 || 0}
                        suffix="K"
                        valueStyle={{ fontSize: 18, color: '#1677ff' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" style={{ textAlign: 'center', background: '#fff7e6' }}>
                      <Statistic
                        title="数据可信度"
                        value={result.confidence || "-"}
                        valueStyle={{ fontSize: 18, color: '#faad14' }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* 薪资分位数 */}
                <div>
                  <Divider orientation="left" style={{ fontSize: 14, fontWeight: 600 }}>薪资分布</Divider>
                  {[
                    { label: 'P10（偏低）', value: result.percentiles?.p10 || 0, color: '#91caff' },
                    { label: 'P25（较低）', value: result.percentiles?.p25 || 0, color: '#69b1ff' },
                    { label: 'P50（中位）', value: result.percentiles?.p50 || 0, color: '#1677ff' },
                    { label: 'P75（较高）', value: result.percentiles?.p75 || 0, color: '#fa8c16' },
                    { label: 'P90（偏高）', value: result.percentiles?.p90 || 0, color: '#ff4d4f' },
                  ].map((item) => (
                    <div key={item.label} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 13 }}>{item.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{item.value}K</span>
                      </div>
                      <Progress
                        percent={Math.round((item.value / maxPercentile) * 100)}
                        strokeColor={item.color}
                        showInfo={false}
                        size="small"
                      />
                    </div>
                  ))}
                </div>

                {/* 行业 / 城市对比 */}
                <Row gutter={16}>
                  <Col span={12}>
                    <Card size="small" title="行业对比" styles={{ body: { padding: '12px 16px' } }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#666' }}>本岗位均值</span>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#1677ff' }}>
                          {result.industryAvg || 0}K
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <span style={{ fontSize: 13, color: '#666' }}>全行业均值</span>
                        <span style={{ fontSize: 16, fontWeight: 600 }}>21K</span>
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13 }}>
                          {(result.industryAvg || 0) >= 21
                            ? <><RiseOutlined style={{ color: '#52c41a' }} /> 高于行业</>
                            : <><FallOutlined style={{ color: '#ff4d4f' }} /> 低于行业</>}
                        </span>
                        <span style={{
                          fontSize: 14, fontWeight: 600,
                          color: (result.industryAvg || 0) >= 21 ? '#52c41a' : '#ff4d4f',
                        }}>
                          {(result.industryAvg || 0) >= 21
                            ? `+${Math.round(((result.industryAvg || 0) / 21 - 1) * 100)}%`
                            : `${Math.round((1 - (result.industryAvg || 0) / 21) * 100)}%`}
                        </span>
                      </div>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" title="城市对比" styles={{ body: { padding: '12px 16px' } }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#666' }}>
                          {result.city || "全国"}均值
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#1677ff' }}>
                          {result.cityAvg || 0}K
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <span style={{ fontSize: 13, color: '#666' }}>全国均值</span>
                        <span style={{ fontSize: 16, fontWeight: 600 }}>{result.industryAvg || 0}K</span>
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13 }}>
                          {(result.cityAvg || 0) >= (result.industryAvg || 0)
                            ? <><RiseOutlined style={{ color: '#52c41a' }} /> 高于全国</>
                            : <><FallOutlined style={{ color: '#ff4d4f' }} /> 低于全国</>}
                        </span>
                        <span style={{
                          fontSize: 14, fontWeight: 600,
                          color: (result.cityAvg || 0) >= (result.industryAvg || 0) ? '#52c41a' : '#ff4d4f',
                        }}>
                          {(result.cityAvg || 0) >= (result.industryAvg || 0)
                            ? `+${Math.round(((result.cityAvg || 0) / (result.industryAvg || 1) - 1) * 100)}%`
                            : `${Math.round((1 - (result.cityAvg || 0) / (result.industryAvg || 1)) * 100)}%`}
                        </span>
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* 经验 vs 学历 */}
                <Row gutter={16}>
                  <Col span={12}>
                    <Card size="small" title="经验 vs 薪资" styles={{ body: { padding: '12px 16px' } }}>
                      {(result.experienceLevels || []).map((item) => (
                        <div key={item.level} style={{ marginBottom: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                            <span>{item.level}</span>
                            <span style={{ fontWeight: 600 }}>{item.salary}K</span>
                          </div>
                          <Progress
                            percent={Math.round((item.salary / maxPercentile) * 100)}
                            showInfo={false}
                            size="small"
                            strokeColor="#722ed1"
                          />
                        </div>
                      ))}
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" title="学历 vs 薪资" styles={{ body: { padding: '12px 16px' } }}>
                      {(result.educationImpact || []).map((item) => (
                        <div key={item.level} style={{ marginBottom: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                            <span>{item.level}</span>
                            <span style={{ fontWeight: 600 }}>{item.salary}K</span>
                          </div>
                          <Progress
                            percent={Math.round((item.salary / maxPercentile) * 100)}
                            showInfo={false}
                            size="small"
                            strokeColor="#13c2c2"
                          />
                        </div>
                      ))}
                    </Card>
                  </Col>
                </Row>
              </Space>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#999' }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>💰</p>
                <p>在左侧输入岗位信息后，点击「开始分析」</p>
                <p style={{ fontSize: 13 }}>AI将基于市场数据提供合理的薪资建议</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
