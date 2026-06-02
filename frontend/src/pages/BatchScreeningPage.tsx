import { Card } from 'antd'
import { FilterOutlined } from '@ant-design/icons'

export default function BatchScreeningPage() {
  return (
    <div>
      <div className="page-header">
        <h2><FilterOutlined /> 批量筛选</h2>
        <p>批量上传简历文件，AI自动解析、评分并排序，高效筛选候选人</p>
      </div>
      <Card>
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#999' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>📁</p>
          <p>批量筛选功能即将上线，敬请期待</p>
        </div>
      </Card>
    </div>
  )
}
