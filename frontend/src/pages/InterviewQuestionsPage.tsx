import { Card } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'

export default function InterviewQuestionsPage() {
  return (
    <div>
      <div className="page-header">
        <h2><QuestionCircleOutlined /> 面试题</h2>
        <p>根据岗位要求和简历内容，AI自动生成针对性的面试题目</p>
      </div>
      <Card>
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#999' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>📋</p>
          <p>面试题生成功能即将上线，敬请期待</p>
        </div>
      </Card>
    </div>
  )
}
