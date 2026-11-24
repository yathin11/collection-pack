import { createClient, SupabaseClient } from '@supabase/supabase-js';
import './style.css';

// -------------------------------------------------------------
// Types & Interfaces
// -------------------------------------------------------------
export type UserRole = 'admin' | 'owner' | 'collector';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  phone?: string;
  business_name?: string;
  password_hash?: string;
  role: UserRole;
  status: UserStatus;
  workspace_id: string | null;
  created_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  email_verified?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  owner_email: string;
  daily_on: boolean;
  weekly_on: boolean;
  currency: string;
  created_at: string;
  cloud_sync: boolean;
  last_cloud_backup?: string | null;
}

// Backwards-compatibility alias
export type Org = Workspace;

export interface Customer {
  id: string;
  workspace_id?: string;
  org_id?: string;
  name: string;
  phone: string;
  area?: string;
  village?: string;
  address?: string;
  loc?: string;
  id_note?: string;
  guarantor?: string;
  notes?: string;
  created_at?: string;
}

export interface Loan {
  id: string;
  workspace_id?: string;
  org_id?: string;
  customer_id: string;
  mode: 'daily' | 'weekly';
  principal: number;
  int_type: 'pct' | 'amt';
  int_val: number;
  total: number;
  n: number;
  inst: number;
  start_date: string;
  created_at?: string;
}

export interface Payment {
  id: string;
  workspace_id?: string;
  org_id?: string;
  loan_id: string;
  amount: number;
  paid_on: string;
  by_user?: string;
  notes?: string;
  created_at?: string;
}

export interface PlanDay {
  id: string;
  workspace_id?: string;
  org_id?: string;
  day: string;
  loan_id: string;
}

export interface Row {
  l: Loan;
  c: Customer;
  paid: number;
  outstanding: number;
  pending: number;
  dueToday: boolean;
  risk: boolean;
  cleared: boolean;
  paidOn: number;
  progressPct: number;
}

// -------------------------------------------------------------
// Constants & Secure Super Admin Config
// -------------------------------------------------------------
export const SUPER_ADMIN_EMAIL = 'yathinm316@gmail.com';
export const DEFAULT_ADMIN_EMAIL = SUPER_ADMIN_EMAIL;
// Cryptographic SHA-256 digest of super admin master password (plain text never exposed)
const ADMIN_PASS_HASH = '42b3fd8795789a5bd0a373448e269ba32cc0fd92c10d1de3b3ed13c501272cb3';

export async function hashPassword(input: string): Promise<string> {
  if (!input) return '';
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return '';
  }
}

export async function verifyAdminPassword(input: string): Promise<boolean> {
  if (!input) return false;
  try {
    const hex = await hashPassword(input.trim());
    return hex === ADMIN_PASS_HASH;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// Supabase Client Setup (Safe & Fault-tolerant)
// -------------------------------------------------------------
const ENV_URL = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const ENV_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

export const getStoredCloudConfig = () => {
  return {
    url: localStorage.getItem('cm_cloud_url') || ENV_URL,
    key: localStorage.getItem('cm_cloud_key') || ENV_KEY,
  };
};

export const setStoredCloudConfig = (url: string, key: string) => {
  localStorage.setItem('cm_cloud_url', url.trim());
  localStorage.setItem('cm_cloud_key', key.trim());
};

let _sb: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (_sb) return _sb;
  const cfg = getStoredCloudConfig();
  if (cfg.url && cfg.key && !cfg.url.includes('YOUR-PROJECT') && cfg.url.startsWith('http')) {
    try {
      _sb = createClient(cfg.url, cfg.key, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
      return _sb;
    } catch (e) {
      console.warn('Supabase initialization failed:', e);
    }
  }
  return null;
}
export const sb = getSupabase() || createClient('https://mock-local.supabase.co', 'mock-key', { auth: { persistSession: false } });

// -------------------------------------------------------------
// Utilities & Formatting
// -------------------------------------------------------------
export const $ = (s: string) => document.querySelector(s) as HTMLElement;
export const $$ = (s: string) => Array.from(document.querySelectorAll(s)) as HTMLElement[];
export const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
export const money = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => iso(new Date());
export const addDays = (s: string, n: number) => {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const formatDate = (s: string) => {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
export const dd = (a: string, b: string) => Math.round((+new Date(b + 'T00:00:00') - +new Date(a + 'T00:00:00')) / 86400000);
export const stepOf = (l: Loan) => (l.mode === 'daily' ? 1 : 7);
export const endDate = (l: Loan) => addDays(l.start_date, Number(l.n) * stepOf(l));
export const wa = (phone: string, text: string) => {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  return cleanPhone ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}` : '#';
};
export const uid = () => 'id_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

// -------------------------------------------------------------
// Modern Toast Notification System
// -------------------------------------------------------------
export function toast(msg: string, type: 'success' | 'error' | 'info' = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${esc(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

// -------------------------------------------------------------
// Theme Management
// -------------------------------------------------------------
export function initTheme() {
  const saved = localStorage.getItem('cm_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

export function toggleTheme(): string {
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('cm_theme', next);
  return next;
}

// -------------------------------------------------------------
// Local Storage Keys & Cache Management
// -------------------------------------------------------------
export const LS_KEYS = {
  CURRENT_USER: 'cm_current_user',
  USERS_DIRECTORY: 'cm_users_directory',
  WORKSPACES: 'cm_workspaces',
  CURRENT_WORKSPACE: 'cm_current_workspace',
  CUSTOMERS: 'cm_customers',
  LOANS: 'cm_loans',
  PAYMENTS: 'cm_payments',
  PLAN_DAYS: 'cm_plan_days',
};

export function clearAllBrowserData(reload = true) {
  try {
    const keys = [
      'cm_current_user',
      'cm_users_directory',
      'cm_workspaces',
      'cm_current_workspace',
      'cm_customers',
      'cm_loans',
      'cm_payments',
      'cm_plan_days',
      'cm_theme',
      'cm_cloud_url',
      'cm_cloud_key',
    ];
    keys.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch (e) {
    console.error('Clear error:', e);
  }
  if (reload) {
    location.href = 'index.html?cleared=1';
  }
}

// -------------------------------------------------------------
// Active Authenticated Session Engine (sessionStorage backed)
// -------------------------------------------------------------
export interface ActiveSession {
  userId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  token: string;
  authenticatedAt: number;
}

export const authSession = {
  startSession(user: UserAccount): ActiveSession {
    const session: ActiveSession = {
      userId: user.id,
      email: user.email.toLowerCase(),
      role: user.role,
      status: user.status,
      token: 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
      authenticatedAt: Date.now(),
    };
    sessionStorage.setItem('cm_auth_session', JSON.stringify(session));
    localStorage.setItem(LS_KEYS.CURRENT_USER, JSON.stringify(user));
    return session;
  },

  getActiveSession(): ActiveSession | null {
    const raw = sessionStorage.getItem('cm_auth_session');
    if (!raw) return null;
    try {
      const sess: ActiveSession = JSON.parse(raw);
      // Valid for 24 hours of active browser session
      if (Date.now() - sess.authenticatedAt > 86400000) {
        authSession.endSession();
        return null;
      }
      return sess;
    } catch {
      return null;
    }
  },

  endSession() {
    sessionStorage.removeItem('cm_auth_session');
    localStorage.removeItem(LS_KEYS.CURRENT_USER);
    localStorage.removeItem(LS_KEYS.CURRENT_WORKSPACE);
  },

  isAuthenticated(): boolean {
    const sess = authSession.getActiveSession();
    return !!(sess && sess.userId && sess.status === 'approved');
  },
};

// -------------------------------------------------------------
// User Management & Permissions Engine
// -------------------------------------------------------------
export const userManager = {
  getCurrentUser(): UserAccount | null {
    // Only return user if actively authenticated in current session
    const sess = authSession.getActiveSession();
    if (!sess) return null;
    const raw = localStorage.getItem(LS_KEYS.CURRENT_USER);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  setCurrentUser(user: UserAccount | null) {
    if (!user) {
      authSession.endSession();
    } else {
      authSession.startSession(user);
      userManager.saveUser(user);
    }
  },

  getUsers(): UserAccount[] {
    const raw = localStorage.getItem(LS_KEYS.USERS_DIRECTORY);
    if (!raw) {
      const admin: UserAccount = {
        id: 'user_super_admin',
        email: SUPER_ADMIN_EMAIL,
        name: 'Super Admin',
        business_name: 'Platform Administrator',
        role: 'admin',
        status: 'approved',
        workspace_id: null,
        created_at: new Date().toISOString(),
        email_verified: true,
      };
      localStorage.setItem(LS_KEYS.USERS_DIRECTORY, JSON.stringify([admin]));
      return [admin];
    }
    try {
      const list: UserAccount[] = JSON.parse(raw);
      // Ensure super admin always exists with admin role
      const adm = list.find(u => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
      if (!adm) {
        list.unshift({
          id: 'user_super_admin',
          email: SUPER_ADMIN_EMAIL,
          name: 'Super Admin',
          business_name: 'Platform Administrator',
          role: 'admin',
          status: 'approved',
          workspace_id: null,
          created_at: new Date().toISOString(),
          email_verified: true,
        });
        localStorage.setItem(LS_KEYS.USERS_DIRECTORY, JSON.stringify(list));
      } else {
        adm.role = 'admin';
        adm.status = 'approved';
      }
      return list;
    } catch { return []; }
  },

  saveUser(u: UserAccount): UserAccount {
    const list = userManager.getUsers();
    const idx = list.findIndex(x => x.id === u.id || x.email.toLowerCase() === u.email.toLowerCase());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...u };
      localStorage.setItem(LS_KEYS.USERS_DIRECTORY, JSON.stringify(list));
      return list[idx];
    } else {
      list.push(u);
      localStorage.setItem(LS_KEYS.USERS_DIRECTORY, JSON.stringify(list));
      return u;
    }
  },

  approveUser(userId: string, adminId = 'super_admin'): boolean {
    const list = userManager.getUsers();
    const user = list.find(x => x.id === userId);
    if (!user) return false;
    user.status = 'approved';
    user.approved_by = adminId;
    user.approved_at = new Date().toISOString();
    user.email_verified = true;

    // Auto-create their clean business workspace if business name was requested
    if (user.business_name && !user.workspace_id) {
      const existingWs = db.getWorkspaces().find(w => w.owner_id === user.id);
      if (!existingWs) {
        const ws = db.createFreshWorkspace(user.business_name, user.id, user.email);
        user.workspace_id = ws.id;
      }
    }

    localStorage.setItem(LS_KEYS.USERS_DIRECTORY, JSON.stringify(list));

    const sess = authSession.getActiveSession();
    if (sess && sess.userId === userId) {
      sess.status = 'approved';
      sessionStorage.setItem('cm_auth_session', JSON.stringify(sess));
      localStorage.setItem(LS_KEYS.CURRENT_USER, JSON.stringify(user));
    }
    return true;
  },

  rejectUser(userId: string): boolean {
    const list = userManager.getUsers();
    const user = list.find(x => x.id === userId);
    if (!user) return false;
    user.status = 'rejected';
    localStorage.setItem(LS_KEYS.USERS_DIRECTORY, JSON.stringify(list));
    return true;
  },

  deleteUser(userId: string): boolean {
    const list = userManager.getUsers().filter(x => x.id !== userId);
    localStorage.setItem(LS_KEYS.USERS_DIRECTORY, JSON.stringify(list));
    return true;
  },

  async registerNewUser(email: string, name: string, phone = '', business_name = '', password = ''): Promise<UserAccount> {
    const cleanEmail = email.trim().toLowerCase();
    const existing = userManager.getUsers().find(x => x.email.toLowerCase() === cleanEmail);
    if (existing) return existing;

    const passHash = password ? await hashPassword(password) : '';

    // Normal client registrations are ALWAYS pending admin rental approval
    const user: UserAccount = {
      id: uid(),
      email: cleanEmail,
      name: name.trim() || cleanEmail.split('@')[0],
      phone: phone.trim(),
      business_name: business_name.trim() || 'My Collection Business',
      password_hash: passHash,
      role: 'owner',
      status: 'pending', // Strictly pending! Must be approved by Super Admin in admin.html
      workspace_id: null,
      created_at: new Date().toISOString(),
      email_verified: false,
    };
    return userManager.saveUser(user);
  },

  async verifyCredentials(email: string, pass: string): Promise<{ success: boolean; error?: string; user?: UserAccount; pending?: boolean; rejected?: boolean }> {
    const cleanEmail = email.trim().toLowerCase();

    // Check if Super Admin
    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      const ok = await verifyAdminPassword(pass);
      if (ok) {
        const admin: UserAccount = {
          id: 'user_super_admin',
          email: SUPER_ADMIN_EMAIL,
          name: 'Super Admin',
          role: 'admin',
          status: 'approved',
          workspace_id: null,
          created_at: new Date().toISOString(),
          email_verified: true,
        };
        authSession.startSession(admin);
        return { success: true, user: admin };
      }
      return { success: false, error: 'Invalid Super Admin password.' };
    }

    // Check Client
    const user = userManager.getUsers().find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, error: 'No account registered with this email. Please request workspace access below.' };
    }

    if (user.password_hash) {
      const inputHash = await hashPassword(pass);
      if (inputHash !== user.password_hash) {
        return { success: false, error: 'Invalid password. Please check your credentials.' };
      }
    }

    if (user.status === 'pending') {
      return { success: false, error: 'Your rental license is awaiting Super Admin activation.', pending: true, user };
    }

    if (user.status === 'rejected') {
      return { success: false, error: 'Your workspace rental license has been suspended.', rejected: true, user };
    }

    // Approved!
    authSession.startSession(user);
    return { success: true, user };
  },

  async authenticateSuperAdmin(email: string, pass: string): Promise<boolean> {
    if (email.trim().toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) return false;
    const ok = await verifyAdminPassword(pass);
    if (ok) {
      const admin: UserAccount = {
        id: 'user_super_admin',
        email: SUPER_ADMIN_EMAIL,
        name: 'Super Admin',
        role: 'admin',
        status: 'approved',
        workspace_id: null,
        created_at: new Date().toISOString(),
        email_verified: true,
      };
      authSession.startSession(admin);
      return true;
    }
    return false;
  },
};

// -------------------------------------------------------------
// Workspace Model & Database Engine
// -------------------------------------------------------------
export const db = {
  getWorkspaces(): Workspace[] {
    const raw = localStorage.getItem(LS_KEYS.WORKSPACES);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  saveWorkspace(ws: Workspace): Workspace {
    const list = db.getWorkspaces();
    const idx = list.findIndex(x => x.id === ws.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...ws };
      localStorage.setItem(LS_KEYS.WORKSPACES, JSON.stringify(list));
      return list[idx];
    } else {
      list.push(ws);
      localStorage.setItem(LS_KEYS.WORKSPACES, JSON.stringify(list));
      return ws;
    }
  },

  getCurrentWorkspace(): Workspace | null {
    const curUser = userManager.getCurrentUser();
    if (!curUser) return null;

    const raw = localStorage.getItem(LS_KEYS.CURRENT_WORKSPACE);
    if (raw) {
      try {
        const ws: Workspace = JSON.parse(raw);
        // If super admin, can view any workspace
        if (curUser.role === 'admin' || ws.owner_id === curUser.id || ws.owner_email?.toLowerCase() === curUser.email.toLowerCase()) {
          return ws;
        }
      } catch {}
    }

    const all = db.getWorkspaces();
    if (curUser.role === 'admin') {
      return all.length > 0 ? all[0] : null;
    }
    // Strict isolation: ONLY return a workspace owned by this user
    const userWs = all.find(w => w.owner_id === curUser.id || w.owner_email?.toLowerCase() === curUser.email.toLowerCase());
    return userWs || null;
  },

  setCurrentWorkspace(ws: Workspace) {
    localStorage.setItem(LS_KEYS.CURRENT_WORKSPACE, JSON.stringify(ws));
    db.saveWorkspace(ws);
  },

  // Backward compatible alias
  getOrg(): Workspace | null {
    return db.getCurrentWorkspace();
  },

  setOrg(org: Workspace) {
    db.setCurrentWorkspace(org);
  },

  createFreshWorkspace(name: string, ownerId: string, ownerEmail: string, daily_on = true, weekly_on = true): Workspace {
    const curUser = userManager.getCurrentUser();
    // Security check: only approved accounts or super admin can create workspace
    if (curUser && curUser.id === ownerId && curUser.status !== 'approved' && curUser.role !== 'admin') {
      throw new Error('Account must be approved by Super Admin before creating a business workspace');
    }

    const ws: Workspace = {
      id: uid(),
      name: name.trim() || 'My Collection Business',
      owner_id: ownerId,
      owner_email: ownerEmail,
      daily_on,
      weekly_on,
      currency: 'INR',
      created_at: new Date().toISOString(),
      cloud_sync: false,
    };
    db.saveWorkspace(ws);
    db.setCurrentWorkspace(ws);

    // Update user's workspace_id in directory
    const users = userManager.getUsers();
    const target = users.find(x => x.id === ownerId);
    if (target) {
      target.workspace_id = ws.id;
      localStorage.setItem(LS_KEYS.USERS_DIRECTORY, JSON.stringify(users));
    }

    if (curUser && curUser.id === ownerId) {
      curUser.workspace_id = ws.id;
      userManager.setCurrentUser(curUser);
    }
    return ws;
  },

  // -----------------------------------------------------------
  // Workspace-Scoped Data: Customers, Loans, Payments, Plans
  // -----------------------------------------------------------
  getCustomers(workspaceId?: string): Customer[] {
    const raw = localStorage.getItem(LS_KEYS.CUSTOMERS);
    if (!raw) return [];
    try {
      const all: Customer[] = JSON.parse(raw);
      const ws = workspaceId || db.getCurrentWorkspace()?.id;
      return ws ? all.filter(c => (c.workspace_id || c.org_id) === ws) : all;
    } catch { return []; }
  },

  saveCustomer(c: Partial<Customer>): Customer {
    const raw = localStorage.getItem(LS_KEYS.CUSTOMERS);
    const list: Customer[] = raw ? JSON.parse(raw) : [];
    const wsId = c.workspace_id || c.org_id || db.getCurrentWorkspace()?.id || 'ws_default';

    if (c.id) {
      const idx = list.findIndex(x => x.id === c.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...c, workspace_id: wsId, org_id: wsId };
        localStorage.setItem(LS_KEYS.CUSTOMERS, JSON.stringify(list));
        return list[idx];
      }
    }
    const item: Customer = {
      id: c.id || uid(),
      workspace_id: wsId,
      org_id: wsId,
      name: c.name || 'Unnamed',
      phone: c.phone || '',
      area: c.area || '',
      village: c.village || '',
      address: c.address || '',
      loc: c.loc || '',
      id_note: c.id_note || '',
      guarantor: c.guarantor || '',
      notes: c.notes || '',
      created_at: c.created_at || new Date().toISOString(),
    };
    list.push(item);
    localStorage.setItem(LS_KEYS.CUSTOMERS, JSON.stringify(list));
    return item;
  },

  deleteCustomer(id: string) {
    const raw = localStorage.getItem(LS_KEYS.CUSTOMERS);
    if (!raw) return;
    const list: Customer[] = JSON.parse(raw).filter((x: Customer) => x.id !== id);
    localStorage.setItem(LS_KEYS.CUSTOMERS, JSON.stringify(list));
    // Cascade delete loans
    const loans = db.getLoans().filter(l => l.customer_id === id);
    loans.forEach(l => db.deleteLoan(l.id));
  },

  getLoans(workspaceId?: string): Loan[] {
    const raw = localStorage.getItem(LS_KEYS.LOANS);
    if (!raw) return [];
    try {
      const all: Loan[] = JSON.parse(raw);
      const ws = workspaceId || db.getCurrentWorkspace()?.id;
      return ws ? all.filter(l => (l.workspace_id || l.org_id) === ws) : all;
    } catch { return []; }
  },

  saveLoan(l: Partial<Loan>): Loan {
    const raw = localStorage.getItem(LS_KEYS.LOANS);
    const list: Loan[] = raw ? JSON.parse(raw) : [];
    const wsId = l.workspace_id || l.org_id || db.getCurrentWorkspace()?.id || 'ws_default';

    if (l.id) {
      const idx = list.findIndex(x => x.id === l.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...l, workspace_id: wsId, org_id: wsId };
        localStorage.setItem(LS_KEYS.LOANS, JSON.stringify(list));
        return list[idx];
      }
    }
    const item: Loan = {
      id: l.id || uid(),
      workspace_id: wsId,
      org_id: wsId,
      customer_id: l.customer_id!,
      mode: l.mode || 'daily',
      principal: Number(l.principal || 0),
      int_type: l.int_type || 'pct',
      int_val: Number(l.int_val || 0),
      total: Number(l.total || 0),
      n: Number(l.n || 1),
      inst: Number(l.inst || 0),
      start_date: l.start_date || today(),
      created_at: l.created_at || new Date().toISOString(),
    };
    list.push(item);
    localStorage.setItem(LS_KEYS.LOANS, JSON.stringify(list));
    return item;
  },

  deleteLoan(id: string) {
    const raw = localStorage.getItem(LS_KEYS.LOANS);
    if (!raw) return;
    const list: Loan[] = JSON.parse(raw).filter((x: Loan) => x.id !== id);
    localStorage.setItem(LS_KEYS.LOANS, JSON.stringify(list));
    const payments = db.getPayments().filter(p => p.loan_id !== id);
    localStorage.setItem(LS_KEYS.PAYMENTS, JSON.stringify(payments));
    const plans = db.getPlanDays().filter(p => p.loan_id !== id);
    localStorage.setItem(LS_KEYS.PLAN_DAYS, JSON.stringify(plans));
  },

  getPayments(workspaceId?: string): Payment[] {
    const raw = localStorage.getItem(LS_KEYS.PAYMENTS);
    if (!raw) return [];
    try {
      const all: Payment[] = JSON.parse(raw);
      const ws = workspaceId || db.getCurrentWorkspace()?.id;
      return ws ? all.filter(p => (p.workspace_id || p.org_id) === ws) : all;
    } catch { return []; }
  },

  addPayment(loan_id: string, amount: number, paid_on: string = today(), notes = ''): Payment {
    const raw = localStorage.getItem(LS_KEYS.PAYMENTS);
    const list: Payment[] = raw ? JSON.parse(raw) : [];
    const wsId = db.getCurrentWorkspace()?.id || 'ws_default';
    const item: Payment = {
      id: uid(),
      workspace_id: wsId,
      org_id: wsId,
      loan_id,
      amount: Number(amount),
      paid_on,
      notes,
      created_at: new Date().toISOString(),
    };
    list.push(item);
    localStorage.setItem(LS_KEYS.PAYMENTS, JSON.stringify(list));
    return item;
  },

  undoLastPayment(loan_id: string, on: string = today()): boolean {
    const raw = localStorage.getItem(LS_KEYS.PAYMENTS);
    if (!raw) return false;
    const list: Payment[] = JSON.parse(raw);
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].loan_id === loan_id && list[i].paid_on === on) {
        list.splice(i, 1);
        localStorage.setItem(LS_KEYS.PAYMENTS, JSON.stringify(list));
        return true;
      }
    }
    return false;
  },

  getPlanDays(workspaceId?: string): PlanDay[] {
    const raw = localStorage.getItem(LS_KEYS.PLAN_DAYS);
    if (!raw) return [];
    try {
      const all: PlanDay[] = JSON.parse(raw);
      const ws = workspaceId || db.getCurrentWorkspace()?.id;
      return ws ? all.filter(p => (p.workspace_id || p.org_id) === ws) : all;
    } catch { return []; }
  },

  togglePlanDay(day: string, loan_id: string): boolean {
    const raw = localStorage.getItem(LS_KEYS.PLAN_DAYS);
    const list: PlanDay[] = raw ? JSON.parse(raw) : [];
    const wsId = db.getCurrentWorkspace()?.id || 'ws_default';
    const idx = list.findIndex(p => p.day === day && p.loan_id === loan_id && (p.workspace_id || p.org_id) === wsId);
    if (idx >= 0) {
      list.splice(idx, 1);
      localStorage.setItem(LS_KEYS.PLAN_DAYS, JSON.stringify(list));
      return false;
    } else {
      list.push({ id: uid(), workspace_id: wsId, org_id: wsId, day, loan_id });
      localStorage.setItem(LS_KEYS.PLAN_DAYS, JSON.stringify(list));
      return true;
    }
  },

  clearCurrentWorkspace() {
    const ws = db.getCurrentWorkspace();
    if (!ws) return;
    const rawC = localStorage.getItem(LS_KEYS.CUSTOMERS);
    if (rawC) localStorage.setItem(LS_KEYS.CUSTOMERS, JSON.stringify(JSON.parse(rawC).filter((c: any) => (c.workspace_id || c.org_id) !== ws.id)));
    const rawL = localStorage.getItem(LS_KEYS.LOANS);
    if (rawL) localStorage.setItem(LS_KEYS.LOANS, JSON.stringify(JSON.parse(rawL).filter((l: any) => (l.workspace_id || l.org_id) !== ws.id)));
    const rawP = localStorage.getItem(LS_KEYS.PAYMENTS);
    if (rawP) localStorage.setItem(LS_KEYS.PAYMENTS, JSON.stringify(JSON.parse(rawP).filter((p: any) => (p.workspace_id || p.org_id) !== ws.id)));
    const rawPD = localStorage.getItem(LS_KEYS.PLAN_DAYS);
    if (rawPD) localStorage.setItem(LS_KEYS.PLAN_DAYS, JSON.stringify(JSON.parse(rawPD).filter((p: any) => (p.workspace_id || p.org_id) !== ws.id)));
  },

  clearAll() {
    Object.values(LS_KEYS).forEach(k => localStorage.removeItem(k));
  },

  loadSampleData() {
    const ws: Workspace = {
      id: 'ws_sample',
      name: 'Kerala Express Micro Finance',
      owner_id: 'user_admin',
      owner_email: DEFAULT_ADMIN_EMAIL,
      daily_on: true,
      weekly_on: true,
      currency: 'INR',
      created_at: new Date().toISOString(),
      cloud_sync: false,
    };
    db.saveWorkspace(ws);
    db.setCurrentWorkspace(ws);

    const c1: Customer = { id: 'c1', workspace_id: 'ws_sample', org_id: 'ws_sample', name: 'Rajesh Kumar', phone: '9847012345', area: 'Ernakulam', village: 'Kakkanad', address: 'Near InfoPark Gate 2', loc: '9.9981,76.3578', guarantor: 'Suresh Kumar', id_note: 'Aadhaar 8832-1243-9901', notes: 'Tea stall' };
    const c2: Customer = { id: 'c2', workspace_id: 'ws_sample', org_id: 'ws_sample', name: 'Anjali Varma', phone: '9847123456', area: 'Ernakulam', village: 'Edappally', address: 'Toll Junction', loc: '10.0236,76.3083', guarantor: 'Radha', id_note: 'Voter ID KL/12/32', notes: 'Tailoring shop' };
    const c3: Customer = { id: 'c3', workspace_id: 'ws_sample', org_id: 'ws_sample', name: 'Muhammed Shafi', phone: '9847234567', area: 'Aluva', village: 'Thottakkattukara', address: 'Bus Stand Road', loc: '10.1076,76.3516', guarantor: 'Kabeer', id_note: 'DL-072019', notes: 'Vegetable merchant' };
    const c4: Customer = { id: 'c4', workspace_id: 'ws_sample', org_id: 'ws_sample', name: 'Bindu Sajeev', phone: '9847345678', area: 'Thrissur', village: 'Chalakudy', address: 'Market Road', loc: '10.3071,76.3331', guarantor: 'Sajeev K.', id_note: 'Aadhaar 5543-9912-4412', notes: 'Bakery supplier' };
    const c5: Customer = { id: 'c5', workspace_id: 'ws_sample', org_id: 'ws_sample', name: 'Thomas Joseph', phone: '9847456789', area: 'Ernakulam', village: 'Kaloor', address: 'Stadium Link Road', loc: '9.9987,76.2995', guarantor: 'Mathew', id_note: 'PAN ABCDE1234F', notes: 'Auto driver' };

    localStorage.setItem(LS_KEYS.CUSTOMERS, JSON.stringify([c1, c2, c3, c4, c5]));

    const todayDate = today();
    const l1: Loan = { id: 'l1', workspace_id: 'ws_sample', org_id: 'ws_sample', customer_id: 'c1', mode: 'daily', principal: 10000, int_type: 'pct', int_val: 10, total: 11000, n: 50, inst: 220, start_date: addDays(todayDate, -20) };
    const l2: Loan = { id: 'l2', workspace_id: 'ws_sample', org_id: 'ws_sample', customer_id: 'c2', mode: 'daily', principal: 20000, int_type: 'amt', int_val: 2000, total: 22000, n: 100, inst: 220, start_date: addDays(todayDate, -10) };
    const l3: Loan = { id: 'l3', workspace_id: 'ws_sample', org_id: 'ws_sample', customer_id: 'c3', mode: 'weekly', principal: 15000, int_type: 'pct', int_val: 12, total: 16800, n: 12, inst: 1400, start_date: addDays(todayDate, -21) };
    const l4: Loan = { id: 'l4', workspace_id: 'ws_sample', org_id: 'ws_sample', customer_id: 'c4', mode: 'daily', principal: 5000, int_type: 'amt', int_val: 500, total: 5500, n: 25, inst: 220, start_date: addDays(todayDate, -2) };
    const l5: Loan = { id: 'l5', workspace_id: 'ws_sample', org_id: 'ws_sample', customer_id: 'c5', mode: 'daily', principal: 8000, int_type: 'pct', int_val: 10, total: 8800, n: 40, inst: 220, start_date: addDays(todayDate, -45) };

    localStorage.setItem(LS_KEYS.LOANS, JSON.stringify([l1, l2, l3, l4, l5]));

    const payments: Payment[] = [
      { id: 'p1', workspace_id: 'ws_sample', org_id: 'ws_sample', loan_id: 'l1', amount: 220 * 18, paid_on: addDays(todayDate, -2) },
      { id: 'p2', workspace_id: 'ws_sample', org_id: 'ws_sample', loan_id: 'l2', amount: 220 * 8, paid_on: addDays(todayDate, -1) },
      { id: 'p3', workspace_id: 'ws_sample', org_id: 'ws_sample', loan_id: 'l3', amount: 1400 * 2, paid_on: addDays(todayDate, -7) },
      { id: 'p4', workspace_id: 'ws_sample', org_id: 'ws_sample', loan_id: 'l5', amount: 220 * 20, paid_on: addDays(todayDate, -25) },
    ];
    localStorage.setItem(LS_KEYS.PAYMENTS, JSON.stringify(payments));

    localStorage.setItem(LS_KEYS.PLAN_DAYS, JSON.stringify([
      { id: 'pd1', workspace_id: 'ws_sample', org_id: 'ws_sample', day: todayDate, loan_id: 'l1' },
      { id: 'pd2', workspace_id: 'ws_sample', org_id: 'ws_sample', day: todayDate, loan_id: 'l2' },
      { id: 'pd3', workspace_id: 'ws_sample', org_id: 'ws_sample', day: todayDate, loan_id: 'l4' },
    ]));
  },
};

// -------------------------------------------------------------
// Excel Multi-Sheet SpreadsheetML Generator
// -------------------------------------------------------------
export function generateExcelWorkbook(
  workspaceName: string,
  customers: Customer[],
  loans: Loan[],
  payments: Payment[],
  rows: Row[]
): string {
  const sanitize = (val: any) => String(val ?? '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' } as any)[c]);

  const customerRowsXml = customers.map(c => `
    <Row>
      <Cell><Data ss:Type="String">${sanitize(c.id)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(c.name)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(c.phone)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(c.area)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(c.village)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(c.address)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(c.loc)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(c.id_note)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(c.guarantor)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(c.notes)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(c.created_at)}</Data></Cell>
    </Row>
  `).join('');

  const loanRowsXml = rows.map(r => `
    <Row>
      <Cell><Data ss:Type="String">${sanitize(r.l.id)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(r.c.name)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(r.c.phone)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(r.l.mode)}</Data></Cell>
      <Cell><Data ss:Type="Number">${r.l.principal}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(r.l.int_type)}</Data></Cell>
      <Cell><Data ss:Type="Number">${r.l.int_val}</Data></Cell>
      <Cell><Data ss:Type="Number">${r.l.total}</Data></Cell>
      <Cell><Data ss:Type="Number">${r.l.n}</Data></Cell>
      <Cell><Data ss:Type="Number">${Math.round(r.l.inst)}</Data></Cell>
      <Cell><Data ss:Type="Number">${Math.round(r.paid)}</Data></Cell>
      <Cell><Data ss:Type="Number">${Math.round(r.outstanding)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(r.l.start_date)}</Data></Cell>
      <Cell><Data ss:Type="String">${r.cleared ? 'Cleared' : (r.risk ? 'High Risk' : 'Active')}</Data></Cell>
    </Row>
  `).join('');

  const paymentRowsXml = payments.map(p => {
    const cust = customers.find(c => {
      const l = loans.find(x => x.id === p.loan_id);
      return l && l.customer_id === c.id;
    });
    return `
      <Row>
        <Cell><Data ss:Type="String">${sanitize(p.id)}</Data></Cell>
        <Cell><Data ss:Type="String">${sanitize(p.paid_on)}</Data></Cell>
        <Cell><Data ss:Type="String">${sanitize(cust ? cust.name : 'Unknown')}</Data></Cell>
        <Cell><Data ss:Type="String">${sanitize(p.loan_id)}</Data></Cell>
        <Cell><Data ss:Type="Number">${p.amount}</Data></Cell>
        <Cell><Data ss:Type="String">${sanitize(p.notes)}</Data></Cell>
      </Row>
    `;
  }).join('');

  const ledgerRowsXml = rows.map(r => `
    <Row>
      <Cell><Data ss:Type="String">${sanitize(r.c.name)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(r.c.phone)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(r.c.village || r.c.area)}</Data></Cell>
      <Cell><Data ss:Type="String">${sanitize(r.l.mode)}</Data></Cell>
      <Cell><Data ss:Type="Number">${r.l.principal}</Data></Cell>
      <Cell><Data ss:Type="Number">${r.l.total}</Data></Cell>
      <Cell><Data ss:Type="Number">${Math.round(r.paid)}</Data></Cell>
      <Cell><Data ss:Type="Number">${Math.round(r.outstanding)}</Data></Cell>
      <Cell><Data ss:Type="Number">${r.progressPct}%</Data></Cell>
      <Cell><Data ss:Type="String">${r.cleared ? 'Repaid' : 'Pending'}</Data></Cell>
    </Row>
  `).join('');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Customers">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">ID</Data></Cell>
    <Cell><Data ss:Type="String">Customer Name</Data></Cell>
    <Cell><Data ss:Type="String">Phone Number</Data></Cell>
    <Cell><Data ss:Type="String">District / Area</Data></Cell>
    <Cell><Data ss:Type="String">Village</Data></Cell>
    <Cell><Data ss:Type="String">Address</Data></Cell>
    <Cell><Data ss:Type="String">GPS Location</Data></Cell>
    <Cell><Data ss:Type="String">ID Proof</Data></Cell>
    <Cell><Data ss:Type="String">Guarantor</Data></Cell>
    <Cell><Data ss:Type="String">Notes</Data></Cell>
    <Cell><Data ss:Type="String">Created At</Data></Cell>
   </Row>
   ${customerRowsXml}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Loans">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Loan ID</Data></Cell>
    <Cell><Data ss:Type="String">Customer</Data></Cell>
    <Cell><Data ss:Type="String">Phone</Data></Cell>
    <Cell><Data ss:Type="String">Mode</Data></Cell>
    <Cell><Data ss:Type="String">Principal (₹)</Data></Cell>
    <Cell><Data ss:Type="String">Int Type</Data></Cell>
    <Cell><Data ss:Type="String">Int Rate</Data></Cell>
    <Cell><Data ss:Type="String">Total (₹)</Data></Cell>
    <Cell><Data ss:Type="String">Installments</Data></Cell>
    <Cell><Data ss:Type="String">Per Inst (₹)</Data></Cell>
    <Cell><Data ss:Type="String">Repaid (₹)</Data></Cell>
    <Cell><Data ss:Type="String">Balance (₹)</Data></Cell>
    <Cell><Data ss:Type="String">Start Date</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
   </Row>
   ${loanRowsXml}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Payment Collections">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Receipt ID</Data></Cell>
    <Cell><Data ss:Type="String">Paid Date</Data></Cell>
    <Cell><Data ss:Type="String">Customer</Data></Cell>
    <Cell><Data ss:Type="String">Loan ID</Data></Cell>
    <Cell><Data ss:Type="String">Amount Paid (₹)</Data></Cell>
    <Cell><Data ss:Type="String">Notes</Data></Cell>
   </Row>
   ${paymentRowsXml}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Ledger Summary">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Customer</Data></Cell>
    <Cell><Data ss:Type="String">Phone</Data></Cell>
    <Cell><Data ss:Type="String">Village</Data></Cell>
    <Cell><Data ss:Type="String">Mode</Data></Cell>
    <Cell><Data ss:Type="String">Principal Given (₹)</Data></Cell>
    <Cell><Data ss:Type="String">Total Due (₹)</Data></Cell>
    <Cell><Data ss:Type="String">Repaid (₹)</Data></Cell>
    <Cell><Data ss:Type="String">Balance Left (₹)</Data></Cell>
    <Cell><Data ss:Type="String">Progress</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
   </Row>
   ${ledgerRowsXml}
  </Table>
 </Worksheet>
</Workbook>`;
}

export function downloadExcelFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xls') ? filename : filename + '.xls';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// -------------------------------------------------------------
// Cloud Backup & Restore Engine
// -------------------------------------------------------------
export async function backupWorkspaceToCloud(): Promise<{ success: boolean; message: string }> {
  const client = getSupabase();
  const ws = db.getCurrentWorkspace();
  if (!ws) return { success: false, message: 'No active workspace to backup' };
  if (!client) return { success: false, message: 'Configure Supabase credentials first' };

  try {
    const customers = db.getCustomers(ws.id);
    const loans = db.getLoans(ws.id);
    const payments = db.getPayments(ws.id);
    const plans = db.getPlanDays(ws.id);

    // Save org
    await client.from('orgs').upsert({
      id: ws.id,
      name: ws.name,
      daily_on: ws.daily_on,
      weekly_on: ws.weekly_on,
    });

    if (customers.length) {
      const { error } = await client.from('customers').upsert(customers.map(c => ({ ...c, org_id: ws.id })));
      if (error) throw error;
    }
    if (loans.length) {
      const { error } = await client.from('loans').upsert(loans.map(l => ({ ...l, org_id: ws.id })));
      if (error) throw error;
    }
    if (payments.length) {
      const { error } = await client.from('payments').upsert(payments.map(p => ({ ...p, org_id: ws.id })));
      if (error) throw error;
    }
    if (plans.length) {
      const { error } = await client.from('plan_days').upsert(plans.map(p => ({ ...p, org_id: ws.id })));
      if (error) throw error;
    }

    ws.cloud_sync = true;
    ws.last_cloud_backup = new Date().toISOString();
    db.saveWorkspace(ws);
    db.setCurrentWorkspace(ws);

    return { success: true, message: `Cloud backup successful! Backed up ${customers.length} customers, ${loans.length} loans, ${payments.length} receipts.` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Cloud backup failed' };
  }
}

export async function restoreWorkspaceFromCloud(): Promise<{ success: boolean; message: string }> {
  const client = getSupabase();
  const ws = db.getCurrentWorkspace();
  if (!ws) return { success: false, message: 'No active workspace selected' };
  if (!client) return { success: false, message: 'Supabase credentials required' };

  try {
    const [cRes, lRes, pRes, plRes] = await Promise.all([
      client.from('customers').select('*').eq('org_id', ws.id),
      client.from('loans').select('*').eq('org_id', ws.id),
      client.from('payments').select('*').eq('org_id', ws.id),
      client.from('plan_days').select('*').eq('org_id', ws.id),
    ]);

    if (cRes.data) {
      const existing = db.getCustomers();
      const filtered = existing.filter(c => (c.workspace_id || c.org_id) !== ws.id);
      localStorage.setItem(LS_KEYS.CUSTOMERS, JSON.stringify([...filtered, ...cRes.data]));
    }
    if (lRes.data) {
      const existing = db.getLoans();
      const filtered = existing.filter(l => (l.workspace_id || l.org_id) !== ws.id);
      localStorage.setItem(LS_KEYS.LOANS, JSON.stringify([...filtered, ...lRes.data]));
    }
    if (pRes.data) {
      const existing = db.getPayments();
      const filtered = existing.filter(p => (p.workspace_id || p.org_id) !== ws.id);
      localStorage.setItem(LS_KEYS.PAYMENTS, JSON.stringify([...filtered, ...pRes.data]));
    }
    if (plRes.data) {
      const existing = db.getPlanDays();
      const filtered = existing.filter(p => (p.workspace_id || p.org_id) !== ws.id);
      localStorage.setItem(LS_KEYS.PLAN_DAYS, JSON.stringify([...filtered, ...plRes.data]));
    }

    return { success: true, message: 'Restored successfully from Supabase Cloud!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Cloud restore failed' };
  }
}

// -------------------------------------------------------------
// App Bootstrapper & Navigation
// -------------------------------------------------------------
const NAV_ITEMS: [string, string, string][] = [
  ['dashboard', '📊', 'Home'],
  ['today', '✅', 'Today'],
  ['route', '🧭', 'Route'],
  ['customers', '👥', 'Customers'],
  ['ledger', '📒', 'Ledger'],
  ['settings', '⚙️', 'Settings'],
];

export async function boot(): Promise<Workspace> {
  initTheme();

  window.addEventListener('error', (e) => {
    console.error('Captured window error:', e);
    renderErrorFallback(e.message || 'An unexpected script error occurred.');
  });
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason && typeof e.reason === 'object' && e.reason.message?.includes('AbortError')) return;
  });

  const here = (location.pathname.split('/').pop() || 'index').replace('.html', '') || 'index';

  // If on index or login, do not redirect
  if (here === 'index' || here === 'login') {
    return { id: '', name: 'Gateway', owner_id: '', owner_email: '', daily_on: true, weekly_on: true, currency: 'INR', created_at: '', cloud_sync: false };
  }

  // 1. Check Active Authenticated Session (requires password authentication)
  const session = authSession.getActiveSession();
  if (!session || !session.userId) {
    // Loophole closed: Not actively authenticated with password!
    authSession.endSession();
    location.href = 'index.html';
    return { id: '', name: 'Setup', owner_id: '', owner_email: '', daily_on: true, weekly_on: true, currency: 'INR', created_at: '', cloud_sync: false };
  }

  // 2. Fetch User Record from Directory
  const users = userManager.getUsers();
  const user = users.find(u => u.id === session.userId || u.email.toLowerCase() === session.email.toLowerCase());
  if (!user) {
    authSession.endSession();
    location.href = 'index.html';
    return { id: '', name: 'Setup', owner_id: '', owner_email: '', daily_on: true, weekly_on: true, currency: 'INR', created_at: '', cloud_sync: false };
  }

  // 3. Check Permission Status: If user is Pending approval, block from dashboard!
  if (user.status === 'pending') {
    location.href = 'index.html?pending=1';
    return { id: '', name: 'Pending Approval', owner_id: '', owner_email: '', daily_on: true, weekly_on: true, currency: 'INR', created_at: '', cloud_sync: false };
  }

  // 4. If rejected/suspended, block from dashboard!
  if (user.status === 'rejected') {
    authSession.endSession();
    location.href = 'index.html?suspended=1';
    return { id: '', name: 'Suspended', owner_id: '', owner_email: '', daily_on: true, weekly_on: true, currency: 'INR', created_at: '', cloud_sync: false };
  }

  // 5. Must be strictly approved
  if (user.status !== 'approved') {
    authSession.endSession();
    location.href = 'index.html';
    return { id: '', name: 'Setup', owner_id: '', owner_email: '', daily_on: true, weekly_on: true, currency: 'INR', created_at: '', cloud_sync: false };
  }

  // 6. User is Approved: check if they have a workspace
  let ws = db.getCurrentWorkspace();
  if (!ws) {
    location.href = 'index.html?setup=1';
    return { id: '', name: 'Setup', owner_id: '', owner_email: '', daily_on: true, weekly_on: true, currency: 'INR', created_at: '', cloud_sync: false };
  }

  // Render Top Header
  const hh = here === 'plan' ? 'today' : here;
  const isCloud = ws.cloud_sync;
  const isAdmin = user.role === 'admin';
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  document.querySelector('header.top-header')?.remove();
  document.querySelector('nav.bottom-nav')?.remove();

  const topHeaderHtml = `
    <header class="top-header">
      <div class="brand-wrap">
        <div class="brand-avatar">💼</div>
        <div class="brand-info">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h1 class="brand-title">${esc(ws.name)}</h1>
          </div>
          <div class="brand-meta">
            <span class="badge ${isCloud ? 'badge-cloud' : 'badge-local'}">
              ${isCloud ? '☁️ Cloud Synced' : '⚡ Local & Offline'}
            </span>
            <span class="date-chip">${esc(user.email)}</span>
            <span class="date-chip">· ${dateStr}</span>
          </div>
        </div>
      </div>
      <nav class="header-nav">
        ${NAV_ITEMS.map(([h, icon, title]) => `
          <a href="${h}.html" class="header-nav-item ${h === hh ? 'active' : ''}">
            <span class="header-nav-icon">${icon}</span>
            <span class="header-nav-label">${title}</span>
          </a>
        `).join('')}
      </nav>

      <div class="header-actions">
        ${isAdmin ? `
          <a class="btn btn-outline" href="admin.html" style="font-size: 11px; padding: 5px 10px; color: #f59e0b; border-color: #f59e0b; text-decoration: none; font-weight: 700;">
            👑 Admin Panel
          </a>
        ` : ''}
        <button class="theme-btn" id="theme-toggle" title="Toggle Light/Dark Theme" type="button">
          ${document.documentElement.getAttribute('data-theme') === 'light' ? '🌙' : '☀️'}
        </button>
        <button class="btn btn-secondary" id="btn-top-logout" style="font-size: 12px; padding: 6px 12px;" type="button" title="Sign Out of Business Workspace">
          🚪 Sign Out
        </button>
      </div>
    </header>
  `;

  const navHtml = `
    <nav class="bottom-nav">
      ${NAV_ITEMS.map(([h, icon, title]) => `
        <a href="${h}.html" class="nav-item ${h === hh ? 'active' : ''}">
          <span class="nav-icon">${icon}</span>
          <span class="nav-label">${title}</span>
        </a>
      `).join('')}
    </nav>
  `;

  document.body.insertAdjacentHTML('afterbegin', topHeaderHtml);
  document.body.insertAdjacentHTML('beforeend', navHtml);

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const next = toggleTheme();
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = next === 'light' ? '🌙' : '☀️';
  });

  document.getElementById('btn-top-logout')?.addEventListener('click', async () => {
    userManager.setCurrentUser(null);
    const client = getSupabase();
    if (client) { try { await client.auth.signOut(); } catch {} }
    toast('Signed out from workspace', 'info');
    setTimeout(() => location.href = 'index.html', 300);
  });

  return ws;
}

// -------------------------------------------------------------
// Error Fallback UI
// -------------------------------------------------------------
export function renderErrorFallback(errorMsg: string) {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="error-card card">
      <div class="error-icon">⚠️</div>
      <h2>Something needs attention</h2>
      <p class="error-msg">${esc(errorMsg)}</p>
      <div class="error-actions">
        <button class="btn btn-primary" onclick="location.reload()">🔄 Refresh Page</button>
        <button class="btn btn-secondary" onclick="location.href='dashboard.html'">🏠 Back to Dashboard</button>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// Financial Metrics Loader
// -------------------------------------------------------------
export async function load(on = today()) {
  const ws = db.getCurrentWorkspace();
  const customers = db.getCustomers(ws?.id);
  const loans = db.getLoans(ws?.id);
  const payments = db.getPayments(ws?.id);

  const cm = new Map<string, Customer>(customers.map(c => [c.id, c]));
  const paid = new Map<string, number>();
  const paidOn = new Map<string, number>();

  payments.forEach(p => {
    paid.set(p.loan_id, (paid.get(p.loan_id) || 0) + Number(p.amount));
    if (p.paid_on === on) {
      paidOn.set(p.loan_id, (paidOn.get(p.loan_id) || 0) + Number(p.amount));
    }
  });

  const rows: Row[] = loans
    .filter(l => cm.has(l.customer_id))
    .map(l => {
      const customer = cm.get(l.customer_id)!;
      const total = Number(l.total);
      const inst = Number(l.inst);
      const s = stepOf(l);
      const days = dd(l.start_date, on);
      const k = Math.max(0, Math.min(l.n, Math.floor(days / s)));
      const p = paid.get(l.id) || 0;
      const cleared = total - p <= 0.5;
      const outstanding = cleared ? 0 : total - p;
      const targetSoFar = Math.min(total, k * inst);
      const pending = Math.min(outstanding, Math.max(0, targetSoFar - p));
      const dueToday = days > 0 && days % s === 0 && days / s <= l.n;
      const pOn = paidOn.get(l.id) || 0;
      const isPastEnd = on > endDate(l);
      const risk = outstanding > 0 && (isPastEnd || pending >= 3 * inst);
      const progressPct = total > 0 ? Math.min(100, Math.round((p / total) * 100)) : 0;

      return {
        l,
        c: customer,
        paid: p,
        outstanding,
        pending,
        dueToday,
        cleared,
        paidOn: pOn,
        risk,
        progressPct,
      };
    });

  return { customers, loans, payments, rows };
}

export async function planned(on: string): Promise<Set<string>> {
  const ws = db.getCurrentWorkspace();
  const plans = db.getPlanDays(ws?.id);
  return new Set(plans.filter(p => p.day === on).map(p => p.loan_id));
}

export const todayList = (rows: Row[], pl: Set<string>) =>
  rows.filter(r => (!r.cleared && (r.dueToday || r.pending > 0 || pl.has(r.l.id))) || r.paidOn > 0);

export const dueAmt = (r: Row) => Math.max(r.pending, Math.min(Number(r.l.inst), r.outstanding));

// -------------------------------------------------------------
// Payment Actions
// -------------------------------------------------------------
export async function pay(loan_id: string, amount: number, on: string = today()): Promise<void> {
  const ws = db.getCurrentWorkspace();
  const client = getSupabase();

  db.addPayment(loan_id, amount, on);

  if (ws?.cloud_sync && client) {
    try {
      await client.from('payments').insert({ loan_id, amount, paid_on: on, org_id: ws.id });
    } catch (e) {
      console.warn('Cloud payment sync failed:', e);
    }
  }
}

export async function undo(loan_id: string, on: string = today()): Promise<void> {
  const ws = db.getCurrentWorkspace();
  const client = getSupabase();

  db.undoLastPayment(loan_id, on);

  if (ws?.cloud_sync && client) {
    try {
      const { data } = await client.from('payments').select('id').eq('loan_id', loan_id).eq('paid_on', on).order('created_at', { ascending: false }).limit(1);
      if (data && data.length) {
        await client.from('payments').delete().eq('id', data[0].id);
      }
    } catch (e) {
      console.warn('Cloud payment undo failed:', e);
    }
  }
}

// -------------------------------------------------------------
// Collection Card Component
// -------------------------------------------------------------
export function rowHtml(r: Row, isPlanned = false, extraHtml = ''): string {
  const d = Math.round(dueAmt(r));
  const c = r.c;
  const done = r.paidOn > 0;
  const remMsg = `Hello ${c.name}, collection of ${money(d)} is due today. Please keep it ready. - ${db.getCurrentWorkspace()?.name || 'Collection Manager'}`;
  const recMsg = `Receipt: Received ${money(r.paidOn)} on ${today()} from ${c.name}. Remaining balance: ${money(r.outstanding)}. Thank you. - ${db.getCurrentWorkspace()?.name || 'Collection Manager'}`;

  const statusTags = [
    `<span class="tag tag-mode">${r.l.mode}</span>`,
    r.pending > Number(r.l.inst) ? `<span class="tag tag-overdue">⚠️ Overdue ${money(r.pending)}</span>` : '',
    r.risk ? `<span class="tag tag-risk">🚨 High Risk</span>` : '',
    isPlanned ? `<span class="tag tag-plan">📅 Planned</span>` : '',
    done ? `<span class="tag tag-success">✓ Paid Today ${money(r.paidOn)}</span>` : '',
  ].filter(Boolean).join(' ');

  const locationText = [c.village, c.area].filter(Boolean).join(', ');

  return `
    <div class="collect-card ${done ? 'is-collected' : ''} ${r.risk ? 'is-risk' : ''}">
      <div class="collect-main">
        <div class="collect-header">
          <div class="customer-info">
            <h3 class="customer-name">${esc(c.name)}</h3>
            <div class="tags-row">${statusTags}</div>
          </div>
          <div class="balance-badge">
            <span class="sub-label">Balance</span>
            <span class="balance-num">${money(r.outstanding)}</span>
          </div>
        </div>

        <div class="collect-meta">
          <span class="meta-item">📍 ${esc(locationText || 'No area set')}</span>
          <span class="meta-item">📊 ${r.progressPct}% paid (${money(r.paid)}/${money(r.l.total)})</span>
          <span class="meta-item">🗓️ ${money(r.l.inst)}/${r.l.mode === 'daily' ? 'day' : 'wk'}</span>
        </div>

        <div class="progress-bar">
          <div class="progress-fill ${r.risk ? 'fill-risk' : ''}" style="width: ${r.progressPct}%"></div>
        </div>

        <div class="action-links">
          ${extraHtml}
          ${c.phone ? `<a class="action-chip" href="tel:${esc(c.phone)}">📞 Call</a>` : ''}
          ${c.phone ? `<a class="action-chip" href="${wa(c.phone, remMsg)}" target="_blank" rel="noopener">💬 WhatsApp Reminder</a>` : ''}
          ${done && c.phone ? `<a class="action-chip action-chip-success" href="${wa(c.phone, recMsg)}" target="_blank" rel="noopener">🧾 Send Receipt</a>` : ''}
          ${done ? `<button class="action-chip action-chip-undo" data-a="undo" data-id="${r.l.id}" type="button">↩ Undo</button>` : ''}
        </div>
      </div>

      ${!r.cleared ? `
        <div class="collect-action-bar">
          <div class="input-with-presets">
            <input class="collect-amt-input" id="a-${r.l.id}" type="number" inputmode="decimal" value="${d}">
            <div class="preset-btns">
              <button class="preset-btn" type="button" onclick="document.getElementById('a-${r.l.id}').value='${d}'">Due</button>
              <button class="preset-btn" type="button" onclick="document.getElementById('a-${r.l.id}').value='${Math.round(r.l.inst)}'">${money(r.l.inst)}</button>
              <button class="preset-btn" type="button" onclick="document.getElementById('a-${r.l.id}').value='${Math.round(r.outstanding)}'">Full</button>
            </div>
          </div>
          <button class="btn btn-primary collect-btn" data-a="pay" data-id="${r.l.id}">
            ${done ? '＋ Collect More' : '✓ Collect'}
          </button>
        </div>
      ` : `
        <div class="cleared-badge">🎉 Fully Cleared</div>
      `}
    </div>
  `;
}

// -------------------------------------------------------------
// Interactive Collection Handler Binding
// -------------------------------------------------------------
export function bindPay(rerender: () => void, getRows: () => Row[], on: () => string) {
  const app = $('#app');
  if (!app) return;

  app.addEventListener('click', async e => {
    const target = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
    if (!target || !target.dataset.id) return;
    e.preventDefault();

    const id = target.dataset.id;
    const action = target.dataset.a;
    const r = getRows().find(x => x.l.id === id);
    if (!r) return;

    if (action === 'pay') {
      const input = document.getElementById('a-' + id) as HTMLInputElement | null;
      const rawVal = Number(input?.value || 0);
      const amt = Math.min(rawVal, r.outstanding);

      if (amt <= 0) {
        toast('Please enter a valid amount to collect', 'error');
        return;
      }

      target.setAttribute('disabled', 'true');
      target.textContent = 'Collecting...';
      try {
        await pay(id, amt, on());
        toast(`Collected ${money(amt)} from ${r.c.name}`, 'success');
        rerender();
      } catch (err: any) {
        toast('Collection failed: ' + (err.message || 'Error'), 'error');
        target.removeAttribute('disabled');
        target.textContent = '✓ Collect';
      }
    } else if (action === 'undo') {
      if (confirm(`Undo collection for ${r.c.name}?`)) {
        await undo(id, on());
        toast('Payment undone', 'info');
        rerender();
      }
    }
  });
}
