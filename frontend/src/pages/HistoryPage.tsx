import { useState } from 'react'
import { Card, List, Tag, Button, Space, Input, Tabs, Empty, Row, Col, Statistic, Modal } from 'antd'
import {
  SearchOutlined,
  FileTextOutlined,
  TeamOutlined,
  EyeOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'

const { Search } = Input

// Mock历史数据
const mockHistory = {
  jds: [
    {
      id: '1',
      title: '高级Java开发工程师',
      content: '## 高级Java开发工程师\n\n### 岗位职责\n1. 负责核心业务系统的架构设计与开发\n2. 参与微服务架构的优化与演进\n\n### 任职要求\n- 本科及以上学历，计算机相关专业\n- 5年以上Java开发经验\n- 精通Spring Boot/Spring Cloud微服务架构',
      keywords: 'Java, 微服务, Spring Boot',
      createdAt: '2026-06-01 14:30',
    },
    {
      id: '2',
      title: '产品经理（B端）',
      content: '## 产品经理（B端）\n\n### 岗位职责\n1. 负责B端SaaS产品的需求分析与规划\n2. 撰写产品需求文档（PRD）\n\n### 任职要求\n- 本科及以上学历\n- 3年以上B端产品经验\n- 有SaaS行业背景优先',
      keywords: '产品经理, B端, SaaS',
      createdAt: '2026-05-28 10:15',
    },
  ],
  screenings: [
    {
      id: 's1',
      jdTitle: '高级Java开发工程师',
      totalResumes: 25,
      topScore: 92,
      avgScore: 65,
      strongCount: 3,
      status: 'completed',
      createdAt: '2026-06-01 15:00',
    },
    {
      id: 's2',
      jdTitle: '产品经理（B端）',
      totalResumes: 18,
      topScore: 88,
      avgScore: 58,
      strongCount: 2,
      status: 'completed',
      createdAt: '2026-05-28 11:00',
    },
  ],
}

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState('jds')
  const [jdModalVisible, setJdModalVisible] = useState(false)
  const [selectedJD, setSelectedJD] = useState<typeof mockHistory.jds[0] | null>(null)

  const handleViewJD = (jd: typeof mockHistory.jds[0]) => {
    setSelectedJD(jd)
    setJdModalVisible(true)
  }

  return (
    <div>
      <div className="page-header">
        <h2>📋 历史记录</h2>
        <p>查看所有已生成的JD和简历初筛任务记录</p>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="已生成JD" value={mockHistory.jds.length} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="初筛任务" value={mockHistory.screenings.length} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="筛选简历总数" value={mockHistory.screenings.reduce((s, t) => s + t.totalResumes, 0)} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="推荐候选人" value={mockHistory.screenings.reduce((s, t) => s + t.strongCount, 0)} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'jds',
              label: <span><FileTextOutlined /> JD生成记录</span>,
              children: (
                <>
                  <Search
                    placeholder="搜索JD..."
                    style={{ marginBottom: 16, maxWidth: 400 }}
                    prefix={<SearchOutlined />}
                  />
                  <List
                    dataSource={mockHistory.jds}
                    renderItem={(item) => (
                      <List.Item
                        actions={[
                          <Button
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewJD(item)}
                          >
                            查看
                          </Button>,
                          <Button type="link" icon={<ReloadOutlined />}>
                            重新生成
                          </Button>,
                          <Button type="link" danger icon={<DeleteOutlined />}>
                            删除
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<FileTextOutlined style={{ fontSize: 24, color: '#1677ff', marginTop: 4 }} />}
                          title={item.title}
                          description={
                            <Space>
                              <Tag color="blue">{item.keywords}</Tag>
                              <span style={{ color: '#999', fontSize: 12 }}>{item.createdAt}</span>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </>
              ),
            },
            {
              key: 'screenings',
              label: <span><TeamOutlined /> 初筛任务记录</span>,
              children: (
                <>
                  <Search
                    placeholder="搜索任务..."
                    style={{ marginBottom: 16, maxWidth: 400 }}
                    prefix={<SearchOutlined />}
                  />
                  <List
                    dataSource={mockHistory.screenings}
                    renderItem={(item) => (
                      <List.Item
                        actions={[
                          <Button type="link" icon={<EyeOutlined />}>
                            查看结果
                          </Button>,
                          <Button type="link" icon={<ReloadOutlined />}>
                            重新筛选
                          </Button>,
                          <Button type="link" danger icon={<DeleteOutlined />}>
                            删除
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<TeamOutlined style={{ fontSize: 24, color: '#52c41a', marginTop: 4 }} />}
                          title={item.jdTitle}
                          description={
                            <Space>
                              <Tag>{item.totalResumes}份简历</Tag>
                              <Tag color="green">最高分 {item.topScore}</Tag>
                              <Tag color="orange">平均分 {item.avgScore}</Tag>
                              <Tag color="blue">{item.strongCount}人推荐</Tag>
                              <span style={{ color: '#999', fontSize: 12 }}>{item.createdAt}</span>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={selectedJD?.title}
        open={jdModalVisible}
        onCancel={() => setJdModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setJdModalVisible(false)}>关闭</Button>,
          <Button key="copy" type="primary" onClick={() => {
            if (selectedJD) navigator.clipboard.writeText(selectedJD.content)
          }}>
            复制内容
          </Button>,
        ]}
        width={700}
      >
        {selectedJD && <ReactMarkdown>{selectedJD.content}</ReactMarkdown>}
      </Modal>
    </div>
  )
}
