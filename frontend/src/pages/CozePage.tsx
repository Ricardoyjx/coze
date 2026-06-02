import { useState, useEffect } from 'react'
import {
  Card, Tag, Space, Table, Spin, Alert, Descriptions, Button, Collapse, message,
} from 'antd'
import {
  ApiOutlined, CheckCircleFilled, CloseCircleFilled, ReloadOutlined, CheckOutlined,
} from '@ant-design/icons'
import { fetchCozeStatus, selectCozeBot } from '../services/api'
import type { CozeStatus, CozeSpace } from '../services/api'

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
        <h2><ApiOutlined /> Coze 配置状态</h2>
        <p>多 Space / 多 Bot 配置管理</p>
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
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="已配置 Space 数">
                <Tag color="blue">{status.spaces_configured}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="工作流配置数">
                <Tag color="blue">
                  {Object.values(status.workflows).filter((w) => w.configured).length}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="工作流配置" style={{ marginBottom: 16 }}>
            <Table
              dataSource={Object.entries(status.workflows).map(([key, val]) => ({
                key,
                label: ({
                  jd_generate: 'JD 生成',
                  screening: '简历初筛',
                  offer_email: 'Offer 邮件',
                } as Record<string, string>)[key] || key,
                ...val,
              }))}
              columns={[
                { title: '功能', dataIndex: 'label', key: 'label' },
                {
                  title: '状态', dataIndex: 'configured', key: 'configured',
                  render: (v: boolean) => TagStatus(v),
                },
                {
                  title: 'Workflow ID', dataIndex: 'id', key: 'id',
                  render: (v: string) => v ? '******' : '-',
                },
              ]}
              rowKey="key"
              pagination={false}
              size="small"
            />
          </Card>

          {status.spaces.map((space: CozeSpace) => (
            <Card
              key={space.space_id}
              title={
                <Space>
                  <span>{space.name || space.space_id}</span>
                  <Tag>{space.space_id}</Tag>
                  {TagStatus(space.api_key_configured)}
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions column={2} size="small" style={{ marginBottom: 12 }}>
                <Descriptions.Item label="API Key">
                  {space.api_key_configured ? '******' : <span style={{ color: '#999' }}>未配置</span>}
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
                defaultActiveKey={space.bot_id ? [] : ['bots']}
                items={[{
                  key: 'bots',
                  label: (
                    <Space>
                      <span>Bot 列表</span>
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
