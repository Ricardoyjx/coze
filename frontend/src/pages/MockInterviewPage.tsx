import { Card } from 'antd'
import { CustomerServiceOutlined } from '@ant-design/icons'

export default function MockInterviewPage() {
  return (
    <div>
      <div className="page-header">
        <h2><CustomerServiceOutlined /> 模拟面试</h2>
        <p>AI模拟面试官进行真实场景面试，帮助候选人提前演练</p>
      </div>
      <Card>
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#999' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>🎙️</p>
          <p>模拟面试功能即将上线，敬请期待</p>
        </div>
      </Card>
    </div>
  )
}
