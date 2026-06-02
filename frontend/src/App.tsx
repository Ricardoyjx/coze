import { useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, theme } from 'antd'
import {
  FileTextOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
  FilterOutlined,
  MailOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  BarChartOutlined,
  ApiOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import JDGeneratorPage from './pages/JDGeneratorPage'
import ResumeScreeningPage from './pages/ResumeScreeningPage'
import InterviewQuestionsPage from './pages/InterviewQuestionsPage'
import BatchScreeningPage from './pages/BatchScreeningPage'
import OfferEmailPage from './pages/OfferEmailPage'
import MockInterviewPage from './pages/MockInterviewPage'
import DashboardPage from './pages/DashboardPage'
import SalaryAnalysisPage from './pages/SalaryAnalysisPage'
import CozePage from "./pages/CozePage"

const { Header, Sider, Content } = Layout

const mainMenuItems = [
  {
    key: '/jd',
    icon: <FileTextOutlined />,
    label: 'JD生成',
  },
  {
    key: '/screening',
    icon: <TeamOutlined />,
    label: '简历初筛',
  },
  {
    key: '/interview-questions',
    icon: <QuestionCircleOutlined />,
    label: '面试题',
  },
  {
    key: '/batch-screening',
    icon: <FilterOutlined />,
    label: '批量筛选',
  },
  {
    key: '/offer-email',
    icon: <MailOutlined />,
    label: 'Offer邮件',
  },
  {
    key: '/mock-interview',
    icon: <CustomerServiceOutlined />,
    label: '模拟面试',
  },
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '数据看板',
  },
  {
    key: '/salary',
    icon: <BarChartOutlined />,
    label: '薪资分析',
  },
]

const bottomMenuItems = [
  {
    key: '/coze',
    icon: <ApiOutlined />,
    label: 'Coze配置',
  },
]

function App() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

    const basePath = '/' + (location.pathname.split('/')[1] || 'jd')
  const bottomSelected = bottomMenuItems.find((item) => item.key === basePath) ? basePath : ''

  return (
    <Layout className="app-layout">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={200}
        style={{ height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0 }}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="logo">
            <RobotOutlined style={{ fontSize: 24 }} />
            {!collapsed && <span>招聘助手</span>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[basePath]}
              items={mainMenuItems}
              onClick={({ key }) => navigate(key)}
            />
          </div>
          <div>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[bottomSelected]}
              items={bottomMenuItems}
              onClick={({ key }) => navigate(key)}
              style={{ borderInlineEnd: 'none' }}
            />
          </div>
        </div>
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <RobotOutlined style={{ fontSize: 20, color: '#1677ff' }} />
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              招聘助手
            </h1>
          </div>
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
            <Route path="/interview-questions" element={<InterviewQuestionsPage />} />
            <Route path="/batch-screening" element={<BatchScreeningPage />} />
            <Route path="/offer-email" element={<OfferEmailPage />} />
            <Route path="/mock-interview" element={<MockInterviewPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/salary" element={<SalaryAnalysisPage />} />
            <Route path="/coze" element={<CozePage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
