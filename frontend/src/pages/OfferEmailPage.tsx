import { Card } from 'antd'
import { MailOutlined } from '@ant-design/icons'

export default function OfferEmailPage() {
  return (
    <div>
      <div className="page-header">
        <h2><MailOutlined /> Offer邮件</h2>
        <p>AI自动生成专业、规范的Offer录用邮件，支持个性化定制</p>
      </div>
      <Card>
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#999' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>✉️</p>
          <p>Offer邮件生成功能即将上线，敬请期待</p>
        </div>
      </Card>
    </div>
  )
}
