import { useState, useEffect } from 'react'
import {
  Card, Tag, Space, Table, Spin, Alert, Descriptions, Button, Collapse, message,
} from 'antd'
import {
  ApiOutlined, CheckCircleFilled, CloseCircleFilled, ReloadOutlined, CheckOutlined,
} from '@ant-design/icons'
import { fetchCozeStatus, selectCozeBot } from '../services/api'
import type { CozeStatus, CozeSpace } from '../services/api'

const SPACE_ORDER: Record<string, number> = {
  jd_generator: 1,
  resume_screening: 2,
  interview_questions: 3,
  batch_screening: 4,
  offer_email: 5,
  salary_analysis: 6,
  coze: 7,
}

function sortBySidebar(a: { space_id: string }, b: { space_id: string }) {
  return (SPACE_ORDER[a.space_id] || 99) - (SPACE_ORDER[b.space_id] || 99)
}

export default function CozePage() {
  const [status, setStatus] = useState<CozeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selecting, setSelecting] = useState<string | null>(null)

  const loadStatus = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchCozeStatus()
      setStatus(data)
    } catch (err: any) {
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const handleSelectBot = async (spaceId: string, botId: string) => {
    setSelecting(`${spaceId}:${botId}`)
    try {
      await selectCozeBot(spaceId, botId)
      message.success('Bot 已切换')
      await loadStatus()
    } catch (err: any) {
      message.error(err.message || '切换失败')
    } finally {
      setSelecting(null)
    }
  }

  const TagStatus = (ok: boolean, label?: string) => (
    <Tag
      icon={ok ? <CheckCircleFilled /> : <CloseCircleFilled />}
      color={ok ? 'success' : 'error'}
    >
      {label || (ok ? '已配置' : '未配置')}
    </Tag>
  )

  const botColumns = (spaceId: string, currentBotId: string) => [
    { title: 'Bot ID', dataIndex: 'bot_id', key: 'bot_id' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type={record.bot_id === currentBotId ? 'primary' : 'default'}
          size="small"
          icon={record.bot_id === currentBotId ? <CheckOutlined /> : undefined}
          loading={selecting === `${spaceId}:${record.bot_id}`}
          onClick={() => handleSelectBot(spaceId, record.bot_id)}
        >
          {record.bot_id === currentBotId ? '当前' : '选择'}
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 0' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#999' }}>正在检测 Coze 配置...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}><ApiOutlined /> Coze 配置状态</h2>
        <p style={{ fontSize: 14, color: '#666', margin: 0 }}>多 Space / 多 Bot 配置管理</p>
      </div>

      {error && (
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={loadStatus}>重试</Button>}
        />
      )}

      {status && (
        <>
          <Card
            title="概览"
            extra={
              <Button size="small" icon={<ReloadOutlined />} onClick={loadStatus}>
                刷新
              </Button>
            }
            style={{ marginBottom: 16, fontSize: 14 }}
          >
            <Descriptions column={4} size="small">
              <Descriptions.Item label="已配置 Space 数">
                <Tag color="blue">{status.spaces_configured}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="已配置 Bot 数">
                <Tag color="blue">
                  {status.spaces.filter((s) => s.api_key_configured && !!s.bot_id).length}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Bot ID 状态" style={{ marginBottom: 16, fontSize: 14 }}>
            <Table
              dataSource={status.spaces.filter((s) => s.space_id !== 'mock_interview' && s.space_id !== 'data_dashboard').sort(sortBySidebar).map((s) => ({
                key: s.space_id,
                label: s.name || s.space_id,
                space_id: s.space_id,
                configured: s.api_key_configured && !!s.bot_id,
                bot_id: s.bot_id,
                api_ok: s.api_key_configured,
              }))}
              columns={[
                { title: 'Space', dataIndex: 'label', key: 'label' },
                {
                  title: 'API Key', dataIndex: 'api_ok', key: 'api_ok',
                  render: (v: boolean) => TagStatus(v, v ? '已配置' : '未配置'),
                },
                {
                  title: 'Bot ID', dataIndex: 'bot_id', key: 'bot_id',
                  render: (v: string) => v ? <Tag color="blue">{v}</Tag> : <span style={{ color: '#999' }}>-</span>,
                },
              ]}
              rowKey="key"
              pagination={false}
              size="small"
            />
          </Card>

          {status.spaces.filter((s) => s.space_id !== 'mock_interview' && s.space_id !== 'data_dashboard').sort(sortBySidebar).map((space: CozeSpace) => (
            <Card
              key={space.space_id}
              title={
                <Space>
                  <span>{space.name || space.space_id}</span>
                  <Tag>{space.space_id}</Tag>
                  {TagStatus(space.api_key_configured)}
                </Space>
              }
              style={{ marginBottom: 16, fontSize: 14 }}
            >
              <Descriptions column={3} size="small" style={{ marginBottom: 12 }}>
                <Descriptions.Item label="API Key">
                  {space.api_key_configured ? <Tag color="green">已配置</Tag> : <span style={{ color: '#999' }}>未配置</span>}
                </Descriptions.Item>
                <Descriptions.Item label="当前 Bot">
                  {space.bot_id
                    ? <Tag color="blue">{space.bot_id}</Tag>
                    : <span style={{ color: '#999' }}>未设置（下方选择）</span>
                  }
                </Descriptions.Item>
              </Descriptions>

              {space.error && (
                <Alert
                  message={space.error}
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                  closable
                />
              )}

              <Collapse
                size="small"
                defaultActiveKey={[]}
                items={[{
                  key: 'bots',
                  label: (
                    <Space>
                      <span style={{ fontWeight: 500 }}>Bot 列表</span>
                      <Tag>{space.bots.length}</Tag>
                    </Space>
                  ),
                  children: space.bots.length > 0 ? (
                    <Table
                      dataSource={space.bots}
                      columns={botColumns(space.space_id, space.bot_id)}
                      rowKey="bot_id"
                      pagination={false}
                      size="small"
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                      当前空间下没有 Bot
                    </div>
                  ),
                }]}
              />
            </Card>
          ))}

          {status.spaces.length === 0 && (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <ApiOutlined style={{ fontSize: 32, marginBottom: 12 }} />
                <p>未检测到任何 Coze Space 配置</p>
                <p style={{ fontSize: 13 }}>请在 `.env` 文件中配置 `COZE_SPACES_CONFIG`</p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
