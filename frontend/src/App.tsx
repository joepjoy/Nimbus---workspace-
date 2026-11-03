import { Route, Routes } from 'react-router-dom';
import { GuestRoute, ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './hooks/useAuth';
import { WorkspaceProvider } from './hooks/useWorkspace';
import { AppLayout } from './layouts/AppLayout';
import Board from './pages/Board';
import Dashboard from './pages/Dashboard';
import { ForgotPassword, ResetPassword } from './pages/ForgotPassword';
import Landing from './pages/Landing';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';
import ProjectDetail from './pages/ProjectDetail';
import Projects from './pages/Projects';
import Register from './pages/Register';
import Settings from './pages/Settings';
import TaskDetail from './pages/TaskDetail';
import Team from './pages/Team';
import Workspaces from './pages/Workspaces';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route
            path="/app"
            element={
              <WorkspaceProvider>
                <AppLayout />
              </WorkspaceProvider>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="workspaces" element={<Workspaces />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="board" element={<Board />} />
            <Route path="tasks/:id" element={<TaskDetail />} />
            <Route path="team" element={<Team />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
