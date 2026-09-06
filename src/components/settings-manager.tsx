'use client'

import * as React from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { swrStable } from '@/lib/swr-config'
import { toast } from 'sonner'
import {
  Settings as SettingsIcon,
  Save,
  Building,
  CreditCard,
  ShieldCheck,
  Mail,
  MessageSquare,
  Layers,
  RefreshCw,
  CircleAlert,
  Send,
  Loader2,
  Bot,
  Cpu,
  KeyRound,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Cloud,
  Globe,
  Database,
  Server,
  Lock,
  Download,
  Trash2,
  Upload,
  FileJson,
  Info,
  HardDriveDownload,
  Building2,
  Clock,
  Activity,
  Bell,
  CheckCircle2,
  BedDouble,
  Plus,
  X,
  Zap,
  Wrench,
  ShieldOff,
  Power,
  Eye,
} from 'lucide-react'

import { PageHeader, EmptyState } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAuthStore } from '@/lib/store'
import { cn, fmtDateTime, fmtRelative } from '@/lib/utils'
import { useRolePermissions } from '@/lib/use-role-permissions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettingCategory =
  | 'GENERAL'
  | 'PAYMENT'
  | 'SECURITY'
  | 'EMAIL'
  | 'SMS'
  | 'ALLOCATION'
  | 'AI'
  | 'MAINTENANCE'
  | 'BACKUP'

interface SettingsResponse {
  settings: Record<SettingCategory, Record<string, string>>
  raw: Array<{
    id: string
    key: string
    value: string
    category: SettingCategory
    updatedAt: string
  }>
}

// ---------------------------------------------------------------------------
// Field definitions per tab
// ---------------------------------------------------------------------------

interface FieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'email' | 'tel' | 'select' | 'textarea'
  placeholder?: string
  hint?: string
  options?: Array<{ label: string; value: string }>
}

const FIELDS: Partial<Record<SettingCategory, FieldDef[]>> = {
  GENERAL: [
    { key: 'institution_name', label: 'Institution Name', type: 'text', placeholder: 'e.g. Ahmadu Bello University' },
    { key: 'institution_code', label: 'Institution Code', type: 'text', placeholder: 'e.g. ABU' },
    { key: 'support_email', label: 'Support Email', type: 'email', placeholder: 'support@abu.edu.ng' },
    { key: 'support_phone', label: 'Support Phone', type: 'tel', placeholder: '+234 800 000 0000' },
    { key: 'default_student_password', label: 'Default Student Password', type: 'text', placeholder: '12345678', hint: 'Default password for new students. Change this to set a custom default.' },
    { key: 'chat_widget_enabled', label: 'Student Chat Widget', type: 'select', hint: 'Show floating chat support widget for students', options: [{ label: 'Enabled', value: 'true' }, { label: 'Disabled', value: 'false' }] },
    { key: 'roommate_feature_enabled', label: 'Roommate Directory', type: 'select', hint: 'Show the "My Roommates" nav item + page for students. When disabled, students see a "feature disabled" notice instead of the roommate list. Useful during privacy reviews.', options: [{ label: 'Enabled (default)', value: 'true' }, { label: 'Disabled', value: 'false' }] },
    { key: 'auth_code_payment_enabled', label: 'Authorization Code Payment', type: 'select', hint: 'Allow students to pay with bursary-issued codes', options: [{ label: 'Enabled', value: 'true' }, { label: 'Disabled', value: 'false' }] },
    { key: 'manual_payment_enabled', label: 'Manual Payment (Bank Transfer)', type: 'select', hint: 'Allow students to upload receipts for bursar confirmation', options: [{ label: 'Enabled', value: 'true' }, { label: 'Disabled', value: 'false' }] },
    { key: 'bank_account_name', label: 'Bank Account Name', type: 'text', placeholder: 'University Hostel Account' },
    { key: 'bank_account_number', label: 'Bank Account Number', type: 'text', placeholder: '0123456789' },
    { key: 'bank_name', label: 'Bank Name', type: 'text', placeholder: 'First Bank of Nigeria' },
  ],
  MAINTENANCE: [
    { key: 'maintenance_mode', label: 'Maintenance Mode', type: 'select', hint: 'When enabled, the site shows a maintenance page to users without a session. Admins and selected roles can still log in.', options: [{ label: 'Disabled (site live)', value: 'false' }, { label: 'Enabled (site under maintenance)', value: 'true' }] },
    { key: 'maintenance_title', label: 'Maintenance Page Title', type: 'text', placeholder: 'Under Maintenance', hint: 'Custom title shown on the maintenance page.' },
    { key: 'maintenance_message', label: 'Maintenance Message', type: 'text', placeholder: 'We are performing scheduled maintenance. Please check back soon.', hint: 'Custom message shown on the maintenance page to visitors.' },
    { key: 'maintenance_allowed_roles', label: 'Roles Allowed During Maintenance', type: 'text', placeholder: 'SUPER_ADMIN,ADMIN', hint: 'Comma-separated list of roles that can access the site during maintenance. Example: SUPER_ADMIN,ADMIN,BURSARY' },
  ],
  // PAYMENT tab moved to bursary-payment-settings.tsx (Bursary Office owns
  // all fee/pricing configuration). Removed from admin Settings.
  SECURITY: [
    { key: 'max_login_attempts', label: 'Max Login Attempts', type: 'number', placeholder: '5', hint: 'Failed attempts before lockout' },
    // ── Per-role session duration ──
    // 0 = session cookie (expires when browser closes, NOT auto-terminated).
    // Students default to 0 (no auto-expire) — they stay logged in until
    // they log out or the admin force-terminates their session.
    { key: 'session_duration_student', label: 'Student Session Duration (hours)', type: 'number', placeholder: '0', hint: '0 = no auto-expire (stays logged in until logout or browser closes). Default: 0.' },
    { key: 'session_duration_admin', label: 'Admin Session Duration (hours)', type: 'number', placeholder: '24', hint: 'How long an admin session lasts before requiring re-login. Default: 24.' },
    { key: 'session_duration_bursary', label: 'Bursary Session Duration (hours)', type: 'number', placeholder: '24', hint: 'How long a bursary session lasts. Default: 24.' },
    { key: 'session_duration_moderator', label: 'Moderator Session Duration (hours)', type: 'number', placeholder: '24', hint: 'How long a moderator session lasts. Default: 24.' },
    { key: 'session_duration_support_rep', label: 'Support Rep Session Duration (hours)', type: 'number', placeholder: '24', hint: 'How long a support rep session lasts. Default: 24.' },
    // ── Per-role max concurrent sessions ──
    // Controls how many devices a user can be logged in on simultaneously.
    // When the limit is exceeded, the oldest session is automatically killed.
    // 1 = single-session (strict, every new login kills the previous device).
    // 0 = unlimited (no limit — not recommended for students).
    { key: 'max_concurrent_sessions_student', label: 'Max Concurrent Sessions — Student', type: 'number', placeholder: '1', hint: 'How many devices a student can be logged in on at once. 1 = single session (every new login kills the previous). Default: 1.' },
    { key: 'max_concurrent_sessions_admin', label: 'Max Concurrent Sessions — Admin', type: 'number', placeholder: '3', hint: 'How many devices an admin can be logged in on at once. Default: 3.' },
    { key: 'max_concurrent_sessions_super_admin', label: 'Max Concurrent Sessions — Super Admin', type: 'number', placeholder: '5', hint: 'How many devices a super admin can be logged in on at once. Default: 5.' },
    { key: 'max_concurrent_sessions_bursary', label: 'Max Concurrent Sessions — Bursary', type: 'number', placeholder: '3', hint: 'How many devices a bursary officer can be logged in on at once. Default: 3.' },
    { key: 'max_concurrent_sessions_moderator', label: 'Max Concurrent Sessions — Moderator', type: 'number', placeholder: '3', hint: 'How many devices a moderator can be logged in on at once. Default: 3.' },
    { key: 'max_concurrent_sessions_support_rep', label: 'Max Concurrent Sessions — Support Rep', type: 'number', placeholder: '3', hint: 'How many devices a support rep can be logged in on at once. Default: 3.' },
  ],
  EMAIL: [
    // SMTP credentials are read-only from env vars. They are surfaced in the
    // SmtpCredentialsCard below (via /api/env-status) — not editable here.
    // The two editable fields below let the admin switch between providers
    // and configure the verified Resend sender address.
    {
      key: 'email_provider',
      label: 'Email Provider (Primary)',
      type: 'select',
      hint: 'Choose the primary email provider. If it fails, the system automatically falls back to the other configured providers in order. Gmail SMTP is always available; Resend requires RESEND_API_KEY; Mailgun requires MAILGUN_API_KEY + MAILGUN_DOMAIN; SendGrid requires SENDGRID_API_KEY; Plunk requires PLUNK_API_KEY.',
      options: [
        { label: 'Gmail SMTP (default)', value: 'smtp' },
        { label: 'Resend API', value: 'resend' },
        { label: 'Mailgun API', value: 'mailgun' },
        { label: 'SendGrid API', value: 'sendgrid' },
        { label: 'Plunk API', value: 'plunk' },
      ],
    },
    {
      key: 'resend_from_email',
      label: 'Resend From Email',
      type: 'email',
      placeholder: 'noreply@yourdomain.com',
      hint: 'The verified sender address Resend will use. Must be on a domain you have verified in your Resend dashboard.',
    },
  ],
  SMS: [
    {
      key: 'sms_provider',
      label: 'SMS Provider',
      type: 'select',
      options: [
        { label: 'Twilio', value: 'twilio' },
        { label: 'Termii', value: 'termii' },
        { label: 'AfricasTalking', value: 'africastalking' },
        { label: 'None', value: 'none' },
      ],
    },
    { key: 'sms_sender_id', label: 'SMS Sender ID', type: 'text', placeholder: 'HOSTEL' },
    {
      key: 'sms_notifications_enabled',
      label: 'SMS Notifications',
      type: 'select',
      hint: 'When enabled, the system sends an SMS (via Termii) for PAYMENT, ERROR, and WARNING notifications in addition to the in-app notification. Requires TERMII_API_KEY env var.',
      options: [
        { label: 'Enabled', value: 'true' },
        { label: 'Disabled', value: 'false' },
      ],
    },
  ],
  ALLOCATION: [
    { key: 'application_window_open_days', label: 'Application Window (days)', type: 'number', placeholder: '30', hint: 'Days the application window stays open' },
    {
      key: 'bed_lock_duration_minutes',
      label: 'Bed Lock Duration',
      type: 'select',
      hint: 'How long a student has to complete payment after selecting a bed before it\u2019s released back to the pool. Default: 5 minutes. A live countdown is shown on the student dashboard and payments page.',
      options: [
        { label: '5 minutes (default)', value: '5' },
        { label: '10 minutes', value: '10' },
        { label: '15 minutes', value: '15' },
        { label: '30 minutes', value: '30' },
        { label: '1 hour', value: '60' },
        { label: '2 hours', value: '120' },
        { label: '6 hours', value: '360' },
        { label: '12 hours', value: '720' },
        { label: '24 hours (1 day)', value: '1440' },
        { label: '48 hours (2 days)', value: '2880' },
        { label: '72 hours (3 days)', value: '4320' },
        { label: '168 hours (1 week)', value: '10080' },
      ],
    },
    {
      key: 'auto_verify_students',
      label: 'Student Verification Mode',
      type: 'select',
      hint: 'Auto: students are automatically approved when they fill all required profile fields (phone, home address, next of kin). Manual: profiles go to a pending queue for moderator/admin review. Default: Manual.',
      options: [
        { label: 'Manual verification (default)', value: 'false' },
        { label: 'Auto verification', value: 'true' },
      ],
    },
    {
      key: 'reallocation_enabled',
      label: 'Reallocation Feature',
      type: 'select',
      hint: 'When enabled, students can request to change their bed after allocation. When disabled, all reallocation buttons and pages are hidden from the student dashboard.',
      options: [
        { label: 'Enabled', value: 'true' },
        { label: 'Disabled (default)', value: 'false' },
      ],
    },
    {
      key: 'reallocation_auto_count',
      label: 'Auto-Reallocation Count',
      type: 'number',
      placeholder: '1',
      hint: 'How many times a student can auto-reallocate WITHOUT admin review. Used when the approval mode below is "after_grace". Default: 1. Set to 0 to disable all auto-approval under after_grace mode.',
    },
    {
      key: 'reallocation_requires_approval',
      label: 'Reallocation Approval Mode',
      type: 'select',
      hint: '"always" = every reallocation needs admin approval. "after_grace" (default) = the first N (auto_count) are auto-approved, the rest need approval. "never" = all auto-approved (no admin review).',
      options: [
        { label: 'Always require approval', value: 'always' },
        { label: 'Auto-approve first N, then require approval (after_grace)', value: 'after_grace' },
        { label: 'Never require approval (auto-approve all)', value: 'never' },
      ],
    },
  ],
  AI: [
    {
      key: 'ai_provider',
      label: 'AI Provider',
      type: 'select',
      hint: 'Choose the LLM that powers the AI Admin Assistant and Support Chat. DeepSeek requires an API key set in the server environment (DEEPSEEK_API_KEY).',
      options: [
        { label: 'Built-in LLM (no API key needed)', value: 'builtin' },
        { label: 'DeepSeek API (function calling)', value: 'deepseek' },
      ],
    },
    {
      key: 'ai_deepseek_model',
      label: 'DeepSeek Model',
      type: 'select',
      hint: 'Which DeepSeek model to use. deepseek-chat is faster + cheaper; deepseek-reasoner is smarter for complex queries.',
      options: [
        { label: 'deepseek-chat (fast, recommended)', value: 'deepseek-chat' },
        { label: 'deepseek-reasoner (smarter, slower)', value: 'deepseek-reasoner' },
      ],
    },
    {
      key: 'ai_agent_enabled',
      label: 'AI Agent Enabled',
      type: 'select',
      hint: 'Turn the AI Admin Assistant on or off across the portal.',
      options: [
        { label: 'Enabled', value: 'true' },
        { label: 'Disabled', value: 'false' },
      ],
    },
    {
      key: 'support_chat_enabled',
      label: 'Support Chat Widget',
      type: 'select',
      hint: 'Show or hide the support chat widget for students. When disabled, students can only use support tickets.',
      options: [
        { label: 'Enabled', value: 'true' },
        { label: 'Disabled', value: 'false' },
      ],
    },
    {
      key: 'student_dashboard_v2_enabled',
      label: 'AI Student Dashboard (V2)',
      type: 'select',
      hint: 'Switch the student dashboard to the new AI-powered chat interface. When disabled, students see the classic dashboard. Preview at /?view=student:overview-v2',
      options: [
        { label: 'Disabled (classic dashboard)', value: 'false' },
        { label: 'Enabled (AI chat dashboard)', value: 'true' },
      ],
    },
    {
      key: 'ai_api_key',
      label: 'DeepSeek API Key (Student Agent)',
      type: 'text',
      hint: 'API key for the student AI agent. Falls back to DEEPSEEK_API_KEY env var if empty. Get one at platform.deepseek.com',
      placeholder: 'sk-...',
    },
    {
      key: 'ai_student_system_prompt',
      label: 'Student Agent System Prompt',
      type: 'textarea',
      hint: 'Custom system prompt for the student AI assistant. This controls the AI\'s personality and behavior.',
      placeholder: 'You are AUSU Hostel Assistant...',
    },
    {
      key: 'ai_message_history_limit',
      label: 'AI Message History Limit',
      type: 'text',
      hint: 'How many recent messages to send to the AI (older messages are dropped to save tokens). Default: 10. Lower = cheaper but less context.',
      placeholder: '10',
    },
    {
      key: 'ai_temperature',
      label: 'AI Temperature',
      type: 'text',
      hint: 'Controls response creativity. 0.0 = deterministic, 1.0 = creative. Lower = cheaper (less token waste). Default: 0.3',
      placeholder: '0.3',
    },
    {
      key: 'ai_max_steps',
      label: 'AI Max Tool Steps',
      type: 'text',
      hint: 'Maximum number of tool calls the AI can make per response. Higher = more capable but more expensive. Default: 5',
      placeholder: '5',
    },
    {
      key: 'support_bot_persona',
      label: 'Support Bot Persona',
      type: 'text',
      placeholder: 'Friendly, helpful, concise. Uses the student\'s name. Professional tone.',
      hint: 'Describe how the support bot should behave. This overrides the default persona. Leave blank to use the default.',
    },
    {
      key: 'support_bot_temperature',
      label: 'Bot Creativity (Temperature)',
      type: 'select',
      hint: 'Lower = more focused and deterministic. Higher = more creative and varied. 0.3 is recommended for support.',
      options: [
        { label: '0.1 — Very focused (recommended)', value: '0.1' },
        { label: '0.3 — Balanced (default)', value: '0.3' },
        { label: '0.5 — Moderate creativity', value: '0.5' },
        { label: '0.7 — Creative', value: '0.7' },
      ],
    },
    {
      key: 'support_bot_system_access',
      label: 'Bot System Data Access',
      type: 'select',
      hint: 'When enabled, the bot can access the student\'s profile, allocation, payment history, and system settings to give more accurate answers. When disabled, the bot only uses general knowledge.',
      options: [
        { label: 'Enabled — bot can access student data (recommended)', value: 'true' },
        { label: 'Disabled — bot uses general knowledge only', value: 'false' },
      ],
    },
  ],
  BACKUP: [
    {
      key: 'backup_frequency',
      label: 'Auto-backup Frequency',
      type: 'select',
      hint: 'How often Vercel Cron should trigger an automatic backup. Requires a cron entry pointing at /api/backup/run (see Vercel deployment notes).',
      options: [
        { label: 'Disabled', value: 'disabled' },
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
      ],
    },
    {
      key: 'backup_retention_days',
      label: 'Backup Retention (days)',
      type: 'select',
      hint: 'How long to keep stored backups before they are auto-deleted.',
      options: [
        { label: '7 days', value: '7' },
        { label: '14 days', value: '14' },
        { label: '30 days', value: '30' },
        { label: '90 days', value: '90' },
      ],
    },
    {
      key: 'audit_log_retention_days',
      label: 'Audit Log Retention (days)',
      type: 'select',
      hint: 'Audit logs older than this will be automatically deleted by the /api/audit-logs/cleanup cron job. Set to "Keep forever" to never auto-delete logs.',
      options: [
        { label: 'Keep forever (no auto-cleanup)', value: '0' },
        { label: '30 days', value: '30' },
        { label: '60 days', value: '60' },
        { label: '90 days', value: '90' },
        { label: '180 days', value: '180' },
        { label: '365 days', value: '365' },
      ],
    },
    {
      key: 'health_alert_enabled',
      label: 'Health Alert Emails',
      type: 'select',
      hint: 'Send an email alert when overall system health drops below the threshold.',
      options: [
        { label: 'Enabled', value: 'true' },
        { label: 'Disabled', value: 'false' },
      ],
    },
    {
      key: 'health_alert_threshold',
      label: 'Health Alert Threshold (%)',
      type: 'number',
      placeholder: '50',
      hint: 'Alert when overall health % drops below this value (0-100).',
    },
    {
      key: 'health_alert_email',
      label: 'Health Alert Recipient',
      type: 'email',
      placeholder: 'admin@abu.edu.ng',
      hint: 'Email address to receive health alerts. Falls back to the support email if blank.',
    },
  ],
}

const TAB_META: Array<{
  key: SettingCategory
  label: string
  icon: React.ElementType
  description: string
  superAdminOnly?: boolean
  // Per-Settings-tab permission flag that gates visibility of this tab
  // for non-SUPER_ADMIN users. MAINTENANCE + BACKUP are intentionally
  // undefined — they remain superAdminOnly and aren't gated by a flag.
  requiredFlag?:
    | 'canManageGeneralSettings'
    | 'canManageSecuritySettings'
    | 'canManageEmailSettings'
    | 'canManageSmsSettings'
    | 'canManageAllocationSettings'
    | 'canManageAiSettings'
}> = [
  { key: 'GENERAL', label: 'General', icon: Building, description: 'Institution identity & contact details', requiredFlag: 'canManageGeneralSettings' },
  // PAYMENT tab removed — fee/pricing configuration now lives in
  // src/components/bursary/bursary-payment-settings.tsx (Bursary Office).
  { key: 'SECURITY', label: 'Security', icon: ShieldCheck, description: 'Login attempt & lockout policies', requiredFlag: 'canManageSecuritySettings' },
  { key: 'EMAIL', label: 'Email', icon: Mail, description: 'SMTP server configuration', requiredFlag: 'canManageEmailSettings' },
  { key: 'SMS', label: 'SMS', icon: MessageSquare, description: 'SMS gateway & sender identity', requiredFlag: 'canManageSmsSettings' },
  { key: 'ALLOCATION', label: 'Allocation', icon: Layers, description: 'Application window & bed lock duration', requiredFlag: 'canManageAllocationSettings' },
  { key: 'AI', label: 'AI Assistant', icon: Bot, description: 'Choose AI provider & enable/disable the agent', requiredFlag: 'canManageAiSettings' },
  { key: 'MAINTENANCE', label: 'Maintenance', icon: Wrench, description: 'Maintenance mode, kill switch & site access control', superAdminOnly: true },
  { key: 'BACKUP', label: 'Backup & Recovery', icon: HardDriveDownload, description: 'Database backups, audit retention & health alerts', superAdminOnly: true },
]

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(async (r) => {
    if (!r.ok) {
      // Read the error message from the response body so we can see
      // the ACTUAL error (e.g. "column does not exist") instead of
      // just "Request failed: 500".
      const body = await r.json().catch(() => null)
      throw new Error(body?.error || `Request failed: ${r.status}`)
    }
    return r.json()
  })

// ---------------------------------------------------------------------------
// Per-tab form
// ---------------------------------------------------------------------------

function SettingsTabForm({
  category,
  fields,
  values,
  canEdit,
  onSaved,
}: {
  category: SettingCategory
  fields: FieldDef[]
  values: Record<string, string>
  canEdit: boolean
  onSaved: () => void
}) {
  const { mutate } = useSWRConfig()
  const [draft, setDraft] = React.useState<Record<string, string>>(values)
  const [saving, setSaving] = React.useState(false)
  const meta = TAB_META.find((m) => m.key === category)!

  // Re-sync when upstream values change
  React.useEffect(() => {
    setDraft(values)
  }, [values])

  const dirtyKeys = fields.filter((f) => (draft[f.key] ?? '') !== (values[f.key] ?? ''))
  const isDirty = dirtyKeys.length > 0

  const handleSave = async () => {
    setSaving(true)
    const t = toast.loading(`Saving ${meta.label} settings…`)
    try {
      const results = await Promise.all(
        dirtyKeys.map((f) =>
          fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: f.key, value: String(draft[f.key] ?? ''), category }),
            credentials: 'include',
          }).then(async (r) => {
            if (!r.ok) {
              const body = await r.json().catch(() => ({}))
              throw new Error(body?.error || `Failed to save ${f.key}`)
            }
            return r.json()
          })
        )
      )
      toast.success(`${meta.label} settings saved (${results.length} field${results.length === 1 ? '' : 's'} updated).`, { id: t })
      mutate('/api/settings')
      mutate('/api/dashboard')
      mutate('/api/audit-logs')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save settings', { id: t })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <meta.icon className="h-4 w-4 text-primary" />
              {meta.label}
            </CardTitle>
            <CardDescription className="text-xs">{meta.description}</CardDescription>
          </div>
          {isDirty && (
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
              {dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key} className="text-xs font-medium">
                {f.label}
              </Label>
              {f.type === 'select' ? (
                <Select
                  value={draft[f.key] ?? ''}
                  onValueChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                  disabled={!canEdit}
                >
                  <SelectTrigger id={f.key} className="w-full">
                    <SelectValue placeholder={f.placeholder || 'Select…'} />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={f.key}
                  type={f.type}
                  placeholder={f.placeholder}
                  value={draft[f.key] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  disabled={!canEdit}
                />
              )}
              {f.hint && <p className="text-[10px] text-muted-foreground">{f.hint}</p>}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDraft(values)}
            disabled={!isDirty || saving || !canEdit}
          >
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!isDirty || saving || !canEdit}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Per-role permission fetcher (lightweight — only one role's flags)
// ---------------------------------------------------------------------------

interface RolePermissionResponse {
  permission: Record<string, unknown> & {
    id: string
    role: string
    updatedAt: string | null
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SettingsManager() {
  const { data, isLoading, error } = useSWR<SettingsResponse>('/api/settings', fetcher, {
    ...swrStable,
    revalidateOnFocus: false,
  })
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const { canManage, isViewOnly } = useRolePermissions()
  const canEdit = canManage('canManageSettings')
  const viewOnly = isViewOnly('canManageSettings', 'canViewGeneralSettings')

  // Fetch the current user's role-permission record so we can gate which
  // Settings tabs they can see. SUPER_ADMIN short-circuits (no fetch needed).
  // Students aren't expected to reach this page (the Settings nav item is
  // gated by `canManageSettings`), but if they do, the SWR call still works
  // — the GET endpoint requires only STUDENT rank.
  const roleKey = (user?.role || '').toUpperCase()
  const shouldFetchPerms =
    !isSuperAdmin &&
    ['ADMIN', 'BURSARY', 'MODERATOR', 'SUPPORT_REP'].includes(roleKey)
  const { data: rolePermsData, isLoading: rolePermsLoading } =
    useSWR<RolePermissionResponse>(
      shouldFetchPerms ? `/api/role-permissions/${roleKey}` : null,
      fetcher,
      { ...swrStable, revalidateOnFocus: false }
    )
  const rolePerms = rolePermsData?.permission

  // Filter tabs: SUPER_ADMIN sees everything. Other roles see only tabs
  // whose `requiredFlag` is true on their RolePermission record (or, if no
  // record exists yet, the default value of that flag).
  const visibleTabs = TAB_META.filter((t) => {
    if (t.superAdminOnly) return isSuperAdmin
    if (isSuperAdmin) return true
    if (!t.requiredFlag) return true
    // Role has a permission record → use it; otherwise fall back to true
    // (defaults are also enforced server-side via ROLE_PERMISSION_DEFAULTS,
    // but for tabs we want to be permissive in the UI when no record exists
    // yet, since the GET /api/settings endpoint also returns GENERAL etc.
    // to non-super-admins by default).
    if (!rolePerms) return true
    return Boolean(rolePerms[t.requiredFlag])
  })

  if (isLoading || (shouldFetchPerms && rolePermsLoading)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="System Settings"
          description="Configure institution-wide preferences — payment, email, security, and more."
        />
        <Skeleton className="h-9 w-full max-w-2xl" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="System Settings" description="Configure institution-wide preferences." />
        <EmptyState
          icon={CircleAlert}
          title="Couldn't load settings"
          description={error.message || 'Please retry in a moment.'}
          action={
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Retry
            </Button>
          }
        />
      </div>
    )
  }

  const settings = data?.settings ?? ({} as Record<SettingCategory, Record<string, string>>)

  // If the user has no visible tabs (because their role lacks every
  // per-tab permission flag), show a friendly empty-state instead of an
  // empty Tabs shell. This shouldn't normally happen because the Settings
  // nav item is itself gated by `canManageSettings`, but the per-tab flags
  // can theoretically all be false while `canManageSettings` is true.
  if (visibleTabs.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="System Settings"
          description="Configure institution-wide preferences — payment, email, security, and more."
        />
        <EmptyState
          icon={Lock}
          title="No settings available"
          description="You don't have permission to manage any settings. Contact an administrator if you believe this is an error."
        />
      </div>
    )
  }

  // The default tab is the first visible one — so a role that can only see
  // EMAIL lands on EMAIL, not on a hidden/empty GENERAL tab.
  const defaultTab = visibleTabs[0]?.key ?? 'GENERAL'

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        description="Configure institution-wide preferences — payment, email, security, and more."
        actions={
          <Badge variant="outline" className="text-[10px]">
            <SettingsIcon className="h-3 w-3 mr-1" />
            {data?.raw?.length ?? 0} settings configured
          </Badge>
        }
      />

      {viewOnly && (
        <div className="rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span>You have view-only access. Editing is disabled.</span>
        </div>
      )}

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          {visibleTabs.map((m) => (
            <TabsTrigger key={m.key} value={m.key} className="gap-1.5">
              <m.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{m.label}</span>
              <span className="sm:hidden">{m.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {visibleTabs.map((m) => (
          <TabsContent key={m.key} value={m.key}>
            {(FIELDS[m.key]?.length ?? 0) > 0 && (
              <SettingsTabForm
                category={m.key}
                fields={FIELDS[m.key] || []}
                values={settings[m.key] || {}}
                canEdit={canEdit}
                onSaved={() => {/* SWR mutate is handled inside */}}
              />
            )}
            {m.key === 'GENERAL' && (
              <>
                <EnforceStudentPasswordChangeCard
                  initialValue={
                    settings.GENERAL?.enforce_student_password_change === undefined ||
                    settings.GENERAL?.enforce_student_password_change === ''
                      ? true
                      : settings.GENERAL?.enforce_student_password_change === 'true'
                  }
                />
                <ResetAllPasswordsCard defaultPassword={settings.GENERAL?.default_student_password} />
                <ShowVerificationBadgesCard
                  initialValue={
                    settings.GENERAL?.show_verification_badges === undefined ||
                    settings.GENERAL?.show_verification_badges === ''
                      ? true
                      : settings.GENERAL?.show_verification_badges === 'true'
                  }
                />
              </>
            )}
            {m.key === 'ALLOCATION' && (
              <AutoApproveCard initialValue={settings.ALLOCATION?.application_auto_approve === 'true'} />
            )}
            {m.key === 'EMAIL' && (
              <>
                <SmtpCredentialsCard />
                <EmailTestCard />
                <EmailTypeTogglesCard />
              </>
            )}
            {m.key === 'SMS' && (
              <SmsTestCard />
            )}
            {/* PAYMENT tab removed — see bursary-payment-settings.tsx */}
            {m.key === 'SECURITY' && (
              <>
                <CaptchaSecurityCard values={settings.SECURITY || {}} />
                <SystemCredentialsCard />
              </>
            )}
            {m.key === 'AI' && (
              <>
                <AiStatusCard />
                <DeepSeekTestCard />
              </>
            )}
            {m.key === 'MAINTENANCE' && <KillSwitchCard />}
            {m.key === 'BACKUP' && (
              <>
                <BackupRecoveryCard />
                <BackupActivityLogCard />
                <HostelStructureBackupCard />
                <DangerZoneResetCard />
                <AuditCleanupCard retentionDays={settings.BACKUP?.audit_log_retention_days} />
                <HealthAlertCard
                  enabled={settings.BACKUP?.health_alert_enabled === 'true'}
                  threshold={settings.BACKUP?.health_alert_threshold}
                  email={settings.BACKUP?.health_alert_email}
                />
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Auto-approve applications — toggle under the GENERAL tab.
// When enabled, the POST /api/applications route sets new applications to
// APPROVED immediately (instead of PENDING). The student gets an approval
// notification + email right away and can proceed to pay their fee.
// ---------------------------------------------------------------------------

function AutoApproveCard({ initialValue }: { initialValue: boolean }) {
  const { mutate } = useSWRConfig()
  const [enabled, setEnabled] = React.useState(initialValue)
  const [saving, setSaving] = React.useState(false)

  // Re-sync when upstream setting changes
  React.useEffect(() => {
    setEnabled(initialValue)
  }, [initialValue])

  async function handleToggle(value: boolean) {
    setSaving(true)
    setEnabled(value)
    const t = toast.loading(value ? 'Enabling auto-approve…' : 'Disabling auto-approve…')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          key: 'application_auto_approve',
          value: String(value),
          category: 'ALLOCATION',
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to update setting')
      }
      toast.success(value ? 'Auto-approve enabled' : 'Auto-approve disabled', { id: t })
      mutate('/api/settings')
      mutate('/api/audit-logs')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update', { id: t })
      setEnabled(!value) // revert on failure
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mt-4 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Auto-approve Applications
        </CardTitle>
        <CardDescription className="text-xs">
          When enabled, student applications are automatically approved. When disabled, applications require manual approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={saving}
              aria-label="Toggle auto-approve applications"
            />
            <span className={`text-sm font-semibold ${enabled ? 'text-primary' : 'text-muted-foreground'}`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {enabled
            ? 'Students who apply will be approved instantly and can proceed to pay their hostel fee — no admin action needed.'
            : 'Students who apply will see "Pending" status until an admin or moderator approves them from the Applications page.'}
        </p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Enforce student password change — card under the GENERAL tab.
// Toggles the `enforce_student_password_change` system setting (default:
// 'true'). When enabled, students whose `User.usingDefaultPassword` flag is
// true (i.e. they were created with the default password, or an admin bulk-
// reset every student back to it) see a non-dismissable modal on next
// sign-in that forces them to pick their own password before they can use
// the dashboard. When disabled, students on the default password can sign
// in normally without being prompted.
// ---------------------------------------------------------------------------

function EnforceStudentPasswordChangeCard({ initialValue }: { initialValue: boolean }) {
  const { mutate } = useSWRConfig()
  const [enabled, setEnabled] = React.useState(initialValue)
  const [saving, setSaving] = React.useState(false)

  // Re-sync when the upstream setting changes (e.g. after another admin
  // edits it from a different session).
  React.useEffect(() => {
    setEnabled(initialValue)
  }, [initialValue])

  async function handleToggle(value: boolean) {
    setSaving(true)
    setEnabled(value)
    const t = toast.loading(value ? 'Enforcing default-password change…' : 'Disabling enforcement…')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          key: 'enforce_student_password_change',
          value: String(value),
          category: 'GENERAL',
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to update setting')
      }
      toast.success(
        value
          ? 'Enforcement enabled — students on the default password must change it on next sign-in.'
          : 'Enforcement disabled — students on the default password can sign in normally.',
        { id: t }
      )
      mutate('/api/settings')
      mutate('/api/audit-logs')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update', { id: t })
      setEnabled(!value) // revert on failure
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mt-4 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Enforce Student Password Change
        </CardTitle>
        <CardDescription className="text-xs">
          Force students using the shared default password to set their own password the first time they sign in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={saving}
              aria-label="Toggle enforce student password change"
            />
            <span className={`text-sm font-semibold ${enabled ? 'text-primary' : 'text-muted-foreground'}`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {enabled
            ? 'Students created with the default password (and any student whose password was bulk-reset back to the default) will see a non-dismissable modal on their next sign-in. They must set their own password before they can access the dashboard.'
            : 'Students using the default password will be able to sign in normally. They can still change their password at any time from the Security page.'}
        </p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Show verification badges — global toggle under the GENERAL tab.
// When ON (default), any student whose verification status is APPROVED will
// display a green shield-check icon next to their name across the app
// (students list, profile page, dashboard header, profile dropdown). There
// is no per-student toggle — approval is the only requirement.
// When OFF, no badges render anywhere — admins can use this as a single
// switch to suppress every badge in the app.
// ---------------------------------------------------------------------------

function ShowVerificationBadgesCard({ initialValue }: { initialValue: boolean }) {
  const { mutate } = useSWRConfig()
  const [enabled, setEnabled] = React.useState(initialValue)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setEnabled(initialValue)
  }, [initialValue])

  async function handleToggle(value: boolean) {
    setSaving(true)
    setEnabled(value)
    const t = toast.loading(value ? 'Enabling verification badges…' : 'Disabling verification badges…')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          key: 'show_verification_badges',
          value: String(value),
          category: 'GENERAL',
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to update setting')
      }
      toast.success(
        value
          ? 'Verification badges enabled — every approved student will show a green shield next to their name.'
          : 'Verification badges disabled — no badges will render anywhere in the app.',
        { id: t }
      )
      mutate('/api/settings')
      mutate('/api/audit-logs')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update', { id: t })
      setEnabled(!value) // revert on failure
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mt-4 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Show Verification Badges
        </CardTitle>
        <CardDescription className="text-xs">
          Master switch for the green shield-check badge shown next to a
          student&apos;s name. When enabled, the badge appears automatically
          for every student whose identity verification has been approved —
          no per-student setup needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={saving}
              aria-label="Toggle verification badges globally"
            />
            <span className={`text-sm font-semibold ${enabled ? 'text-primary' : 'text-muted-foreground'}`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {enabled
            ? 'Badges render automatically for every approved student. Disable here to suppress all badges app-wide (e.g. during a review window).'
            : 'No badges will render anywhere in the app, regardless of student verification status.'}
        </p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Captcha / Bot protection — card under the SECURITY tab.
// Stores 5 system settings under the SECURITY category:
//   captcha_provider     (none | turnstile | recaptcha)
//   captcha_site_key     (public — embedded in client markup)
//   captcha_secret_key   (server-side only — never returned by /api/captcha/config)
//   captcha_on_login     (true | false, default true)
//   captcha_on_forgot    (true | false, default true)
// Only ONE provider can be active at a time (radio group).
// ---------------------------------------------------------------------------

type CaptchaProviderValue = 'none' | 'turnstile' | 'recaptcha'

const PROVIDER_OPTIONS: Array<{
  value: CaptchaProviderValue
  label: string
  description: string
  icon: React.ElementType
}> = [
  {
    value: 'none',
    label: 'None',
    description: 'No captcha — bot protection disabled.',
    icon: ShieldAlert,
  },
  {
    value: 'turnstile',
    label: 'Cloudflare Turnstile',
    description: 'Invisible / managed challenge. Free, privacy-friendly.',
    icon: Cloud,
  },
  {
    value: 'recaptcha',
    label: 'Google reCAPTCHA v3',
    description: 'Invisible reCAPTCHA returning a risk score 0.0–1.0.',
    icon: Globe,
  },
]

function CaptchaSecurityCard({ values }: { values: Record<string, string> }) {
  const { mutate } = useSWRConfig()

  // Initialise from upstream values; defaults match the spec (both toggles on)
  const initialProvider: CaptchaProviderValue =
    values.captcha_provider === 'turnstile' || values.captcha_provider === 'recaptcha'
      ? values.captcha_provider
      : 'none'

  const [provider, setProvider] =
    React.useState<CaptchaProviderValue>(initialProvider)
  const [siteKey, setSiteKey] = React.useState(values.captcha_site_key || '')
  // SECURITY: The captcha secret key is intentionally NOT loaded from the DB
  // into the form state. The actual secret never enters the browser DOM —
  // the input is always empty by default, with a placeholder that tells the
  // admin whether a secret is already saved. Only when the admin types a new
  // value do we send it to the server. This means even an XSS or DOM
  // inspection cannot leak the existing captcha secret.
  const hasExistingSecret = !!(values.captcha_secret_key && values.captcha_secret_key.trim())
  const [secretKey, setSecretKey] = React.useState('')
  const [onLogin, setOnLogin] = React.useState(
    values.captcha_on_login === undefined || values.captcha_on_login === ''
      ? true
      : values.captcha_on_login === 'true'
  )
  const [onForgot, setOnForgot] = React.useState(
    values.captcha_on_forgot === undefined || values.captcha_on_forgot === ''
      ? true
      : values.captcha_on_forgot === 'true'
  )
  const [saving, setSaving] = React.useState(false)

  // Re-sync when upstream settings change (e.g. after a save / external edit)
  React.useEffect(() => {
    setProvider(
      values.captcha_provider === 'turnstile' || values.captcha_provider === 'recaptcha'
        ? values.captcha_provider
        : 'none'
    )
    setSiteKey(values.captcha_site_key || '')
    // Never pre-fill the secret — keep the input empty so the existing
    // secret is not rendered in the DOM. The placeholder reflects whether
    // a secret is already saved server-side.
    setSecretKey('')
    setOnLogin(
      values.captcha_on_login === undefined || values.captcha_on_login === ''
        ? true
        : values.captcha_on_login === 'true'
    )
    setOnForgot(
      values.captcha_on_forgot === undefined || values.captcha_on_forgot === ''
        ? true
        : values.captcha_on_forgot === 'true'
    )
  }, [values])

  const isDirty =
    provider !== initialProvider ||
    siteKey !== (values.captcha_site_key || '') ||
    // Secret is dirty only when the admin typed a new value (the input is
    // always empty by default — never pre-filled from the DB).
    secretKey.trim() !== '' ||
    onLogin !==
      (values.captcha_on_login === undefined || values.captcha_on_login === ''
        ? true
        : values.captcha_on_login === 'true') ||
    onForgot !==
      (values.captcha_on_forgot === undefined || values.captcha_on_forgot === ''
        ? true
        : values.captcha_on_forgot === 'true')

  const putSetting = async (key: string, value: string) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ key, value, category: 'SECURITY' }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error || `Failed to save ${key}`)
    }
    return res.json()
  }

  const handleSave = async () => {
    if (provider !== 'none' && (!siteKey.trim() || !secretKey.trim())) {
      toast.error('Site Key and Secret Key are required for the selected provider')
      return
    }
    setSaving(true)
    const t = toast.loading('Saving captcha settings…')
    try {
      await Promise.all([
        putSetting('captcha_provider', provider),
        putSetting('captcha_site_key', siteKey.trim()),
        // Don't overwrite the secret with empty when disabling — leave the
        // existing value in place so an admin can flip back without re-entering.
        ...(secretKey.trim()
          ? [putSetting('captcha_secret_key', secretKey.trim())]
          : []),
        putSetting('captcha_on_login', String(onLogin)),
        putSetting('captcha_on_forgot', String(onForgot)),
      ])
      toast.success('Captcha settings saved.', { id: t })
      mutate('/api/settings')
      mutate('/api/captcha/config')
      mutate('/api/audit-logs')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save', { id: t })
    } finally {
      setSaving(false)
    }
  }

  const needsKeys = provider !== 'none'

  return (
    <Card className="mt-4 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Bot Protection (Captcha)
        </CardTitle>
        <CardDescription className="text-xs">
          Add a captcha challenge to login and forgot-password pages. Only one provider
          can be active at a time. The secret key is stored server-side only — it is never
          exposed to the browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Captcha provider</Label>
          <RadioGroup
            value={provider}
            onValueChange={(v) => setProvider(v as CaptchaProviderValue)}
            className="gap-2"
          >
            {PROVIDER_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                htmlFor={`captcha-provider-${opt.value}`}
                className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <RadioGroupItem
                  id={`captcha-provider-${opt.value}`}
                  value={opt.value}
                  className="mt-0.5"
                />
                <opt.icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold">{opt.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {opt.description}
                  </div>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        {needsKeys && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="captcha_site_key" className="text-xs font-medium">
                Site Key
              </Label>
              <Input
                id="captcha_site_key"
                type="text"
                placeholder={
                  provider === 'turnstile'
                    ? '0x4AAAAAAA...'
                    : '6LcXXXXXXXXXXXXXXX'
                }
                value={siteKey}
                onChange={(e) => setSiteKey(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Public key — safe to expose in client-side markup.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="captcha_secret_key" className="text-xs font-medium">
                Secret Key
              </Label>
              <Input
                id="captcha_secret_key"
                type="password"
                placeholder={hasExistingSecret ? '•••••••••••••••• (enter new to replace)' : 'Paste your provider secret key'}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
              />
              <p className="text-[10px] text-muted-foreground">
                {hasExistingSecret
                  ? 'A secret is already saved. Leave blank to keep the existing value — only enter a new value to replace it.'
                  : 'Server-side only. Not yet configured — paste the secret from your provider dashboard.'}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t">
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold">Require on login</div>
              <div className="text-[11px] text-muted-foreground">
                Show captcha on the sign-in form.
              </div>
            </div>
            <Switch
              checked={onLogin}
              onCheckedChange={setOnLogin}
              disabled={saving}
              aria-label="Require captcha on login"
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold">Require on forgot password</div>
              <div className="text-[11px] text-muted-foreground">
                Show captcha on the forgot-password form.
              </div>
            </div>
            <Switch
              checked={onForgot}
              onCheckedChange={setOnForgot}
              disabled={saving}
              aria-label="Require captcha on forgot password"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setProvider(initialProvider)
              setSiteKey(values.captcha_site_key || '')
              // Don't pre-fill the secret — keep it empty so the existing
              // value is never rendered in the DOM. The placeholder already
              // indicates whether a secret is saved server-side.
              setSecretKey('')
              setOnLogin(
                values.captcha_on_login === undefined || values.captcha_on_login === ''
                  ? true
                  : values.captcha_on_login === 'true'
              )
              setOnForgot(
                values.captcha_on_forgot === undefined || values.captcha_on_forgot === ''
                  ? true
                  : values.captcha_on_forgot === 'true'
              )
            }}
            disabled={!isDirty || saving}
          >
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!isDirty || saving}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Reset all student passwords — danger zone card under the GENERAL tab.
// Posts to /api/bulk-actions with action=reset-password-all, entityType=students.
// Uses a type-to-confirm pattern ("RESET ALL") to prevent accidents.
// ---------------------------------------------------------------------------

function ResetAllPasswordsCard({ defaultPassword }: { defaultPassword?: string }) {
  const { mutate } = useSWRConfig()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmText, setConfirmText] = React.useState('')
  const [resetting, setResetting] = React.useState(false)

  const effectiveDefault =
    defaultPassword && defaultPassword.trim().length >= 8
      ? defaultPassword.trim()
      : '12345678'

  const canExecute = confirmText.trim() === 'RESET ALL' && !resetting

  async function handleReset() {
    if (!canExecute) return
    setResetting(true)
    const t = toast.loading('Resetting all student passwords…')
    try {
      const res = await fetch('/api/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entityType: 'students',
          action: 'reset-password-all',
          ids: [], // empty — server treats this as "all students"
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || 'Failed to reset passwords', { id: t })
        return
      }
      const count = data?.count ?? data?.successCount ?? 0
      toast.success(`Reset ${count} student password${count === 1 ? '' : 's'} to the default.`, { id: t })
      setConfirmOpen(false)
      setConfirmText('')
      mutate('/api/audit-logs')
      mutate('/api/dashboard')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Network error', { id: t })
    } finally {
      setResetting(false)
    }
  }

  return (
    <Card className="mt-4 border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" /> Danger Zone — Reset All Student Passwords
        </CardTitle>
        <CardDescription className="text-xs">
          Reset every student's password to the default password in one go. Students will need to use the new password to log in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg p-3 text-xs bg-muted/40 border flex items-start gap-2">
          <KeyRound className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <div>
            <span className="text-muted-foreground">Active default password: </span>
            <code className="font-mono font-semibold">{effectiveDefault}</code>
            <p className="mt-1 text-muted-foreground">
              You can change this default above (Default Student Password field) before running the reset.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-muted-foreground max-w-xl">
            This action is irreversible. All students will receive the same password — they should change it after their next sign-in.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            className="w-full sm:w-auto"
          >
            <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Reset All Student Passwords
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => {
        if (!resetting) {
          setConfirmOpen(open)
          if (!open) setConfirmText('')
        }
      }}>
        <AlertDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Reset ALL student passwords?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will reset <strong>ALL</strong> student passwords to the default password
              (<code className="font-mono">{effectiveDefault}</code>). Students will need to use the new password to log in.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirm-text" className="text-xs font-medium">
              Type <code className="font-mono">RESET ALL</code> to confirm
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET ALL"
              autoComplete="off"
              autoCapitalize="characters"
              disabled={resetting}
              className="font-mono"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleReset()
              }}
              disabled={!canExecute}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Resetting…
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 mr-1.5" /> Reset All Passwords
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// ===========================================================================
// ENV-BACKED CREDENTIALS — read-only display cards
// ===========================================================================
//
// All credentials that historically lived in the SystemSetting table
// (SMTP_HOST/PORT/USER/PASS/FROM_*) plus the system-level secrets
// (DATABASE_URL, SESSION_SECRET, DEEPSEEK_API_KEY) now come exclusively
// from environment variables. They are surfaced in the admin UI as
// read-only masked inputs with a "✓ Configured" / "⚠ Not configured"
// badge and an env-var hint ("Set SMTP_HOST in your .env file").
//
// The masked values + configured status are served by GET /api/env-status
// (SUPER_ADMIN only). The admin CANNOT edit any of these from the UI —
// the source of truth is the server's .env / Vercel environment variables.
// ---------------------------------------------------------------------------

interface EnvCredentialStatus {
  configured: boolean
  masked: string
  envVar: string
  kind: 'secret' | 'url' | 'email' | 'default'
}

interface EnvStatusResponse {
  credentials: Record<string, EnvCredentialStatus>
}

const envStatusFetcher = async (url: string): Promise<EnvStatusResponse> => {
  const r = await fetch(url, { credentials: 'include' })
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error(body?.error || `Request failed: ${r.status}`)
  }
  return r.json()
}

/**
 * Shared field renderer for a single env-backed credential.
 *
 * Renders:
 *   - The field label + a key icon
 *   - A status badge ("✓ Configured" green / "⚠ Not configured" red)
 *   - A read-only input showing the masked value (or "Not set in .env")
 *   - An env-var hint ("Set SMTP_HOST in your .env file")
 *
 * Mirrors the credential-field pattern used in payment-gateways.tsx so the
 * visual language is consistent across the admin UI.
 */
function EnvCredentialField({
  status,
  label,
  hint,
  icon: Icon = KeyRound,
}: {
  status: EnvCredentialStatus | undefined
  label: string
  hint?: string
  icon?: React.ElementType
}) {
  const configured = !!status?.configured
  const maskedValue = status?.masked ?? ''

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <Icon className="h-3 w-3 text-muted-foreground" />
          {label}
        </Label>
        {configured ? (
          <Badge
            variant="outline"
            className="text-[9px] py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
          >
            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Configured
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-[9px] py-0 bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
          >
            <AlertCircle className="h-2.5 w-2.5 mr-0.5" /> Not configured
          </Badge>
        )}
      </div>
      <Input
        type="text"
        readOnly
        value={maskedValue}
        placeholder="Not set in .env"
        className="text-sm font-mono bg-muted/40 cursor-not-allowed text-muted-foreground focus-visible:ring-0"
        tabIndex={-1}
        aria-label={`${label} (read-only, set via ${status?.envVar || 'environment variable'})`}
      />
      {status?.envVar && (
        <p className="text-[10px] text-muted-foreground">
          Set{' '}
          <code className="font-mono px-1 py-0.5 rounded bg-muted/60 text-foreground/80">
            {status.envVar}
          </code>{' '}
          in your .env file or Vercel environment variables.
        </p>
      )}
      {hint && <p className="text-[10px] text-muted-foreground/80">{hint}</p>}
    </div>
  )
}

/**
 * SMTP credentials card — rendered under the EMAIL tab.
 *
 * Shows the six SMTP env vars as read-only masked inputs:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
 *   SMTP_FROM_NAME, SMTP_FROM_EMAIL
 *
 * The EmailTestCard below this one lets the admin send a probe email to
 * verify the configured SMTP credentials actually work end-to-end.
 */
function SmtpCredentialsCard() {
  const { data, isLoading, error, mutate } = useSWR<EnvStatusResponse>(
    '/api/env-status',
    envStatusFetcher,
    { ...swrStable, revalidateOnFocus: false }
  )

  const creds = data?.credentials

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> SMTP Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              Outgoing email server credentials. Read from environment variables — not editable in the UI.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => mutate()}
            disabled={isLoading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="rounded-lg p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Could not load SMTP status</div>
              <div className="mt-0.5 text-muted-foreground">{error.message}</div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <EnvCredentialField
              status={creds?.SMTP_HOST}
              label="SMTP Host"
              hint="Gmail: smtp.gmail.com"
            />
            <EnvCredentialField
              status={creds?.SMTP_PORT}
              label="SMTP Port"
              hint="587 (TLS) or 465 (SSL)"
            />
            <EnvCredentialField
              status={creds?.SMTP_USER}
              label="SMTP Username"
              icon={Mail}
              hint="The authenticated Gmail/email account."
            />
            <EnvCredentialField
              status={creds?.SMTP_PASS}
              label="SMTP Password"
              hint="Use a Gmail App Password, not your account password."
            />
            <EnvCredentialField
              status={creds?.SMTP_FROM_NAME}
              label="From Name"
              hint="Sender display name (e.g. your institution name)."
            />
            <EnvCredentialField
              status={creds?.SMTP_FROM_EMAIL}
              label="From Email"
              icon={Mail}
              hint="Sender email address — defaults to SMTP_USER if unset."
            />
          </div>
        )}

        <div className="rounded-lg p-3 text-xs bg-muted/40 border flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
          <div>
            <span className="text-muted-foreground">Credentials are loaded from environment variables at server startup.</span>{' '}
            <span className="text-muted-foreground">
              Edit your <code className="font-mono">.env</code> file (locally) or the project&apos;s Environment Variables (on Vercel) and redeploy to apply changes.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * System credentials card — rendered under the SECURITY tab.
 *
 * Shows the three system-level secrets that come exclusively from env vars:
 *   - DATABASE_URL  (masked URL preview)
 *   - SESSION_SECRET (fully masked — never revealed)
 *   - DEEPSEEK_API_KEY (status only — fully masked)
 *
 * Super-admin only because /api/env-status is SUPER_ADMIN-gated. The card
 * gracefully handles non-super-admin viewers (SWR returns 403 → error block).
 */
function SystemCredentialsCard() {
  const { data, isLoading, error, mutate } = useSWR<EnvStatusResponse>(
    '/api/env-status',
    envStatusFetcher,
    { ...swrStable, revalidateOnFocus: false }
  )

  const creds = data?.credentials

  return (
    <Card className="mt-4 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> System Credentials
            </CardTitle>
            <CardDescription className="text-xs">
              Server-level secrets backing the database, session signing, and AI provider. Read from environment variables — not editable in the UI.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => mutate()}
            disabled={isLoading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="rounded-lg p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Could not load system credentials</div>
              <div className="mt-0.5 text-muted-foreground">
                {error.message || 'Only super admins can view these credentials.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <EnvCredentialField
              status={creds?.DATABASE_URL}
              label="Database URL"
              icon={Database}
              hint="PostgreSQL connection string used by Prisma."
            />
            <EnvCredentialField
              status={creds?.SESSION_SECRET}
              label="Session Secret"
              icon={Lock}
              hint="HMAC key used to sign login session tokens."
            />
            <EnvCredentialField
              status={creds?.DEEPSEEK_API_KEY}
              label="DeepSeek API Key"
              icon={Server}
              hint="Optional — enables the DeepSeek-powered AI Admin Assistant."
            />
          </div>
        )}

        <div className="rounded-lg p-3 text-xs bg-muted/40 border flex items-start gap-2">
          <Server className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
          <div className="text-muted-foreground">
            These secrets back core server functionality. Rotating any of them requires editing your <code className="font-mono">.env</code> file (locally) or the project&apos;s Environment Variables (on Vercel) and redeploying. Never commit secrets to git.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Email test card component
interface EmailTestResult {
  success: boolean
  message: string
  provider?: string
  /** Exact error the provider returned (only on failure). */
  reason?: string
  /** Actionable troubleshooting hint (only on failure). */
  hint?: string
  /** EmailLog row id so the admin can cross-reference the Email Logs page. */
  logId?: string
}

function EmailTestCard() {
  const [testEmail, setTestEmail] = React.useState('')
  const [sending, setSending] = React.useState<null | 'smtp' | 'resend' | 'mailgun' | 'sendgrid' | 'plunk' | 'active'>(null)
  const [result, setResult] = React.useState<EmailTestResult | null>(null)

  async function sendTest(provider?: 'smtp' | 'resend' | 'mailgun' | 'sendgrid' | 'plunk') {
    if (!testEmail.trim()) {
      toast.error('Enter a test email address')
      return
    }
    const tag = provider || 'active'
    setSending(tag)
    setResult(null)
    try {
      const res = await fetch('/api/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: testEmail.trim(), provider }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, message: data.message, provider: data.provider })
        toast.success(`Test email sent via ${data.provider?.toUpperCase()}!`)
      } else {
        // The route returns a structured payload:
        //   { message, provider, reason, hint, logId, code }
        // `data.error` may be a string (config errors) or the structured
        // object (provider-failure case). We handle both.
        const message = typeof data.error === 'string' ? data.error : (data.message || 'Email test failed')
        setResult({
          success: false,
          message,
          provider: data.provider || provider || 'active',
          reason: data.reason,
          hint: data.hint,
          logId: data.logId,
        })
        toast.error(message)
      }
    } catch (e) {
      setResult({ success: false, message: 'Network error', provider: provider || 'active' })
      toast.error('Network error')
    } finally {
      setSending(null)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" /> Test Email Configuration
        </CardTitle>
        <CardDescription className="text-xs">
          Send a test email to verify your email provider is working. Use the per-provider buttons to test each independently, or "Send Test" to use the active provider.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            placeholder="test@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 h-9"
          />
          <Button size="sm" onClick={() => sendTest()} disabled={sending !== null || !testEmail.trim()}>
            {sending === 'active' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="ml-1.5">Send Test (Active)</span>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendTest('smtp')}
            disabled={sending !== null || !testEmail.trim()}
          >
            {sending === 'smtp' ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Mail className="h-4 w-4 mr-1.5" />}
            Test SMTP
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendTest('resend')}
            disabled={sending !== null || !testEmail.trim()}
          >
            {sending === 'resend' ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Zap className="h-4 w-4 mr-1.5" />}
            Test Resend
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendTest('mailgun')}
            disabled={sending !== null || !testEmail.trim()}
          >
            {sending === 'mailgun' ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
            Test Mailgun
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendTest('sendgrid')}
            disabled={sending !== null || !testEmail.trim()}
          >
            {sending === 'sendgrid' ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
            Test SendGrid
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendTest('plunk')}
            disabled={sending !== null || !testEmail.trim()}
          >
            {sending === 'plunk' ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
            Test Plunk
          </Button>
        </div>
        {result && (
          <div className={`rounded-lg p-3 text-xs space-y-2 ${result.success ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
            <div className="font-medium leading-relaxed">
              {result.success ? '✓ ' : '✗ '}{result.message}
            </div>
            {!result.success && result.reason && (
              <div className="border-t border-destructive/20 pt-2 mt-1">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                </div>
                <div className="ml-5">
                  <span className="font-semibold uppercase tracking-wide text-[10px] block mb-0.5">Provider reason</span>
                  <code className="block font-mono text-[11px] bg-destructive/5 dark:bg-destructive/10 rounded px-2 py-1.5 break-all leading-relaxed">
                    {result.reason}
                  </code>
                </div>
              </div>
            )}
            {!result.success && result.hint && (
              <div className="flex items-start gap-1.5 text-destructive/90">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="leading-relaxed">{result.hint}</span>
              </div>
            )}
            {!result.success && result.logId && (
              <div className="text-[10px] text-destructive/70 border-t border-destructive/20 pt-1.5">
                EmailLog ID: <code className="font-mono">{result.logId}</code> — check the Email Logs page for full details.
              </div>
            )}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">
          SMTP credentials are read from environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).
          Resend requires RESEND_API_KEY + a verified sender domain. Check the Email Logs page for delivery status.
        </p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// EmailTypeTogglesCard — lets the admin enable/disable each email type
// ---------------------------------------------------------------------------

interface EmailTypeToggle {
  key: string
  label: string
  description: string
  defaultEnabled: boolean
}

const EMAIL_TYPE_TOGGLES: EmailTypeToggle[] = [
  { key: 'email_type_otp', label: 'OTP / Verification Codes', description: 'Email verification codes for email binding, 2FA, and device verification.', defaultEnabled: true },
  { key: 'email_type_bursary', label: 'Bursary Code Emails', description: 'Bursary code issued/revoked notifications.', defaultEnabled: true },
  { key: 'email_type_password', label: 'Password Reset / Setup Codes', description: 'Password reset CODES and password setup links. CRITICAL — keep enabled.', defaultEnabled: true },
  { key: 'email_type_password_change', label: 'Password Change Notifications', description: 'Notification emails when an admin resets a password or a user changes their password. Default OFF to avoid spam.', defaultEnabled: false },
  { key: 'email_type_welcome', label: 'Welcome / Account Created', description: 'Welcome emails when a new student or staff account is created by an admin.', defaultEnabled: false },
  { key: 'email_type_payment', label: 'Payment Receipts', description: 'Payment confirmation emails with receipt details. Sent after successful payment.', defaultEnabled: false },
  { key: 'email_type_allocation', label: 'Bed Allocation Notices', description: 'Emails when a student is allocated a bed or their allocation is vacated.', defaultEnabled: false },
  { key: 'email_type_checkin', label: 'Check-in Confirmation', description: 'Confirmation email when a student checks in at the hostel.', defaultEnabled: false },
  { key: 'email_type_bed_lock', label: 'Bed Lock Reminders', description: 'Reminder to complete payment within the bed-lock reservation window.', defaultEnabled: false },
  { key: 'email_type_application', label: 'Application Status', description: 'Emails when a hostel application is submitted, approved, or rejected.', defaultEnabled: false },
  { key: 'email_type_profile_verified', label: 'Profile Verified', description: 'Email when a student profile verification is approved by a moderator.', defaultEnabled: false },
  { key: 'email_type_account_status', label: 'Account Status Changes', description: 'Emails when an account is activated, deactivated, or email is changed.', defaultEnabled: false },
  { key: 'email_type_announcement', label: 'Announcements', description: 'Broadcast emails for system announcements. Can be high-volume — use sparingly.', defaultEnabled: false },
  { key: 'email_type_support_chat', label: 'Support Chat / Tickets', description: 'Emails for support chat escalations, resolutions, and ticket updates.', defaultEnabled: false },
  { key: 'email_type_reallocation', label: 'Reallocation Notices', description: 'Emails for bed reallocation requests — submitted, approved, denied, completed.', defaultEnabled: false },
  { key: 'email_type_system_health', label: 'System Health Alerts', description: 'Critical system health alerts (DB down, high error rate). Keep enabled.', defaultEnabled: true },
]

function EmailTypeTogglesCard() {
  const { mutate } = useSWRConfig()
  const [toggles, setToggles] = React.useState<Record<string, boolean>>({})
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState<string | null>(null)

  // Load current toggle values from /api/settings
  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings?category=EMAIL')
        const data = await res.json()
        // The API returns grouped settings: { settings: { EMAIL: { key: value, ... } } }
        const emailSettings = data.settings?.EMAIL || {}
        const values: Record<string, boolean> = {}
        for (const t of EMAIL_TYPE_TOGGLES) {
          const setting = emailSettings[t.key]
          values[t.key] = setting ? setting === 'true' : t.defaultEnabled
        }
        setToggles(values)
      } catch {
        // Use defaults on error
        const values: Record<string, boolean> = {}
        for (const t of EMAIL_TYPE_TOGGLES) {
          values[t.key] = t.defaultEnabled
        }
        setToggles(values)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleToggle(key: string, enabled: boolean) {
    setSaving(key)
    // Optimistically update the UI
    setToggles((prev) => ({ ...prev, [key]: enabled }))

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: String(enabled), category: 'EMAIL' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error || 'Failed to update setting')
        // Revert on failure
        setToggles((prev) => ({ ...prev, [key]: !enabled }))
        return
      }
      toast.success(`${enabled ? 'Enabled' : 'Disabled'} ${EMAIL_TYPE_TOGGLES.find((t) => t.key === key)?.label || key}`)
      // Invalidate the server-side email-type cache
      mutate('/api/settings?category=EMAIL').catch(() => {})
    } catch {
      toast.error('Network error')
      setToggles((prev) => ({ ...prev, [key]: !enabled }))
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" /> Email Type Toggles
        </CardTitle>
        <CardDescription className="text-xs">
          Enable or disable each type of email the system sends. Disabled types are silently skipped (no error, no log entry).
          Critical types (OTP, Bursary, Password, System Health) are enabled by default.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading email settings…
          </div>
        ) : (
          EMAIL_TYPE_TOGGLES.map((t) => {
            const isEnabled = toggles[t.key] ?? t.defaultEnabled
            const isSaving = saving === t.key
            return (
              <div
                key={t.key}
                className={`flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors ${isEnabled ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-muted'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t.label}</span>
                    {t.defaultEnabled && (
                      <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100">
                        Default ON
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{t.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(t.key, !isEnabled)}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${isEnabled ? 'bg-emerald-600' : 'bg-muted-foreground/30'} disabled:opacity-50`}
                  role="switch"
                  aria-checked={isEnabled}
                  aria-label={t.label}
                >
                  {isSaving && <Loader2 className="absolute h-3 w-3 animate-spin text-white left-1/2 -translate-x-1/2" />}
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

/**
 * SMS Test Card — rendered under the SMS tab.
 *
 * Lets the admin verify the Termii integration by sending a test SMS to
 * either the phone number they enter or their own profile phone (when the
 * input is blank). The endpoint surfaces the resolved (normalized) phone
 * number and Termii's message id on success, or the underlying error on
 * failure.
 */
function SmsTestCard() {
  const [phone, setPhone] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [result, setResult] = React.useState<{ success: boolean; message: string; to?: string } | null>(null)

  async function sendTest() {
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/sms-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(phone.trim() ? { phone: phone.trim() } : {}),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, message: data.message, to: data.to })
        toast.success('Test SMS sent!')
      } else {
        setResult({ success: false, message: data.error })
        toast.error(data.error)
      }
    } catch (e) {
      setResult({ success: false, message: 'Network error' })
      toast.error('Network error')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="mt-4 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" /> Test SMS Configuration
        </CardTitle>
        <CardDescription className="text-xs">
          Send a test SMS to verify your Termii integration. Leave the phone blank to send to your own profile phone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="tel"
            placeholder="+234 801 234 5678 (or leave blank for your phone)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1 h-9"
          />
          <Button size="sm" onClick={sendTest} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="ml-1.5">Send Test SMS</span>
          </Button>
        </div>
        {result && (
          <div
            className={cn(
              'rounded-lg p-3 text-xs',
              result.success
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                : 'bg-destructive/10 text-destructive border border-destructive/20'
            )}
          >
            {result.success ? '✓ ' : '✗ '}{result.message}
            {result.to && (
              <div className="mt-1 text-[10px] opacity-80">Resolved recipient: {result.to}</div>
            )}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">
          Requires the <code className="font-mono">TERMII_API_KEY</code> environment variable.
          Enable <strong>SMS Notifications</strong> above to also send SMS for PAYMENT / ERROR / WARNING
          notifications automatically. Nigerian local numbers (e.g. 0801...) are auto-converted to +234.
        </p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// AI status card — shows the live provider/agent status (read from the server
// because DEEPSEEK_API_KEY is an env var that is not exposed to the client).
// Rendered under the AI Assistant tab alongside the settings form.
// ---------------------------------------------------------------------------
interface AiStatusResponse {
  provider: 'builtin' | 'deepseek'
  effectiveProvider: 'builtin' | 'deepseek'
  deepseekConfigured: boolean
  agentEnabled: boolean
}

// ---------------------------------------------------------------------------
// DeepSeek Connection Test Card — lets the admin verify the DeepSeek API key
// is valid and the model is responding. Shows latency + the model's response.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Kill Switch Card — emergency site shutdown
// ---------------------------------------------------------------------------

function KillSwitchCard() {
  const { mutate } = useSWRConfig()
  const { data: statusData } = useSWR<{ killSwitchEnabled: boolean }>('/api/maintenance/status', (u: string) =>
    fetch(u, { credentials: 'include' }).then((r) => r.json()),
    { ...swrStable, refreshInterval: 30_000 }
  )
  const [activating, setActivating] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const killActive = statusData?.killSwitchEnabled === true

  async function handleToggle() {
    setActivating(true)
    const newValue = !killActive
    const t = toast.loading(newValue ? 'Activating kill switch…' : 'Deactivating kill switch…')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key: 'kill_switch', value: String(newValue), category: 'MAINTENANCE' }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed')
      }
      toast.success(newValue ? 'Kill switch activated — all sessions terminated' : 'Kill switch deactivated — site is back online', { id: t })
      mutate('/api/maintenance/status')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed', { id: t })
    } finally {
      setActivating(false)
      setConfirmOpen(false)
    }
  }

  return (
    <Card className={cn('mt-4 border-l-4', killActive ? 'border-l-rose-500 border-rose-500/30 bg-rose-500/5' : 'border-l-amber-500')}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {killActive ? <ShieldOff className="h-4 w-4 text-rose-500" /> : <Power className="h-4 w-4 text-amber-500" />}
          Kill Switch — Emergency Shutdown
        </CardTitle>
        <CardDescription className="text-xs">
          {killActive
            ? 'The site is currently OFFLINE. All user sessions have been terminated. Only admins with a valid session can access the dashboard. Click below to bring the site back online.'
            : 'Instantly take the entire site offline and terminate all user sessions. Use only in case of security breach or emergency. Admins can still log in.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status indicator */}
        <div className={cn(
          'rounded-lg border p-3 flex items-center gap-3',
          killActive ? 'border-rose-500/30 bg-rose-500/10' : 'border-emerald-500/30 bg-emerald-500/10'
        )}>
          <div className={cn(
            'h-3 w-3 rounded-full',
            killActive ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
          )} />
          <span className={cn('text-sm font-semibold', killActive ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300')}>
            {killActive ? 'SITE IS OFFLINE' : 'Site is live'}
          </span>
        </div>

        {/* Activate/Deactivate button */}
        {!killActive ? (
          <Button
            variant="destructive"
            className="w-full"
            disabled={activating}
            onClick={() => setConfirmOpen(true)}
          >
            {activating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldOff className="h-4 w-4 mr-2" />}
            Activate Kill Switch
          </Button>
        ) : (
          <Button
            variant="default"
            className="w-full"
            disabled={activating}
            onClick={handleToggle}
          >
            {activating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Power className="h-4 w-4 mr-2" />}
            Deactivate — Bring Site Back Online
          </Button>
        )}

        {/* Confirmation dialog */}
        {confirmOpen && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  Are you absolutely sure?
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This will immediately take the site offline. All logged-in users (except admins) will be
                  logged out and see the maintenance page. Students won't be able to log in, make payments,
                  or access any features.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmOpen(false)} disabled={activating}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={handleToggle} disabled={activating}>
                {activating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Yes, Take Site Offline
              </Button>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          <strong>Note:</strong> Admins (SUPER_ADMIN, ADMIN) can always log in and access the dashboard even
          when the kill switch is active. This ensures you can always reverse the action.
        </p>
      </CardContent>
    </Card>
  )
}

function DeepSeekTestCard() {
  const { data: settingsData } = useSWR<{ settings?: { AI?: Record<string, string> } }>(
    '/api/settings?category=AI',
    (u: string) => fetch(u, { credentials: 'include' }).then((r) => r.json()),
    { ...swrStable, revalidateOnFocus: false }
  )
  const [testing, setTesting] = React.useState(false)
  const [result, setResult] = React.useState<{
    ok: boolean
    message: string
    latencyMs?: number
    model?: string
  } | null>(null)

  const model = settingsData?.settings?.AI?.ai_deepseek_model || 'deepseek-chat'
  const hasApiKey = !!process.env.NEXT_PUBLIC_DEEPSEEK_CONFIGURED // We can't check server env from client, but we show the result

  async function handleTest() {
    setTesting(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/test-deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ model }),
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Test failed',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="mt-4 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> DeepSeek Connection Test
        </CardTitle>
        <CardDescription className="text-xs">
          Verify the DeepSeek API key is valid and the model is responding. Uses model: <code className="font-mono text-[10px] bg-muted/50 px-1 py-0.5 rounded">{model}</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={handleTest} disabled={testing} size="sm">
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Testing…
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-1.5" /> Test Connection
            </>
          )}
        </Button>

        {result && (
          <div
            className={cn(
              'rounded-lg border p-3 text-sm space-y-1',
              result.ok
                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
                : 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300'
            )}
          >
            <div className="flex items-center gap-2">
              {result.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span className="font-semibold">
                {result.ok ? 'Connection successful' : 'Connection failed'}
              </span>
              {typeof result.latencyMs === 'number' && result.latencyMs > 0 && (
                <Badge variant="outline" className="text-[9px] ml-auto">
                  {result.latencyMs}ms
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{result.message}</p>
          </div>
        )}

        <div className="text-[10px] text-muted-foreground space-y-1">
          <p>
            <strong>Setup:</strong> Set <code className="font-mono">DEEPSEEK_API_KEY</code> in your Vercel project settings
            (Settings → Environment Variables). Get an API key at{' '}
            <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              platform.deepseek.com
            </a>.
          </p>
          <p>
            <strong>Models:</strong> <code className="font-mono">deepseek-chat</code> is fast + cheap (recommended).
            <code className="font-mono ml-2">deepseek-reasoner</code> is smarter but slower + more expensive.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function AiStatusCard() {
  const { data, isLoading, mutate } = useSWR<AiStatusResponse>('/api/ai-agent/status', (u: string) =>
    fetch(u, { credentials: 'include' }).then((r) => r.json()),
    swrStable
  )

  const status = data
  const usingDeepseek = status?.effectiveProvider === 'deepseek'
  // Warn when the admin picked DeepSeek but no key is set (server is silently
  // falling back to the built-in LLM).
  const deepseekMisconfigured = status?.provider === 'deepseek' && !status?.deepseekConfigured

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" /> AI Provider Status
        </CardTitle>
        <CardDescription className="text-xs">
          Live status of the AI Admin Assistant. The provider is selected above; this card reflects what the server is actually using.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking AI provider status…
          </div>
        ) : status ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatusTile
                label="Active Provider"
                value={usingDeepseek ? 'DeepSeek API' : 'Built-in LLM'}
                tone={usingDeepseek ? 'deepseek' : 'primary'}
              />
              <StatusTile
                label="Agent Status"
                value={status.agentEnabled ? 'Enabled' : 'Disabled'}
                tone={status.agentEnabled ? 'success' : 'muted'}
              />
              <StatusTile
                label="DeepSeek API Key"
                value={status.deepseekConfigured ? 'Configured' : 'Not configured'}
                tone={status.deepseekConfigured ? 'success' : 'muted'}
              />
            </div>

            {deepseekMisconfigured && (
              <div className="rounded-lg p-3 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-start gap-2">
                <CircleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">DeepSeek API key not configured</div>
                  <div className="mt-0.5">
                    You selected <span className="font-mono">deepseek</span> as the AI provider, but the
                    <span className="font-mono"> DEEPSEEK_API_KEY </span>
                    environment variable is missing on the server. The AI agent is currently falling back to the Built-in LLM.
                    Add the key to your <span className="font-mono">.env</span> file and redeploy to use DeepSeek.
                  </div>
                </div>
              </div>
            )}

            {!status.agentEnabled && (
              <div className="rounded-lg p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 flex items-start gap-2">
                <CircleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">AI Agent is disabled</div>
                  <div className="mt-0.5">
                    The AI Admin Assistant is currently disabled. Enable it above to allow admins to use natural-language commands.
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-muted-foreground max-w-xl">
                The built-in LLM requires no API key and is always available. DeepSeek adds OpenAI-compatible
                function-calling support so the assistant can invoke admin functions directly.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => mutate()}
                disabled={isLoading}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
              </Button>
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground">Could not load AI status.</div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'primary' | 'success' | 'muted' | 'deepseek'
}) {
  const toneClasses: Record<typeof tone, string> = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    muted: 'bg-muted text-muted-foreground border-border',
    deepseek: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
  }
  return (
    <div className={`rounded-lg border p-3 ${toneClasses[tone]}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  )
}

// ===========================================================================
// BACKUP & RECOVERY
// ===========================================================================

interface StoredBackup {
  id: string
  key: string
  timestamp: string
  sizeBytes: number
  totalRecords: number
  tableCount: number
  tables: Record<string, number>
}

interface BackupListResponse {
  backups: StoredBackup[]
  total: number
  maxStoredBytes: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Backup & Recovery card — the main card under the BACKUP tab.
 *
 * Three sections:
 *   1. "Create Backup Now" — fires POST /api/backup/run. If the resulting
 *      payload is > 1 MB, the response is a JSON file download (we let the
 *      browser handle it via Content-Disposition). Otherwise the backup is
 *      stored in the DB and the list refreshes.
 *   2. Existing backups table — date, size, table count, download/delete
 *      actions per row.
 *   3. Restore dialog — either pick a stored backup from the table or
 *      upload a JSON file, then type "RESTORE" to confirm. The endpoint
 *      wipes every backed-up table and recreates rows from the bundle.
 */
function BackupRecoveryCard() {
  const { mutate } = useSWRConfig()
  const { data, isLoading, mutate: refreshList } = useSWR<BackupListResponse>(
    '/api/backup/list',
    (u: string) => fetch(u, { credentials: 'include' }).then((r) => r.json()),
    { ...swrStable, revalidateOnFocus: false }
  )

  const [creating, setCreating] = React.useState(false)
  const [restoreOpen, setRestoreOpen] = React.useState(false)
  const [restoreSource, setRestoreSource] = React.useState<'stored' | 'upload' | 'server-file'>('stored')
  const [selectedBackupId, setSelectedBackupId] = React.useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = React.useState<string>('')
  // Filename returned by /api/backup/upload (the server-saved copy of the
  // uploaded JSON). We pass this to /api/backup/restore-from-file instead
  // of sending the full JSON in the POST body — that's what fixes the 413
  // on backups > 4MB.
  const [uploadedServerFilename, setUploadedServerFilename] = React.useState<string>('')
  const [uploadingFile, setUploadingFile] = React.useState(false)
  const [serverFileName, setServerFileName] = React.useState<string>('')
  const [confirmText, setConfirmText] = React.useState('')
  const [restorePassword, setRestorePassword] = React.useState('')
  // When true, the restore skips the block/room/bed tables entirely —
  // preserves the current hostel layout (useful after restructuring).
  const [skipHostelStructure, setSkipHostelStructure] = React.useState(false)
  const [restoring, setRestoring] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<StoredBackup | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [hostelBackupLoading, setHostelBackupLoading] = React.useState(false)

  const backups = data?.backups ?? []
  const canRestore =
    confirmText.trim() === 'RESTORE' &&
    restorePassword.length >= 4 &&
    !restoring &&
    (restoreSource === 'stored'
      ? !!selectedBackupId
      : restoreSource === 'upload'
        ? !!uploadedServerFilename
        : !!serverFileName.trim())

  async function handleCreate() {
    setCreating(true)
    const t = toast.loading('Creating full database backup…')
    try {
      const res = await fetch('/api/backup/run', {
        method: 'POST',
        credentials: 'include',
      })
      // Two possible success responses:
      //   - JSON: `{ stored: true, meta: {...} }`  → small backup, stored in DB
      //   - JSON file: full bundle as a download (Content-Disposition: attachment)
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json') && res.headers.get('content-disposition')?.includes('attachment')) {
        // Large backup — was returned as a file. Trigger a download via blob.
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const disp = res.headers.get('content-disposition') || ''
        const match = disp.match(/filename="?([^"]+)"?/)
        a.download = match?.[1] || `hostel-backup-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
        const records = res.headers.get('x-backup-records')
        const size = res.headers.get('x-backup-size-bytes')
        toast.success(
          `Backup too large to store in DB (${size ? formatBytes(parseInt(size, 10)) : '?'}). Downloaded as file${records ? ` · ${records} records` : ''}.`,
          { id: t, duration: 6000 }
        )
      } else if (res.ok) {
        const body = await res.json()
        toast.success(
          `Backup stored · ${body?.meta?.totalRecords ?? 0} records · ${body?.meta?.sizeBytes ? formatBytes(body.meta.sizeBytes) : '?'}`,
          { id: t }
        )
      } else {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Backup failed (${res.status})`)
      }
      refreshList()
      mutate('/api/audit-logs')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Backup failed', { id: t })
    } finally {
      setCreating(false)
    }
  }

  function handleDownload(b: StoredBackup) {
    // Trigger the download via a temporary link — the response stream goes
    // straight to disk, no JS parsing required (so even multi-MB backups
    // don't block the UI).
    const a = document.createElement('a')
    a.href = `/api/backup/${b.id}/download`
    a.download = ''
    a.click()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const t = toast.loading('Deleting backup…')
    try {
      const res = await fetch(`/api/backup/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Failed (${res.status})`)
      }
      toast.success('Backup deleted', { id: t })
      setDeleteTarget(null)
      refreshList()
      mutate('/api/audit-logs')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete backup', { id: t })
    } finally {
      setDeleting(false)
    }
  }

  async function handleRestore() {
    if (!canRestore) return
    setRestoring(true)
    const t = toast.loading(
      skipHostelStructure
        ? 'Restoring database — preserving current hostel structure (your admin account is protected)…'
        : 'Restoring database — this will wipe all current data (your admin account is protected)…'
    )
    try {
      let res: Response
      if (restoreSource === 'server-file' || restoreSource === 'upload') {
        // Both "Server File" and "Upload File" now restore from a file on
        // the server's filesystem. The Upload path first uploads the file
        // via /api/backup/upload (multipart — no body-size limit), gets
        // back a filename, then we call /api/backup/restore-from-file
        // with that filename. This bypasses the 413 error entirely for
        // backups > 4MB.
        const filename =
          restoreSource === 'server-file' ? serverFileName.trim() : uploadedServerFilename
        res = await fetch('/api/backup/restore-from-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            filename,
            confirm: 'RESTORE',
            password: restorePassword,
            skipHostelStructure,
          }),
        })
      } else {
        // Stored backup — send the backupId, the server loads the bundle
        // from a SystemSetting row (no body-size concern).
        const body: Record<string, unknown> = {
          confirm: 'RESTORE',
          password: restorePassword,
          skipHostelStructure,
        }
        if (restoreSource === 'stored') {
          body.backupId = selectedBackupId
        }
        res = await fetch('/api/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        })
      }
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(result?.error || `Restore failed (${res.status})`)
      }
      const summary = result?.summary
      const restoredCount = summary
        ? Object.values(summary.restored as Record<string, number>).reduce((a, b) => a + (b as number), 0)
        : 0
      const errorCount = summary?.errors?.length ?? 0
      toast.success(
        `Restore complete · ${restoredCount} rows re-inserted${errorCount ? ` · ${errorCount} table error(s) — see audit log` : ''}`,
        { id: t, duration: 8000 }
      )
      setRestoreOpen(false)
      setConfirmText('')
      setRestorePassword('')
      setSkipHostelStructure(false)
      setUploadedFileName('')
      setUploadedServerFilename('')
      setSelectedBackupId(null)
      mutate('/api/audit-logs')
      mutate('/api/dashboard')
      mutate('/api/system-status')
      // Refresh the backup activity log so the just-completed restore shows up.
      mutate('/api/backup/activity?limit=20')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Restore failed', { id: t })
    } finally {
      setRestoring(false)
    }
  }

  async function handleFileUpload(file: File) {
    setUploadedFileName(file.name)
    setUploadingFile(true)
    const t = toast.loading(`Uploading "${file.name}" (${formatBytes(file.size)})…`)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/backup/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData, // multipart — no Content-Type header, browser sets it
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`)
      setUploadedServerFilename(data.filename)
      toast.success(`Uploaded to server as "${data.filename}" (${formatBytes(data.sizeBytes)}). Ready to restore.`, { id: t })
    } catch (e) {
      setUploadedServerFilename('')
      toast.error(e instanceof Error ? e.message : 'Upload failed', { id: t })
    } finally {
      setUploadingFile(false)
    }
  }

  return (
    <>
      <Card className="mt-4 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" /> Create & Manage Backups
          </CardTitle>
          <CardDescription className="text-xs">
            Backups capture every table (Users, Students, Blocks, Rooms, Beds, Allocations, Payments, Audit Logs, System Settings — minus other backups — and more) as a single JSON bundle. Backups under 1 MB are stored in the database; larger backups are returned as downloadable files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <HardDriveDownload className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-semibold">Create Backup Now</div>
                <div className="text-[11px] text-muted-foreground">
                  Dumps all 25+ tables into a single JSON file. Logged to the audit trail.
                </div>
              </div>
            </div>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Backing up…
                </>
              ) : (
                <>
                  <HardDriveDownload className="h-4 w-4 mr-1.5" /> Create Backup
                </>
              )}
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Existing Backups ({backups.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshList()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : backups.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                <FileJson className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No stored backups yet. Click <strong>Create Backup</strong> to make your first one.
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Date</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Tables</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          <div className="text-xs font-medium">{fmtDateTime(b.timestamp)}</div>
                          <div className="text-[10px] text-muted-foreground">{fmtRelative(b.timestamp)}</div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{formatBytes(b.sizeBytes)}</TableCell>
                        <TableCell className="text-xs">{b.totalRecords.toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{b.tableCount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(b)}
                              title="Download JSON"
                              className="h-7 px-2"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedBackupId(b.id)
                                setRestoreSource('stored')
                                setUploadedFileName('')
                                setUploadedServerFilename('')
                                setConfirmText('')
                                setRestorePassword('')
                                setSkipHostelStructure(false)
                                setRestoreOpen(true)
                              }}
                              title="Restore this backup"
                              className="h-7 px-2 text-amber-600 hover:text-amber-700"
                            >
                              <Upload className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(b)}
                              title="Delete"
                              className="h-7 px-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex items-center justify-between pt-3">
              <p className="text-[10px] text-muted-foreground max-w-2xl">
                Tip: download backups regularly and keep copies off-site (e.g. in Google Drive). Stored backups live in the database as <code className="font-mono">backup_*</code> SystemSetting rows — they are included in subsequent backups unless excluded.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRestoreSource('upload')
                    setSelectedBackupId(null)
                    setUploadedFileName('')
                    setUploadedServerFilename('')
                    setServerFileName('')
                    setConfirmText('')
                    setRestorePassword('')
                    setSkipHostelStructure(false)
                    setRestoreOpen(true)
                  }}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Restore from File
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={hostelBackupLoading}
                  onClick={async () => {
                    setHostelBackupLoading(true)
                    const t = toast.loading('Creating hostel structure backup…')
                    try {
                      const res = await fetch('/api/backup/hostel-structure', { method: 'POST', credentials: 'include' })
                      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Failed (${res.status})`)
                      const blob = await res.blob()
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      const disp = res.headers.get('content-disposition') || ''
                      const match = disp.match(/filename="?([^"]+)"?/)
                      a.download = match?.[1] || `hostel-structure-${Date.now()}.json`
                      a.click()
                      URL.revokeObjectURL(url)
                      const records = res.headers.get('x-backup-records')
                      toast.success(`Hostel structure backup downloaded${records ? ` · ${records} records` : ''}`, { id: t })
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Backup failed', { id: t })
                    } finally {
                      setHostelBackupLoading(false)
                    }
                  }}
                >
                  {hostelBackupLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Building2 className="h-3.5 w-3.5 mr-1.5" />}
                  Backup Hostel Structure
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore confirmation dialog */}
      <AlertDialog open={restoreOpen} onOpenChange={(open) => {
        if (!restoring) {
          setRestoreOpen(open)
          if (!open) {
            setConfirmText('')
            setRestorePassword('')
            setSkipHostelStructure(false)
            setUploadedFileName('')
            setUploadedServerFilename('')
            setServerFileName('')
            setSelectedBackupId(null)
          }
        }
      }}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Restore Database from Backup?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>delete ALL existing data</strong> in every table and replace it with the contents of the backup. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            {/* Source selector tabs */}
            <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setRestoreSource('stored')}
                className={cn('flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition', restoreSource === 'stored' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}
              >Stored Backup</button>
              <button
                type="button"
                onClick={() => setRestoreSource('upload')}
                className={cn('flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition', restoreSource === 'upload' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}
              >Upload File</button>
              <button
                type="button"
                onClick={() => setRestoreSource('server-file')}
                className={cn('flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition', restoreSource === 'server-file' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}
              >Server File (Large)</button>
            </div>

            <div className="rounded-lg p-3 text-xs bg-muted/40 border">
              <div className="font-semibold mb-1">Restore source:</div>
              {restoreSource === 'stored' ? (
                selectedBackupId ? (
                  <div>
                    Stored backup <code className="font-mono">{selectedBackupId}</code>
                    <div className="text-muted-foreground mt-1">
                      {backups.find((b) => b.id === selectedBackupId)
                        ? `${fmtDateTime(backups.find((b) => b.id === selectedBackupId)!.timestamp)} · ${formatBytes(backups.find((b) => b.id === selectedBackupId)!.sizeBytes)} · ${backups.find((b) => b.id === selectedBackupId)!.totalRecords} records`
                        : ''}
                    </div>
                  </div>
                ) : (
                  <div className="text-destructive">No backup selected. Close this dialog and click the restore icon on a stored backup below.</div>
                )
              ) : restoreSource === 'upload' ? (
                <div className="space-y-2">
                  {uploadedServerFilename ? (
                    <div className="space-y-1">
                      <div>
                        Uploaded file: <code className="font-mono">{uploadedFileName}</code>
                      </div>
                      <div className="text-muted-foreground">
                        Saved on server as: <code className="font-mono">{uploadedServerFilename}</code>
                      </div>
                      {uploadingFile && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Uploading to server…
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFileName('')
                          setUploadedServerFilename('')
                        }}
                        disabled={uploadingFile || restoring}
                        className="text-[10px] text-primary underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        Choose a different file
                      </button>
                    </div>
                  ) : (
                    <label className={cn(
                      'cursor-pointer inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs font-medium hover:bg-muted',
                      uploadingFile && 'pointer-events-none opacity-60'
                    )}>
                      {uploadingFile ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {uploadingFile ? 'Uploading…' : 'Choose JSON file…'}
                      <input
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        disabled={uploadingFile}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void handleFileUpload(f)
                          // Reset so picking the same file again still fires onChange.
                          e.target.value = ''
                        }}
                      />
                    </label>
                  )}
                </div>
              ) : (
                // Server file — for large backups that exceed the HTTP body
                // limit (413 error). The admin types the filename of a
                // backup stored on the server (e.g. in the upload/ folder).
                <div className="space-y-1.5">
                  <Input
                    value={serverFileName}
                    onChange={(e) => setServerFileName(e.target.value)}
                    placeholder="hostel-backup-2026-08-16T01-21-17-939Z.json"
                    disabled={restoring}
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Enter the filename of a backup stored on the server (in the
                    <code className="font-mono">upload/</code> folder). This
                    bypasses the upload size limit for large backups that fail
                    with a 413 error.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="restore-confirm" className="text-xs font-medium">
                Type <code className="font-mono">RESTORE</code> to confirm
              </Label>
              <Input
                id="restore-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESTORE"
                autoComplete="off"
                autoCapitalize="characters"
                disabled={restoring}
                className="font-mono"
              />
            </div>

            {/* Authorization confirmation — the admin must re-enter their
                account password before we wipe the database. This prevents
                a hijacked session from destroying data. */}
            <div className="space-y-2">
              <Label htmlFor="restore-password" className="text-xs font-medium flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Enter your account password to authorize
              </Label>
              <Input
                id="restore-password"
                type="password"
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                placeholder="Your account password"
                autoComplete="current-password"
                disabled={restoring}
                className=""
              />
              <p className="text-[10px] text-muted-foreground">
                This is the password you use to log in. Restore will fail if the password is incorrect.
              </p>
            </div>

            {/* Skip hostel structure — when checked, the restore preserves
                the current blocks/rooms/beds (useful if you've restructured
                the hostel and only want to restore users/students/payments). */}
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={skipHostelStructure}
                onChange={(e) => setSkipHostelStructure(e.target.checked)}
                disabled={restoring}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Preserve current hostel structure</span>
                <span className="block text-[10px] text-muted-foreground">
                  If checked, the restore will NOT overwrite blocks, rooms, or beds. Use this if you&apos;ve restructured the hostel and only want to restore users/students/payments/settings.
                </span>
              </span>
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleRestore()
              }}
              disabled={!canRestore}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {restoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Restoring…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1.5" /> Restore Database
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => {
        if (!deleting) setDeleteTarget(open ? deleteTarget : null)
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete this backup?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The backup from <strong>{deleteTarget ? fmtDateTime(deleteTarget.timestamp) : ''}</strong> ({deleteTarget ? formatBytes(deleteTarget.sizeBytes) : ''}) will be permanently removed from the database. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete Backup
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ===========================================================================
// BACKUP ACTIVITY LOG CARD
// ===========================================================================

interface BackupActivityEntry {
  id: string
  action: string
  actorId: string | null
  actorName: string
  actorEmail: string | null
  actorRole: string | null
  ipAddress: string | null
  createdAt: string
  metadata: Record<string, unknown>
}

interface BackupActivityResponse {
  activity: BackupActivityEntry[]
}

/**
 * Maps an audit-log action to a human-readable label + Tailwind color class.
 * Color-coding:
 *   - green  → success events (created, restored)
 *   - amber  → denied / failed / deleted events
 *   - blue   → file-uploaded events
 *   - gray   → anything else (fallback)
 */
function backupActionStyle(action: string): { label: string; className: string } {
  switch (action) {
    case 'BACKUP_CREATED':
      return {
        label: 'Backup created',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      }
    case 'BACKUP_RESTORED':
      return {
        label: 'Restored',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      }
    case 'BACKUP_HOSTEL_STRUCTURE_CREATED':
      return {
        label: 'Hostel structure backed up',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      }
    case 'BACKUP_HOSTEL_STRUCTURE_RESTORED':
      return {
        label: 'Hostel structure restored',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      }
    case 'BACKUP_FILE_UPLOADED':
      return {
        label: 'File uploaded',
        className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
      }
    case 'BACKUP_RESTORE_DENIED':
      return {
        label: 'Restore denied',
        className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      }
    case 'BACKUP_DELETED':
      return {
        label: 'Backup deleted',
        className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      }
    case 'PAYMENT_RECONCILE_RUN_FAILED':
      return {
        label: 'Reconcile failed',
        className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      }
    default:
      return {
        label: action.replace(/_/g, ' ').toLowerCase(),
        className: 'bg-muted text-muted-foreground border',
      }
  }
}

/**
 * Renders a short human-readable summary of an audit-log entry's metadata:
 * file size, record counts, source, errors, filename, reason, etc.
 */
function summarizeBackupMetadata(
  action: string,
  meta: Record<string, unknown>
): string {
  const parts: string[] = []
  const size = meta.sizeBytes
  if (typeof size === 'number' && size > 0) parts.push(formatBytes(size))
  const total = meta.totalRecords
  if (typeof total === 'number' && total > 0) parts.push(`${total.toLocaleString()} records`)
  const filename = meta.filename
  if (typeof filename === 'string' && filename) parts.push(`file: ${filename}`)
  const source = meta.source
  if (typeof source === 'string' && source) parts.push(`source: ${source}`)
  const restored = meta.restored
  if (restored && typeof restored === 'object') {
    const counts = Object.entries(restored as Record<string, number>)
      .map(([tbl, n]) => `${tbl}: ${n}`)
      .join(', ')
    if (counts) parts.push(`restored — ${counts}`)
  }
  const errorCount =
    meta.errorCount ?? (Array.isArray(meta.errors) ? (meta.errors as unknown[]).length : undefined)
  if (typeof errorCount === 'number' && errorCount > 0) parts.push(`${errorCount} error(s)`)
  const reason = meta.reason
  if (typeof reason === 'string' && reason && action === 'BACKUP_RESTORE_DENIED') {
    parts.push(`reason: ${reason}`)
  }
  const tableCounts = meta.tableCounts
  if (tableCounts && typeof tableCounts === 'object') {
    const entries = Object.entries(tableCounts as Record<string, number>)
    if (entries.length) {
      parts.push(`tables — ${entries.map(([t, n]) => `${t}:${n}`).join(', ')}`)
    }
  }
  const durationMs = meta.durationMs
  if (typeof durationMs === 'number' && durationMs > 0) {
    parts.push(`${durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`}`)
  }
  return parts.join(' · ')
}

/**
 * Backup Activity Log card — fetches the most recent backup-related audit
 * entries from /api/backup/activity and renders them as a color-coded table.
 *
 * The card sits below the main BackupRecoveryCard on the BACKUP tab so the
 * admin can see EVERY backup attempt (created, restored, denied, uploaded,
 * deleted) — including ones that failed or were too large to store in the DB.
 */
function BackupActivityLogCard() {
  const { data, isLoading, mutate: refresh } = useSWR<BackupActivityResponse>(
    '/api/backup/activity?limit=20',
    (u: string) => fetch(u, { credentials: 'include' }).then((r) => r.json()),
    { ...swrStable, revalidateOnFocus: false }
  )
  const [refreshing, setRefreshing] = React.useState(false)
  const entries = data?.activity ?? []

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Backup Activity Log
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              The 20 most recent backup-related events — created, restored, denied, uploaded, deleted. Use this to audit who did what and when.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || refreshing}
            title="Refresh activity log"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1 ${isLoading || refreshing ? 'animate-spin' : ''}`}
            />{' '}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No backup activity yet.
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden max-h-[28rem] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[150px]">When</TableHead>
                  <TableHead className="w-[190px]">Action</TableHead>
                  <TableHead className="w-[170px]">Actor</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  const style = backupActionStyle(e.action)
                  const summary = summarizeBackupMetadata(e.action, e.metadata)
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="text-xs font-medium whitespace-nowrap">
                          {fmtDateTime(e.createdAt)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {fmtRelative(e.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium whitespace-nowrap ${style.className}`}
                        >
                          {style.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div
                          className="text-xs font-medium truncate max-w-[160px]"
                          title={e.actorEmail || e.actorName}
                        >
                          {e.actorName}
                        </div>
                        {e.actorRole && (
                          <div className="text-[10px] text-muted-foreground">
                            {e.actorRole.replace(/_/g, ' ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground break-words">
                          {summary || <span className="italic">no details</span>}
                        </div>
                        {e.ipAddress && (
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {e.ipAddress}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ===========================================================================
// HOSTEL STRUCTURE BACKUP CARD
// ===========================================================================

/**
 * Hostel Structure Backup card — a SEPARATE, structure-only backup/restore
 * flow that does NOT touch users, students, payments, or settings.
 *
 * Two actions:
 *   1. "Backup Hostel Structure" — fires POST /api/backup/hostel-structure
 *      and downloads the resulting JSON file (blocks + rooms + beds only).
 *   2. "Restore Hostel Structure" — opens a SEPARATE dialog (not the main
 *      restore dialog) where the admin uploads a structure-only backup file,
 *      types "RESTORE" + their password, and we POST to
 *      /api/backup/hostel-structure/restore with the parsed bundle in the
 *      body (hostel-structure backups are small enough to fit comfortably
 *      inside the HTTP body limit).
 *
 * Beds with active allocations (OCCUPIED, LOCKED, RESERVED) are preserved
 * by the restore endpoint — only AVAILABLE/MAINTENANCE beds are cleared.
 */
function HostelStructureBackupCard() {
  const { mutate } = useSWRConfig()
  const [backupLoading, setBackupLoading] = React.useState(false)
  const [restoreOpen, setRestoreOpen] = React.useState(false)
  const [restoreBusy, setRestoreBusy] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [fileName, setFileName] = React.useState('')
  const [serverFilename, setServerFilename] = React.useState('')
  const [parsedBundle, setParsedBundle] = React.useState<unknown>(null)
  const [confirmText, setConfirmText] = React.useState('')
  const [password, setPassword] = React.useState('')

  const canRestore =
    confirmText.trim() === 'RESTORE' &&
    password.length >= 4 &&
    !!parsedBundle &&
    !restoreBusy

  function resetState() {
    setFileName('')
    setServerFilename('')
    setParsedBundle(null)
    setConfirmText('')
    setPassword('')
  }

  async function handleBackup() {
    setBackupLoading(true)
    const t = toast.loading('Creating hostel structure backup…')
    try {
      const res = await fetch('/api/backup/hostel-structure', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error || `Failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disp = res.headers.get('content-disposition') || ''
      const match = disp.match(/filename="?([^"]+)"?/)
      a.download = match?.[1] || `hostel-structure-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      const records = res.headers.get('x-backup-records')
      toast.success(
        `Hostel structure backup downloaded${records ? ` · ${records} records` : ''}`,
        { id: t }
      )
      mutate('/api/backup/activity?limit=20')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Backup failed', { id: t })
    } finally {
      setBackupLoading(false)
    }
  }

  async function handleFileUpload(file: File) {
    setFileName(file.name)
    setUploading(true)
    const t = toast.loading(`Uploading "${file.name}" (${formatBytes(file.size)})…`)
    // Read the file text + upload to the server in parallel. The parsed
    // bundle goes in the request body when we restore (the hostel-structure
    // restore endpoint takes the bundle directly, not a filename). We also
    // upload the file to /api/backup/upload for consistency with the main
    // backup upload flow + the audit trail.
    const textPromise = file.text()
    const uploadPromise = (async () => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/backup/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = (await res.json().catch(() => ({}))) as {
        filename?: string
        error?: string
      }
      if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`)
      return data.filename as string
    })()

    try {
      const [text, serverName] = await Promise.all([textPromise, uploadPromise])
      const parsed = JSON.parse(text)
      setParsedBundle(parsed)
      setServerFilename(serverName)
      toast.success(`Uploaded "${file.name}" — ready to restore.`, { id: t })
    } catch (e) {
      setParsedBundle(null)
      setServerFilename('')
      toast.error(e instanceof Error ? e.message : 'Upload failed', { id: t })
    } finally {
      setUploading(false)
    }
  }

  async function handleRestore() {
    if (!canRestore) return
    setRestoreBusy(true)
    const t = toast.loading(
      'Restoring hostel structure — beds with active allocations are preserved…'
    )
    try {
      const res = await fetch('/api/backup/hostel-structure/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          data: parsedBundle,
          confirm: 'RESTORE',
          password,
        }),
      })
      const result = (await res.json().catch(() => ({}))) as {
        error?: string
        summary?: { restored: Record<string, number>; errors: unknown[] }
      }
      if (!res.ok) {
        throw new Error(result?.error || `Restore failed (${res.status})`)
      }
      const summary = result?.summary
      const restoredCount = summary
        ? Object.values(summary.restored).reduce((a, b) => a + (b as number), 0)
        : 0
      const errorCount = summary?.errors?.length ?? 0
      toast.success(
        `Hostel structure restored · ${restoredCount} rows re-inserted${errorCount ? ` · ${errorCount} error(s)` : ''}`,
        { id: t, duration: 6000 }
      )
      setRestoreOpen(false)
      resetState()
      mutate('/api/backup/activity?limit=20')
      mutate('/api/dashboard')
      mutate('/api/system-status')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Restore failed', { id: t })
    } finally {
      setRestoreBusy(false)
    }
  }

  return (
    <>
      <Card className="mt-4 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Hostel Structure Backup
          </CardTitle>
          <CardDescription className="text-xs">
            This backs up ONLY the hostel structure (blocks, rooms, beds) — no users, students, payments, or settings. Useful for migrating the layout to a new session or recovering accidentally-deleted beds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg p-3 text-xs bg-blue-500/10 text-blue-800 dark:text-blue-200 border border-blue-500/30 flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Independent from the main backup</div>
              <div className="mt-0.5">
                Restoring hostel structure here does <strong>NOT</strong> affect users, payments, or settings. It is a separate, structure-only restore — beds with active allocations (OCCUPIED, LOCKED, RESERVED) are preserved.
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button
              onClick={handleBackup}
              disabled={backupLoading}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              {backupLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Backing up…
                </>
              ) : (
                <>
                  <Building2 className="h-3.5 w-3.5 mr-1.5" /> Backup Hostel Structure
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                resetState()
                setRestoreOpen(true)
              }}
              variant="outline"
              size="sm"
              className="flex-1 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/10"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Restore Hostel Structure
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hostel-structure restore dialog — SEPARATE from the main restore dialog. */}
      <AlertDialog
        open={restoreOpen}
        onOpenChange={(open) => {
          if (!restoreBusy) {
            setRestoreOpen(open)
            if (!open) resetState()
          }
        }}
      >
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Building2 className="h-5 w-5" /> Restore Hostel Structure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite the current blocks, rooms, and beds with the contents of the backup. Beds with active allocations (OCCUPIED, LOCKED, RESERVED) are preserved. Users, students, payments, and settings are NOT touched.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg p-3 text-xs bg-muted/40 border space-y-2">
              <div className="font-semibold">Upload a hostel-structure backup file:</div>
              {serverFilename ? (
                <div className="space-y-1">
                  <div>
                    File: <code className="font-mono">{fileName}</code>
                  </div>
                  <div className="text-muted-foreground">
                    Saved on server as: <code className="font-mono">{serverFilename}</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileName('')
                      setServerFilename('')
                      setParsedBundle(null)
                    }}
                    disabled={uploading || restoreBusy}
                    className="text-[10px] text-primary underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    Choose a different file
                  </button>
                </div>
              ) : (
                <label
                  className={cn(
                    'cursor-pointer inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs font-medium hover:bg-muted',
                    uploading && 'pointer-events-none opacity-60'
                  )}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploading ? 'Uploading…' : 'Choose JSON file…'}
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void handleFileUpload(f)
                      e.target.value = ''
                    }}
                  />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hs-confirm" className="text-xs font-medium">
                Type <code className="font-mono">RESTORE</code> to confirm
              </Label>
              <Input
                id="hs-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESTORE"
                autoComplete="off"
                autoCapitalize="characters"
                disabled={restoreBusy}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="hs-password"
                className="text-xs font-medium flex items-center gap-1.5"
              >
                <Lock className="h-3 w-3" /> Enter your account password to authorize
              </Label>
              <Input
                id="hs-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your account password"
                autoComplete="current-password"
                disabled={restoreBusy}
              />
              <p className="text-[10px] text-muted-foreground">
                This is the password you use to log in. Restore will fail if the password is incorrect.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleRestore()
              }}
              disabled={!canRestore}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {restoreBusy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Restoring…
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 mr-1.5" /> Restore Hostel Structure
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ===========================================================================
// DANGER ZONE — SYSTEM RESET
// ===========================================================================

/**
 * DangerZoneResetCard — the nuclear option, placed at the bottom of the
 * BACKUP tab. Calls `POST /api/system/reset` which clears ALL transactional
 * data (students, payments, allocations, applications, tickets, logs, chat,
 * notifications) while preserving configuration (hostel structure, faculties,
 * settings, branding, payment gateways, role permissions) and the admin's own
 * account + every SUPER_ADMIN account.
 *
 * Authorization matches the restore endpoints — triple gate:
 *   1. SUPER_ADMIN role (enforced server-side by withAuth)
 *   2. confirm string "RESET"
 *   3. account password re-authentication
 *
 * The server auto-creates a full backup before deleting anything (unless the
 * admin unchecks the "Create an automatic backup" checkbox). If that backup
 * fails, the reset is aborted for safety — we never delete without a net.
 *
 * UI mirrors the HostelStructureBackupCard restore dialog: controlled
 * AlertDialog, native confirm/password inputs, native checkbox for the
 * autoBackup toggle, destructive-red action button disabled until
 * confirm === 'RESET' && password.length >= 4.
 */
function DangerZoneResetCard() {
  const { mutate } = useSWRConfig()
  const [resetOpen, setResetOpen] = React.useState(false)
  const [resetBusy, setResetBusy] = React.useState(false)
  const [confirmText, setConfirmText] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [autoBackup, setAutoBackup] = React.useState(true)
  const [preserveStaff, setPreserveStaff] = React.useState(false)
  const [preserveAnnouncements, setPreserveAnnouncements] = React.useState(false)
  const [preserveAuditLogs, setPreserveAuditLogs] = React.useState(false)

  const canReset =
    confirmText.trim() === 'RESET' && password.length >= 4 && !resetBusy

  function resetState() {
    setConfirmText('')
    setPassword('')
    setAutoBackup(true)
    setPreserveStaff(false)
    setPreserveAnnouncements(false)
    setPreserveAuditLogs(false)
  }

  async function handleReset() {
    if (!canReset) return
    setResetBusy(true)
    const t = toast.loading('Resetting system data — this may take a minute…')
    try {
      const res = await fetch('/api/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          confirm: 'RESET',
          password,
          autoBackup,
          preserveStaff,
          preserveAnnouncements,
          preserveAuditLogs,
        }),
      })
      const result = (await res.json().catch(() => ({}))) as {
        error?: string
        message?: string
        summary?: {
          deleted: Record<string, number>
          preservedUsers: number
          errors: unknown[]
          durationMs: number
        }
        autoBackup?: {
          backupId?: string
          storedInDb: boolean
          sizeBytes: number
          totalRecords: number
        } | null
      }
      if (!res.ok) {
        throw new Error(result?.error || `Reset failed (${res.status})`)
      }
      const deletedCount = result.summary?.deleted
        ? Object.values(result.summary.deleted).reduce(
            (a, b) => a + (b as number),
            0
          )
        : 0
      const preservedUsers = result.summary?.preservedUsers ?? 0
      const backupCreated = !!result.autoBackup
      toast.success(
        `System reset complete · ${deletedCount} rows deleted · ${preservedUsers} admin account(s) preserved${backupCreated ? ' · backup created' : ''}.`,
        { id: t, duration: 8000 }
      )
      setResetOpen(false)
      resetState()
      // Refresh every view that depends on data the reset just wiped.
      mutate('/api/dashboard')
      mutate('/api/system-status')
      mutate('/api/audit-logs')
      mutate('/api/backup/activity?limit=20')
      mutate('/api/backup/list')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reset failed', { id: t })
    } finally {
      setResetBusy(false)
    }
  }

  const deletedItems = [
    'All students + their user accounts',
    'All staff accounts (except SUPER_ADMIN)',
    'All payments + bursary codes',
    'All allocations + reallocation requests',
    'All applications',
    'All maintenance tickets + support tickets',
    'All notifications + email logs',
    'All audit logs + chat history',
    'All announcements + moderation actions',
  ]

  const preservedItems = [
    'Hostel structure (blocks, rooms, beds)',
    'Faculties & departments',
    'Payment gateway configurations',
    'System settings + branding + legal pages',
    'Role permissions',
    'Your admin account + all SUPER_ADMIN accounts',
  ]

  return (
    <>
      <Card className="mt-4 border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> Danger Zone — System Reset
          </CardTitle>
          <CardDescription className="text-xs">
            Permanently delete ALL transactional data (students, payments,
            allocations, applications, tickets, logs, chat, notifications).
            Configuration (hostel structure, faculties, settings, branding,
            payment gateways) is preserved. Your admin account is preserved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {/* What gets deleted */}
            <div className="rounded-lg p-3 text-xs border border-destructive/30 bg-destructive/10 text-destructive">
              <div className="font-semibold flex items-center gap-1.5 mb-2">
                <Trash2 className="h-3.5 w-3.5" /> What gets deleted
              </div>
              <ul className="space-y-1 list-disc pl-4">
                {deletedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            {/* What is preserved */}
            <div className="rounded-lg p-3 text-xs border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200">
              <div className="font-semibold flex items-center gap-1.5 mb-2">
                <ShieldCheck className="h-3.5 w-3.5" /> What is preserved
              </div>
              <ul className="space-y-1 list-disc pl-4">
                {preservedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                resetState()
                setResetOpen(true)
              }}
              variant="destructive"
              size="sm"
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Reset System Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset confirmation dialog */}
      <Dialog
        open={resetOpen}
        onOpenChange={(open) => {
          if (!resetBusy) {
            setResetOpen(open)
            if (!open) resetState()
          }
        }}
      >
        <DialogContent showCloseButton={!resetBusy} className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> ⚠️ Reset ALL System Data?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete ALL students, payments, allocations,
              logs, and staff accounts. Your admin account and all configuration
              will be preserved. An automatic backup will be created first.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="dz-confirm" className="text-xs font-medium">
                Type <code className="font-mono">RESET</code> to confirm
              </Label>
              <Input
                id="dz-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESET"
                autoComplete="off"
                autoCapitalize="characters"
                disabled={resetBusy}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="dz-password"
                className="text-xs font-medium flex items-center gap-1.5"
              >
                <Lock className="h-3 w-3" /> Enter your account password to
                authorize
              </Label>
              <Input
                id="dz-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your account password"
                autoComplete="current-password"
                disabled={resetBusy}
              />
              <p className="text-[10px] text-muted-foreground">
                This is the password you use to log in. Reset will fail if the
                password is incorrect.
              </p>
            </div>

            {/* Auto-backup checkbox — checked by default. The server aborts
                the reset if the backup fails, so leaving this checked is the
                safe choice. */}
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={autoBackup}
                onChange={(e) => setAutoBackup(e.target.checked)}
                disabled={resetBusy}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">
                  Create an automatic backup before resetting (recommended)
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  If checked, a full backup is stored in the database before
                  any data is deleted. If the backup fails, the reset is
                  aborted for safety.
                </span>
              </span>
            </label>

            {/* ── Preservation options ──
                These let the admin keep specific data while clearing
                everything else. Useful for end-of-year resets where you
                want to keep staff accounts but clear students. */}
            <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold">
                Optionally preserve:
              </div>
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={preserveStaff}
                  onChange={(e) => setPreserveStaff(e.target.checked)}
                  disabled={resetBusy}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">Keep staff accounts</span>
                  <span className="block text-[10px] text-muted-foreground">
                    Preserves all ADMIN / BURSARY / MODERATOR / SUPPORT_REP accounts (only students are deleted). SUPER_ADMIN accounts are always preserved.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={preserveAnnouncements}
                  onChange={(e) => setPreserveAnnouncements(e.target.checked)}
                  disabled={resetBusy}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">Keep announcements</span>
                  <span className="block text-[10px] text-muted-foreground">
                    Preserves broadcast announcements (useful if you want to keep institutional notices visible after the reset).
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={preserveAuditLogs}
                  onChange={(e) => setPreserveAuditLogs(e.target.checked)}
                  disabled={resetBusy}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">Keep audit logs</span>
                  <span className="block text-[10px] text-muted-foreground">
                    Preserves the full audit history (all past actions remain queryable). Unchecked by default since the reset itself is logged as the first new entry.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={resetBusy} onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault()
                void handleReset()
              }}
              disabled={!canReset}
              variant="destructive"
            >
              {resetBusy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Resetting…
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-1.5" /> Reset System Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ===========================================================================
// AUDIT LOG CLEANUP CARD
// ===========================================================================

/**
 * "Run cleanup now" card — calls POST /api/audit-logs/cleanup which deletes
 * every AuditLog row older than the configured retention window. Surfaces
 * the count of deleted rows + the cutoff date so the admin can verify the
 * right window was used.
 *
 * Also documents the recommended Vercel Cron schedule so the admin knows
 * where to wire the cron entry in `vercel.json`.
 */
function AuditCleanupCard({ retentionDays }: { retentionDays?: string }) {
  const [running, setRunning] = React.useState(false)
  const [lastResult, setLastResult] = React.useState<{ deleted: number; cutoff: string; retentionDays: number } | null>(null)
  const { mutate } = useSWRConfig()

  const effectiveRetention = (() => {
    const parsed = retentionDays ? parseInt(retentionDays, 10) : NaN
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 90
  })()

  async function handleCleanup() {
    setRunning(true)
    const t = toast.loading('Purging old audit logs…')
    try {
      const res = await fetch('/api/audit-logs/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || `Cleanup failed (${res.status})`)
      }
      setLastResult({
        deleted: data.deleted,
        cutoff: data.cutoff,
        retentionDays: data.retentionDays,
      })
      toast.success(`Deleted ${data.deleted} audit log${data.deleted === 1 ? '' : 's'} older than ${data.retentionDays} days`, { id: t })
      mutate('/api/audit-logs')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cleanup failed', { id: t })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Audit Log Retention
        </CardTitle>
        <CardDescription className="text-xs">
          Manually purge audit log entries older than the retention window (currently <strong>{effectiveRetention} days</strong>). Configure the window in the form above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg p-3 text-xs bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/30 flex items-start gap-2">
          <Clock className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Recommended: Vercel Cron</div>
            <div className="mt-0.5">
              Add this to your <code className="font-mono">vercel.json</code> so the purge runs automatically every night at 2am UTC:
              <pre className="mt-1.5 p-2 rounded bg-background/80 text-[10px] overflow-x-auto">{`{
  "crons": [{
    "path": "/api/audit-logs/cleanup",
    "schedule": "0 2 * * *"
  }]
}`}</pre>
              <div className="mt-1.5">Set <code className="font-mono">CRON_SECRET</code> in your Vercel env if you want to require it (the endpoint also accepts a logged-in SUPER_ADMIN session).</div>
            </div>
          </div>
        </div>

        {lastResult && (
          <div className="rounded-lg p-3 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Cleanup complete</div>
              <div className="mt-0.5">
                Deleted <strong>{lastResult.deleted}</strong> audit log{lastResult.deleted === 1 ? '' : 's'} older than <strong>{fmtDateTime(lastResult.cutoff)}</strong> (retention: {lastResult.retentionDays} days).
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end">
          <Button onClick={handleCleanup} disabled={running} size="sm">
            {running ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Purging…
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Run Cleanup Now
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ===========================================================================
// HEALTH ALERT CARD
// ===========================================================================

interface HealthCheckResponse {
  generatedAt: string
  health: {
    overall: { pct: number; status: string }
    checks: Array<{ key: string; label: string; status: string; message: string }>
  }
  alert: {
    enabled: boolean
    threshold: number
    recipient: string | null
    sent: boolean
    reason: string
    error?: string
  }
}

/**
 * "Run health check now" card — fires POST /api/system-health/check which
 * runs the same six health checks as the System Status page and (if alerts
 * are enabled and overall % is below threshold) sends an email alert.
 *
 * Shows the live overall %, the configured threshold, and the last alert
 * outcome so the admin can verify the alert pipeline end-to-end without
 * waiting for a cron tick.
 */
function HealthAlertCard({
  enabled,
  threshold,
  email,
}: {
  enabled: boolean
  threshold?: string
  email?: string
}) {
  const effectiveThreshold = (() => {
    const parsed = threshold ? parseInt(threshold, 10) : NaN
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : 50
  })()

  const [running, setRunning] = React.useState(false)
  const [result, setResult] = React.useState<HealthCheckResponse | null>(null)

  async function handleCheck() {
    setRunning(true)
    const t = toast.loading('Running health check…')
    try {
      const res = await fetch('/api/system-health/check', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || `Health check failed (${res.status})`)
      }
      setResult(data as HealthCheckResponse)
      const pct = data?.health?.overall?.pct
      const status = data?.health?.overall?.status?.toUpperCase()
      const alertSent = data?.alert?.sent
      toast.success(
        `Health: ${pct}% (${status})${alertSent ? ' · alert email sent' : ''}`,
        { id: t }
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Health check failed', { id: t })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> Health Alert Configuration
        </CardTitle>
        <CardDescription className="text-xs">
          Run the system health check now to see the current score and trigger an alert email if it&apos;s below the threshold.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Alerts</div>
            <div className={`text-sm font-semibold mt-0.5 ${enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Threshold</div>
            <div className="text-sm font-semibold mt-0.5">{effectiveThreshold}%</div>
          </div>
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Recipient</div>
            <div className="text-xs font-semibold mt-0.5 truncate" title={email || 'Support email (fallback)'}>
              {email || 'Support email (fallback)'}
            </div>
          </div>
        </div>

        {result && (
          <div className="rounded-lg p-3 text-xs border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4" /> Last check result
              </div>
              <Badge variant="outline" className="text-[10px]">
                {fmtDateTime(result.generatedAt)}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold">{result.health.overall.pct}%</div>
              <Badge
                className={
                  result.health.overall.status === 'ok'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : result.health.overall.status === 'warning'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      : 'bg-destructive/15 text-destructive border-destructive/30'
                }
              >
                {result.health.overall.status.toUpperCase()}
              </Badge>
            </div>
            <ul className="space-y-1 mt-2">
              {result.health.checks.map((c) => (
                <li key={c.key} className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 inline-block w-2 h-2 rounded-full shrink-0 ${
                      c.status === 'ok'
                        ? 'bg-emerald-500'
                        : c.status === 'warning'
                          ? 'bg-amber-500'
                          : c.status === 'error'
                            ? 'bg-destructive'
                            : 'bg-blue-500'
                    }`}
                  />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{c.label}</strong> — {c.message}
                  </span>
                </li>
              ))}
            </ul>
            {result.alert.sent ? (
              <div className="rounded-md p-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                Alert email sent to {result.alert.recipient || '(no recipient)'}.
              </div>
            ) : (
              <div className="rounded-md p-2 bg-muted text-muted-foreground border">
                No alert sent — reason: <code className="font-mono">{result.alert.reason}</code>
                {result.alert.error ? ` · ${result.alert.error}` : ''}
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg p-3 text-xs bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/30 flex items-start gap-2">
          <Bell className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Recommended: Vercel Cron</div>
            <div className="mt-0.5">
              Wire this endpoint to run hourly so alerts fire automatically:
              <pre className="mt-1.5 p-2 rounded bg-background/80 text-[10px] overflow-x-auto">{`{
  "crons": [{
    "path": "/api/system-health/check",
    "schedule": "0 * * * *"
  }]
}`}</pre>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button onClick={handleCheck} disabled={running} size="sm">
            {running ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Checking…
              </>
            ) : (
              <>
                <Activity className="h-3.5 w-3.5 mr-1.5" /> Run Health Check Now
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
