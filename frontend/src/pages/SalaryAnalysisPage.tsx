import { Card } from 'antd'
import { BarChartOutlined } from '@ant-design/icons'

export default function SalaryAnalysisPage() {
  return (
    <div>
      <div className="page-header">
        <h2><BarChartOutlined /> 薪资分析</h2>
        <p>基于市场数据和岗位要求，AI提供合理薪资建议和行业对比分析</p>
      </div>
      <Card>
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#999' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>💰</p>
          <p>薪资分析功能即将上线，敬请期待</p>
        </div>
      </Card>
    </div>
  )
}
