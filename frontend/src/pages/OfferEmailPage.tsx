import { useState } from 'react'
import {
  Row, Col, Card, Input, Button, Space, message, Tag, Select, DatePicker,
} from 'antd'
import {
  SendOutlined, CopyOutlined, ThunderboltOutlined, MailOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import dayjs from 'dayjs'
import { streamOfferEmail } from '../services/api'

const { TextArea } = Input

const quickTemplates = [
  { label: 'Java开发', data: { position: '高级Java开发工程师', salary: '20-30K × 14薪' } },
  { label: '产品经理', data: { position: '产品经理（B端）', salary: '18-28K × 13薪' } },
  { label: '前端开发', data: { position: '前端开发工程师', salary: '15-25K × 14薪' } },
  { label: '数据分析', data: { position: '高级数据分析师', salary: '16-26K × 13薪' } },
  { label: 'UI/UX设计', data: { position: 'UI/UX设计师', salary: '15-25K × 14薪' } },
]

export default function OfferEmailPage() {
  const [candidateName, setCandidateName] = useState('')
  const [position, setPosition] = useState('')
  const [salary, setSalary] = useState('')
  const [startDate, setStartDate] = useState('')
  const [location, setLocation] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailContent, setEmailContent] = useState('')

  const formFilled = candidateName.trim() && position.trim() && salary.trim() && startDate.trim() && location.trim() && companyName.trim()

  const handleGenerate = async () => {
    if (!formFilled || loading) return

    setEmailContent('')
    setLoading(true)

    await streamOfferEmail(
      {
        candidateName: candidateName.trim(),
        position: position.trim(),
        salary: salary.trim(),
        startDate: startDate.trim() || '待确认',
        location: location.trim() || '待确认',
        notes: notes.trim(),
        companyName: companyName.trim(),
      },
      (chunk) => {
        setEmailContent((prev) => prev + chunk)
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
    navigator.clipboard.writeText(emailContent)
    message.success('已复制到剪贴板')
  }

  const applyTemplate = (data: { position: string; salary: string }) => {
    setPosition(data.position)
    setSalary(data.salary)
  }

  return (
    <div>
      <div className="page-header">
        <h2><MailOutlined /> Offer邮件</h2>
        <p>填写候选人信息，AI自动生成专业、规范的Offer录用邮件</p>
      </div>

      <Row gutter={24}>
        {/* 左侧：信息表单 */}
        <Col xs={24} lg={12}>
          <Card
            title="候选人信息"
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
                  {quickTemplates.map((tpl, i) => (
                    <Tag
                      key={i}
                      color="blue"
                      style={{ cursor: 'pointer', padding: '2px 10px', fontSize: 12 }}
                      onClick={() => applyTemplate(tpl.data)}
                    >
                      {tpl.label}
                    </Tag>
                  ))}
                </Space>
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, color: "#333", fontWeight: 500 }}>候选人姓名 *</div>
                <Input
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="如：张三"
                />
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, color: "#333", fontWeight: 500 }}>录用岗位 *</div>
                <Select
                  value={position || undefined}
                  onChange={setPosition}
                  placeholder="请选择录用岗位"
                  options={[
                    { label: '高级Java开发工程师', value: '高级Java开发工程师' },
                    { label: '产品经理（B端）', value: '产品经理（B端）' },
                    { label: '前端开发工程师', value: '前端开发工程师' },
                    { label: '高级数据分析师', value: '高级数据分析师' },
                    { label: '算法工程师', value: '算法工程师' },
                    { label: 'UI/UX设计师', value: 'UI/UX设计师' },
                    { label: '测试开发工程师', value: '测试开发工程师' },
                    { label: '运维工程师', value: '运维工程师' },
                  ]}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, color: "#333", fontWeight: 500 }}>薪资待遇 *</div>
                <Input
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="如：20-30K × 14薪"
                />
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, color: "#333", fontWeight: 500 }}>报到日期 *</div>
                <DatePicker
                  value={startDate ? dayjs(startDate, 'YYYY-MM-DD') : null}
                  onChange={(date) => setStartDate(date ? date.format('YYYY-MM-DD') : '')}
                  style={{ width: '100%' }}
                  placeholder="选择报到日期"
                  disabledDate={(current) => current && current.isBefore(dayjs(), 'day')}
                />
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, color: "#333", fontWeight: 500 }}>工作地点 *</div>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="如：北京市朝阳区"
                />
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, color: "#333", fontWeight: 500 }}>公司名称 *</div>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="如：XXXX科技有限公司"
                />
              </div>

              <div>
                <div style={{ marginBottom: 4, fontSize: 14, color: "#333", fontWeight: 500 }}>备注信息</div>
                <TextArea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="其他需要说明的内容..."
                  autoSize={{ minRows: 2, maxRows: 4 }}
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
                {loading ? '正在生成...' : '生成Offer邮件'}
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 右侧：邮件预览 */}
        <Col xs={24} lg={12}>
          <Card
            title="邮件预览"
            extra={
              emailContent && (
                <Button icon={<CopyOutlined />} onClick={handleCopy}>
                  复制全文
                </Button>
              )
            }
            style={{ height: 'calc(100vh - 260px)' }}
            styles={{ body: { overflow: 'auto', height: 'calc(100% - 56px)' } }}
          >
            {emailContent ? (
              <div className="jd-preview">
                <ReactMarkdown>{emailContent}</ReactMarkdown>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#999' }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>✉️</p>
                <p>在左侧填写候选人信息后，点击「生成Offer邮件」</p>
                <p style={{ fontSize: 13 }}>AI将自动生成规范的录用通知书</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
