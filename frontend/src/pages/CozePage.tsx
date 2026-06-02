import { useState, useEffect } from 'react'
import {
  Card, Row, Col, Tag, Space, Table, Spin, Alert, Descriptions, Button,
} from 'antd'
import {
  ApiOutlined, CheckCircleFilled, CloseCircleFilled, ReloadOutlined,
} from '@ant-design/icons'
import { fetchCozeStatus } from '../services/api'
import type { CozeStatus } from '../services/api'

export default function CozePage() {
  const [status, setStatus] = useState<CozeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const TagStatus = (ok: boolean, label?: string) => (
    <Tag
      icon={ok ? <CheckCircleFilled /> : <CloseCircleFilled />}
      color={ok ? 'success' : 'error'}
    >
      {label || (ok ? '已配置' : '未配置')}
    </Tag>
  )

  const workflowColumns = [
    { title: '工作流', dataIndex: 'key', key: 'key' },
    {
      title: '状态', dataIndex: 'configured', key: 'configured',
      render: (v: boolean) => TagStatus(v),
    },
    { title: 'Workflow ID', dataIndex: 'id', key: 'id', render: (v: string) => v ? '******' : '-' },
  ]

  const botColumns = [
    { title: 'Bot ID', dataIndex: 'bot_id', key: 'bot_id' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '状态', dataIndex: 'status', key: 'status' },
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
        <p>检测 Coze API 连接状态、工作流配置和可用 Bot 列表</p>
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
          {/* API 连接状态 */}
          <Card
            title="API 连接"
            extra={
              <Button size="small" icon={<ReloadOutlined />} onClick={loadStatus}>
                刷新
              </Button>
            }
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="API Token">
                {TagStatus(status.token_configured)}
              </Descriptions.Item>
              <Descriptions.Item label="API 地址">
                api.coze.cn
              </Descriptions.Item>
              <Descriptions.Item label="工作空间" span={2}>
                {status.workspaces.length > 0
                  ? status.workspaces.map((ws) => (
                      <Tag key={ws.id} color="blue">{ws.name} ({ws.id})</Tag>
                    ))
                  : <span style={{ color: '#999' }}>无</span>
                }
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 工作流配置 */}
          <Card title="工作流配置" style={{ marginBottom: 16 }}>
            <Table
              dataSource={Object.entries(status.workflows).map(([key, val]) => ({
                key: key,
                label: ({
                  jd_generate: 'JD 生成',
                  screening: '简历初筛',
                  offer_email: 'Offer 邮件',
                })[key] || key,
                ...val,
              }))}
              columns={[
                { title: '功能', dataIndex: 'label', key: 'label' },
                ...workflowColumns.slice(1),
              ]}
              rowKey="key"
              pagination={false}
              size="small"
            />
          </Card>

          {/* Bot 列表 */}
          <Card
            title={
              <Space>
                <span>Bot 列表</span>
                <Tag>{status.bots.length}</Tag>
              </Space>
            }
          >
            {status.bots.length > 0 ? (
              <Table
                dataSource={status.bots}
                columns={botColumns}
                rowKey="bot_id"
                pagination={false}
                size="small"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                {status.error ? (
                  <Space direction="vertical">
                    <CloseCircleFilled style={{ fontSize: 32, color: '#ff4d4f' }} />
                    <p>获取 Bot 列表失败</p>
                    <p style={{ fontSize: 13 }}>{status.error}</p>
                  </Space>
                ) : (
                  <Space direction="vertical">
                    <ApiOutlined style={{ fontSize: 32 }} />
                    <p>当前工作空间下没有 Bot</p>
                  </Space>
                )}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
