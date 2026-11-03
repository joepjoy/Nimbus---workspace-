import { Router } from 'express';
import * as auth from '../controllers/auth';
import * as dashboard from '../controllers/dashboard';
import * as projects from '../controllers/projects';
import * as tasks from '../controllers/tasks';
import * as workspaces from '../controllers/workspaces';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();
const authLimiter = rateLimit(30, 15 * 60 * 1000);

// Auth
router.post('/auth/register', authLimiter, auth.register);
router.post('/auth/login', authLimiter, auth.login);
router.post('/auth/logout', auth.logout);
router.post('/auth/forgot-password', authLimiter, auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, auth.resetPassword);
router.get('/auth/me', requireAuth, auth.me);
router.put('/auth/me', requireAuth, auth.updateMe);
router.put('/auth/password', requireAuth, auth.changePassword);

// Everything below requires a signed-in user
router.use(requireAuth);

router.get('/workspaces', workspaces.list);
router.post('/workspaces', workspaces.create);
router.get('/workspaces/:id', workspaces.get);
router.put('/workspaces/:id', workspaces.update);
router.delete('/workspaces/:id', workspaces.remove);
router.get('/workspaces/:id/members', workspaces.listMembers);
router.post('/workspaces/:id/members', workspaces.addMember);
router.put('/workspaces/:id/members/:userId', workspaces.updateMemberRole);
router.delete('/workspaces/:id/members/:userId', workspaces.removeMember);
router.get('/workspaces/:id/activities', workspaces.listActivities);

router.get('/projects', projects.list);
router.post('/projects', projects.create);
router.get('/projects/:id', projects.get);
router.put('/projects/:id', projects.update);
router.delete('/projects/:id', projects.remove);

router.get('/tasks', tasks.list);
router.post('/tasks', tasks.create);
router.get('/tasks/:id', tasks.get);
router.put('/tasks/:id', tasks.update);
router.delete('/tasks/:id', tasks.remove);

router.get('/dashboard/stats', dashboard.stats);

export default router;
