import { Row, Col, Card, Statistic } from 'antd'
import { DashboardOutlined, FileTextOutlined, TeamOutlined, StarFilled, RiseOutlined } from '@ant-design/icons'

export default function DashboardPage() {
  return (
    <div>
      <div className="page-header">
        <h2><DashboardOutlined /> 数据看板</h2>
        <p>招聘全流程数据可视化，实时掌握招聘进展和关键指标</p>
      </div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="待处理JD" value={12} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="简历总数" value={246} prefix={<TeamOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="面试中" value={18} prefix={<StarFilled />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="通过率" value="68%" prefix={<RiseOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>📊</p>
          <p>数据看板详细图表即将上线，敬请期待</p>
        </div>
      </Card>
    </div>
  )
}
