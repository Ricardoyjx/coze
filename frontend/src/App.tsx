import { useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, theme } from 'antd'
import {
  FileTextOutlined,
  TeamOutlined,
  HistoryOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import JDGeneratorPage from './pages/JDGeneratorPage'
import ResumeScreeningPage from './pages/ResumeScreeningPage'
import HistoryPage from './pages/HistoryPage'

const { Header, Sider, Content } = Layout

const menuItems = [
  {
    key: '/jd',
    icon: <FileTextOutlined />,
    label: 'JD智能生成',
  },
  {
    key: '/screening',
    icon: <TeamOutlined />,
    label: '简历初筛',
  },
  {
    key: '/history',
    icon: <HistoryOutlined />,
    label: '历史记录',
  },
]

function App() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  const selectedKey = menuItems.find((item) =>
    location.pathname.startsWith(item.key),
  )?.key || '/jd'

  return (
    <Layout className="app-layout">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        style={{ overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0 }}
      >
        <div className="logo">
          <RobotOutlined style={{ fontSize: 24 }} />
          {!collapsed && <span>招聘Agent</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            招聘JD自动生成与简历初筛Agent
          </h1>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          <Routes>
            <Route path="/" element={<JDGeneratorPage />} />
            <Route path="/jd" element={<JDGeneratorPage />} />
            <Route path="/screening" element={<ResumeScreeningPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
