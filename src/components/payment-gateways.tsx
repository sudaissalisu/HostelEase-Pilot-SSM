'use client'

import * as React from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { swrStable } from '@/lib/swr-config'
import { toast } from 'sonner'
import {
  CreditCard,
  RefreshCw,
  Eye,
  EyeOff,
  Settings2,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  KeyRound,
  CheckCircle2,
  Power,
  FlaskConical,
  Radio,
  Copy,
  Building2,
  Upload,
  X,
  Loader2,
  Webhook,
  Link2,
  Zap,
  Wifi,
  WifiOff,
  AlertTriangle,
  XCircle,
  Ticket,
} from 'lucide-react'

import { PageHeader, StatCard, EmptyState } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn, fmtRelative } from '@/lib/utils'
import { ImageCropper } from '@/components/shared/image-cropper'
import { useRolePermissions } from '@/lib/use-role-permissions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Provider = 'PAYSTACK' | 'OPAY' | 'FLUTTERWAVE' | 'REMITA' | 'KORA' | 'ZAINPAY' | 'MANUAL_TRANSFER'

interface CredentialFieldStatus {
  field: 'publicKey' | 'secretKey' | 'webhookSecret' | 'merchantId' | 'apiKey'
  present: boolean
  envVar: string | null
  required: boolean
  /** Is the LIVE env var for this field set? (independent of current mode) */
  livePresent?: boolean
  /** Is the SANDBOX env var for this field set? (null if no sandbox variant) */
  sandboxPresent?: boolean | null
}

interface CredentialStatus {
  hasDbRow: boolean
  isSandbox: boolean
  fullyConfigured: boolean
  missingRequired: string[]
  fields: CredentialFieldStatus[]
  /** Aggregate: are all required LIVE env vars set? */
  liveKeysDetected?: boolean
  /** Aggregate: are all required SANDBOX env vars set (or falling back to live)? */
  sandboxKeysDetected?: boolean
  /** Human-readable summary of which mode is ready. */
  keysReady?: 'both' | 'live-only' | 'sandbox-only' | 'none'
}

interface Gateway {
  id: string | null
  provider: Provider | string
  displayName: string
  publicKey: string | null
  secretKey: string | null
  webhookSecret: string | null
  merchantId: string | null
  apiKey: string | null
  logoUrl: string | null
  isEnabled: boolean
  isSandbox: boolean
  config: string | null
  updatedAt: string | null
  updatedById?: string | null
  hasEnvDefaults?: boolean
  /** Always 'env' now — secrets come from env vars, never the DB. */
  credsSource?: 'env'
  /** Per-field env-var presence info from the server. */
  credStatus?: CredentialStatus | null
  /** Per-provider webhook URL returned by the API (server-to-server). Null for MANUAL_TRANSFER. */
  webhookUrl?: string | null
  /** Shared browser-redirect callback URL returned by the API. */
  callbackUrl?: string | null
}

interface GatewaysResponse {
  gateways: Gateway[]
}

// ---------------------------------------------------------------------------
// Provider metadata
// ---------------------------------------------------------------------------

type FieldType = 'text' | 'secret' | 'textarea'

interface FieldDef {
  key: string
  label: string
  type: FieldType
  placeholder: string
  hint?: string
  /** maps to the API body field — defaults to key */
  bodyKey?: string
  /** where to read the existing value from the gateway object — defaults to bodyKey or key */
  readKey?: string
  /**
   * 'main' = top-level column on PaymentGateway (default)
   * 'config' = nested under config JSON
   */
  scope?: 'main' | 'config'
  /** key inside the config JSON blob — defaults to `key` */
  configKey?: string
  /**
   * If true, this field is read EXCLUSIVELY from env vars and the admin
   * cannot set it via the UI. The dialog shows a read-only env-presence
   * badge instead of an input. Defaults to false.
   *
   * Set automatically for publicKey / secretKey / webhookSecret / apiKey
   * fields with scope 'main' — see `isEnvOnlyField()`.
   */
  envOnly?: boolean
}

/**
 * Returns true if the field is read exclusively from env vars.
 *
 * This is the case for the four credential columns (publicKey, secretKey,
 * webhookSecret, apiKey) when they're stored as top-level DB columns
 * (scope 'main'). The 'merchantId' column is NOT env-only — it's a
 * non-secret identifier the admin can set in the UI. Fields in the
 * config blob (scope 'config') are always DB-stored.
 */
function isEnvOnlyField(field: FieldDef): boolean {
  if (field.envOnly) return true
  if (field.scope === 'config') return false
  const k = field.bodyKey || field.key
  return k === 'publicKey' || k === 'secretKey' || k === 'webhookSecret' || k === 'apiKey'
}

/**
 * Find the env-var status for a field from the server-supplied credStatus.
 * Returns null if no status is available (e.g. older API response).
 */
function findFieldStatus(
  credStatus: CredentialStatus | null | undefined,
  field: FieldDef
): CredentialFieldStatus | null {
  if (!credStatus) return null
  const k = (field.bodyKey || field.key) as CredentialFieldStatus['field']
  return credStatus.fields.find((f) => f.field === k) || null
}

interface ProviderMeta {
  displayName: string
  description: string
  docsUrl?: string
  badgeColor: string
  avatarBg: string
  avatarLetter: string
  /** Provider supports logo upload? Defaults to true. */
  supportsLogo?: boolean
  /** Provider exposes a webhook URL? Defaults to true. MANUAL_TRANSFER has no webhook. */
  hasWebhook?: boolean
  fields: FieldDef[]
}

const PROVIDER_META: Record<Provider, ProviderMeta> = {
  PAYSTACK: {
    displayName: 'Paystack',
    description: 'Standard Nigerian gateway with public/secret keys.',
    docsUrl: 'https://paystack.com/docs/api',
    badgeColor:
      'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
    avatarBg: 'bg-teal-500 text-white',
    avatarLetter: 'P',
    fields: [
      { key: 'publicKey', label: 'Public Key', type: 'text', placeholder: 'pk_live_xxxxxxxxxxxxxxxxxxxx' },
      { key: 'secretKey', label: 'Secret Key', type: 'secret', placeholder: 'sk_live_xxxxxxxxxxxxxxxxxxxx' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'secret', placeholder: 'whsec_xxxxxxxxxxxxxxxxxxxx' },
    ],
  },
  OPAY: {
    displayName: 'OPay',
    description: 'OPay merchant integration with API key.',
    docsUrl: 'https://opaycheckout.com/documentation',
    badgeColor:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    avatarBg: 'bg-emerald-500 text-white',
    avatarLetter: 'O',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text', placeholder: 'OPAY-MID-XXXXXXXX' },
      { key: 'apiKey', label: 'API Key', type: 'secret', placeholder: 'OPAYPKXXXXXXXXXXXXXXXXXX' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'secret', placeholder: 'whsec_xxxxxxxxxxxxxxxxxxxx' },
    ],
  },
  FLUTTERWAVE: {
    displayName: 'Flutterwave',
    description: 'Pan-African gateway — needs an encryption key.',
    docsUrl: 'https://developer.flutterwave.com',
    badgeColor:
      'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    avatarBg: 'bg-amber-500 text-white',
    avatarLetter: 'F',
    fields: [
      { key: 'publicKey', label: 'Public Key', type: 'text', placeholder: 'FLWPUBK-XXXXXXXXXXXXXXXXXXXX-X' },
      { key: 'secretKey', label: 'Secret Key', type: 'secret', placeholder: 'FLWSECK-XXXXXXXXXXXXXXXXXXXX-X' },
      { key: 'apiKey', label: 'Encryption Key', type: 'secret', placeholder: 'FLWSECK_TESTXXXXXXXX', bodyKey: 'apiKey', hint: 'Stored in the apiKey column.' },
      { key: 'webhookSecret', label: 'Webhook Hash', type: 'secret', placeholder: 'whsec_xxxxxxxxxxxxxxxxxxxx' },
    ],
  },
  REMITA: {
    displayName: 'Remita',
    description: 'Nigerian government & education payments gateway.',
    docsUrl: 'https://www.remita.net/developers',
    badgeColor:
      'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    avatarBg: 'bg-rose-500 text-white',
    avatarLetter: 'R',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text', placeholder: '27568XXXXXXXXXX' },
      { key: 'apiKey', label: 'API Key', type: 'secret', placeholder: 'QzAwMDAxXXXXXXXXXXXXXXXX' },
      { key: 'webhookSecret', label: 'Service Type ID', type: 'secret', placeholder: '4430731', hint: 'Stored in the webhookSecret column.' },
      { key: 'remitaWebhookSecret', label: 'Webhook Secret', type: 'secret', placeholder: 'whsec_xxxxxxxxxxxxxxxxxxxx', hint: 'Stored in the config blob.', scope: 'config', configKey: 'webhookSecret' },
    ],
  },
  KORA: {
    displayName: 'Kora',
    description: 'Pan-African payments — supports card & bank transfer.',
    docsUrl: 'https://docs.korapay.com',
    badgeColor: 'bg-[#6C5CE7]/10 text-[#6C5CE7] border-[#6C5CE7]/30',
    avatarBg: 'bg-[#6C5CE7] text-white',
    avatarLetter: 'K',
    fields: [
      { key: 'publicKey', label: 'Public Key', type: 'text', placeholder: 'pk_live_xxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'secretKey', label: 'Secret Key', type: 'secret', placeholder: 'sk_live_xxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'secret', placeholder: 'whk_xxxxxxxxxxxxxxxxxxxxxxxx' },
    ],
  },
  ZAINPAY: {
    displayName: 'Zainpay',
    description: 'Zainpay checkout — card & bank transfer via zainbox.',
    docsUrl: 'https://zainpay.ng/developers',
    badgeColor: 'bg-[#00A859]/10 text-[#00A859] border-[#00A859]/30',
    avatarBg: 'bg-[#00A859] text-white',
    avatarLetter: 'Z',
    fields: [
      // The Zainpay dashboard calls the bearer key "Private Key" — match that label.
      { key: 'secretKey', label: 'Private Key', type: 'secret', placeholder: 'zpk_live_xxxxxxxxxxxxxxxxxxxxxxxx', hint: 'Bearer token used for all API calls.' },
      { key: 'publicKey', label: 'Public Key', type: 'text', placeholder: 'optional — for client-side calls', hint: 'Optional. Stored in the publicKey column.' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'secret', placeholder: 'whsec_xxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'zainboxCode', label: 'Zainbox Code', type: 'text', placeholder: 'ZB-XXXXXXXX', hint: 'Stored in the config blob.', scope: 'config', configKey: 'zainboxCode' },
    ],
  },
  MANUAL_TRANSFER: {
    displayName: 'Manual Transfer',
    description: 'Students pay via bank transfer and upload a receipt for confirmation.',
    badgeColor:
      'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
    avatarBg: 'bg-zinc-700 text-white',
    avatarLetter: 'M',
    hasWebhook: false,
    fields: [
      { key: 'bankName', label: 'Bank Name', type: 'text', placeholder: 'e.g. GTBank', scope: 'config', configKey: 'bankName' },
      { key: 'accountNumber', label: 'Account Number', type: 'text', placeholder: '0123456789', scope: 'config', configKey: 'accountNumber' },
      { key: 'accountName', label: 'Account Name', type: 'text', placeholder: 'University Hostel Account', scope: 'config', configKey: 'accountName' },
      { key: 'notes', label: 'Notes for Student', type: 'textarea', placeholder: 'e.g. Use this reference as the transfer description: HES-REG-NUMBER', scope: 'config', configKey: 'notes' },
    ],
  },
}

const ALL_PROVIDERS: Provider[] = ['PAYSTACK', 'OPAY', 'FLUTTERWAVE', 'REMITA', 'KORA', 'ZAINPAY', 'MANUAL_TRANSFER']

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: 'include' })
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error(body?.error || `Request failed: ${r.status}`)
  }
  return r.json()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readConfig(gw: Gateway | undefined): Record<string, unknown> {
  if (!gw?.config) return {}
  try {
    return JSON.parse(gw.config) as Record<string, unknown>
  } catch {
    return {}
  }
}

function isFieldSet(gw: Gateway | undefined, field: FieldDef): boolean {
  if (!gw) return false
  // For env-only fields, presence comes from the server-supplied credStatus
  // (the client never sees the actual env value).
  if (isEnvOnlyField(field)) {
    const status = findFieldStatus(gw.credStatus, field)
    return !!status?.present
  }
  if (field.scope === 'config') {
    const ck = field.configKey || field.key
    const v = readConfig(gw)[ck]
    return typeof v === 'string' && v.length > 0
  }
  const readKey = field.readKey || field.bodyKey || field.key
  const val = (gw as unknown as Record<string, unknown>)[readKey]
  return typeof val === 'string' && val.length > 0
}

function getExistingValue(gw: Gateway | undefined, field: FieldDef): string {
  if (!gw) return ''
  // Env-only fields have no client-visible value — return empty string so
  // the placeholder shows.
  if (isEnvOnlyField(field)) return ''
  if (field.scope === 'config') {
    const ck = field.configKey || field.key
    const v = readConfig(gw)[ck]
    return typeof v === 'string' ? v : ''
  }
  const readKey = field.readKey || field.bodyKey || field.key
  const val = (gw as unknown as Record<string, unknown>)[readKey]
  return typeof val === 'string' ? val : ''
}

/**
 * Build the per-provider webhook URL for display in the admin UI.
 * Falls back to window.location.origin if no env var is set.
 *
 * NOTE: The API at /api/payment-gateways now returns `webhookUrl` and
 * `callbackUrl` for each provider (computed server-side via getAppUrl()).
 * Those values are preferred — this is a client-side fallback used while
 * the SWR cache is hydrating or if an older API response is cached.
 */
function buildWebhookUrl(provider: string): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    return `${origin}/api/payments/webhook?provider=${provider}`
  }
  return `/api/payments/webhook?provider=${provider}`
}

/**
 * Build the shared browser-redirect callback URL (client-side fallback).
 * Same caveat as buildWebhookUrl — the API value is preferred.
 */
function buildCallbackUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/payment/callback`
  }
  return '/payment/callback'
}

/**
 * Resolve the webhook URL for a provider — prefers the server-supplied value
 * from the API response, falls back to a client-side construction.
 */
function resolveWebhookUrl(provider: string, gateway?: Gateway): string | null {
  if (provider === 'MANUAL_TRANSFER') return null
  if (gateway?.webhookUrl) return gateway.webhookUrl
  return buildWebhookUrl(provider)
}

/**
 * Resolve the callback URL — prefers the server-supplied value, falls back
 * to a client-side construction.
 */
function resolveCallbackUrl(gateway?: Gateway): string {
  if (gateway?.callbackUrl) return gateway.callbackUrl
  return buildCallbackUrl()
}

// ---------------------------------------------------------------------------
// Configure Dialog
// ---------------------------------------------------------------------------

function GatewayConfigDialog({
  provider,
  gateway,
  open,
  onOpenChange,
  onSaved,
}: {
  provider: Provider | null
  gateway: Gateway | undefined
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const meta = provider ? PROVIDER_META[provider] : null
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [showSecrets, setShowSecrets] = React.useState<Record<string, boolean>>({})
  const [saving, setSaving] = React.useState(false)
  const [logoUrl, setLogoUrl] = React.useState<string>('')
  const [uploadingLogo, setUploadingLogo] = React.useState(false)
  const [cropFile, setCropFile] = React.useState<File | null>(null)
  const logoInputRef = React.useRef<HTMLInputElement>(null)
  const supportsLogo = meta?.supportsLogo !== false

  // Initialize values when dialog opens
  React.useEffect(() => {
    if (!open || !meta) return
    const next: Record<string, string> = {}
    for (const f of meta.fields) {
      next[f.key] = ''
    }
    setValues(next)
    setShowSecrets({})
    setLogoUrl(gateway?.logoUrl || '')
  }, [open, meta, gateway?.logoUrl])

  if (!provider || !meta) return null

  const handleUploadLogo = async (file: File) => {
    setUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        toast.error(data.error || 'Logo upload failed')
        return
      }
      setLogoUrl(data.url)
      toast.success('Logo uploaded')
    } catch {
      toast.error('Logo upload failed')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function uploadCroppedLogo(dataUrl: string) {
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const croppedFile = new File([blob], 'gateway-logo.png', { type: 'image/png' })
      await handleUploadLogo(croppedFile)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Crop upload failed')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const t = toast.loading(`Saving ${meta.displayName} configuration…`)
    try {
      // Build the body. We always POST (upsert) per spec.
      //
      // Env-only fields (publicKey, secretKey, webhookSecret, apiKey) are
      // NOT sent to the server — they're read exclusively from env vars.
      // The server-side POST handler ignores them anyway, but we skip
      // them here too so we don't accidentally send a stale value.
      const body: Record<string, unknown> = {
        provider,
        displayName: meta.displayName,
        isEnabled: gateway?.isEnabled ?? false,
        isSandbox: gateway?.isSandbox ?? true,
        logoUrl: logoUrl || null,
      }

      // Collect config-blob extras
      const configBlob: Record<string, unknown> = readConfig(gateway)

      for (const f of meta.fields) {
        // Skip env-only fields — they're not persisted to the DB.
        if (isEnvOnlyField(f)) continue

        const entered = values[f.key] || ''
        const value = entered === '' ? getExistingValue(gateway, f) : entered
        if (f.scope === 'config') {
          const ck = f.configKey || f.key
          if (value) configBlob[ck] = value
          else delete configBlob[ck]
          continue
        }
        const bodyKey = f.bodyKey || f.key
        body[bodyKey] = value || null
      }

      body.config = configBlob

      const res = await fetch('/api/payment-gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error || `Failed (${res.status})`)
      }
      await onSaved()
      toast.success(`${meta.displayName} configuration saved`, { id: t })
      onOpenChange(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save', { id: t })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ProviderAvatar provider={provider} gateway={gateway} size="sm" />
            Configure {meta.displayName}
          </DialogTitle>
          <DialogDescription>
            {meta.description}{' '}
            {meta.docsUrl && (
              <a
                href={meta.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                View docs <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode + Enabled summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Mode
              </div>
              <div className="text-sm font-medium flex items-center gap-1.5">
                {gateway?.isSandbox !== false ? (
                  <>
                    <FlaskConical className="h-3.5 w-3.5 text-amber-500" /> Sandbox
                  </>
                ) : (
                  <>
                    <Radio className="h-3.5 w-3.5 text-emerald-500" /> Live
                  </>
                )}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Status
              </div>
              <div className="text-sm font-medium flex items-center gap-1.5">
                {gateway?.isEnabled ? (
                  <>
                    <Power className="h-3.5 w-3.5 text-emerald-500" /> Enabled
                  </>
                ) : (
                  <>
                    <Power className="h-3.5 w-3.5 text-muted-foreground" /> Disabled
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Webhook + Callback URLs (read-only, with copy buttons) */}
          <GatewayUrlsRow provider={provider} gateway={gateway} />

          {/* Logo uploader */}
          {supportsLogo && (
            <div className="space-y-1.5">
              <Label className="text-xs">Provider Logo</Label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg border bg-muted/30 overflow-hidden grid place-items-center shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="logo" className="h-full w-full object-cover" />
                  ) : (
                    <div className={cn('h-full w-full grid place-items-center font-bold text-base', meta.avatarBg)}>
                      {meta.avatarLetter}
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={logoInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setCropFile(f)
                    e.target.value = ''
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                  {logoUrl ? 'Replace logo' : 'Upload logo'}
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogoUrl('')}
                  >
                    <X className="h-4 w-4 mr-1.5" /> Remove
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Optional. If set, the logo is shown instead of the letter avatar in both the admin and student UI.
              </p>
            </div>
          )}

          <Separator />

          {/* Fields */}
          <div className="space-y-3">
            {meta.fields.map((f) => {
              const set = isFieldSet(gateway, f)
              const envOnly = isEnvOnlyField(f)
              const fieldStatus = findFieldStatus(gateway?.credStatus, f)
              const show = showSecrets[f.key]
              const isSecret = f.type === 'secret'
              const isTextarea = f.type === 'textarea'

              // ── Env-only fields: read-only env-presence badge ──────
              // These fields come exclusively from env vars — the admin
              // can't set them in the UI, only see whether the env var
              // is detected and which env var name to set.
              if (envOnly) {
                return (
                  <div key={f.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs flex items-center gap-1">
                        {f.label}
                        <KeyRound className="h-3 w-3 text-muted-foreground" />
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] py-0 ml-1',
                            'bg-primary/5 text-primary/70 border-primary/20'
                          )}
                        >
                          ENV
                        </Badge>
                      </Label>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] py-0',
                          fieldStatus?.present
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                        )}
                      >
                        {fieldStatus?.present ? (
                          <span className="flex items-center gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" /> detected
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" /> missing
                          </span>
                        )}
                      </Badge>
                    </div>
                    <div className="rounded-md border bg-muted/30 px-2.5 py-2 font-mono text-[11px] text-muted-foreground break-all">
                      {fieldStatus?.envVar ? (
                        <>
                          <span className="text-foreground/80">{fieldStatus.envVar}</span>
                          <span className="text-muted-foreground/70">=</span>
                          {fieldStatus.present ? (
                            <span className="text-emerald-600 dark:text-emerald-400">••••••••••••</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 italic">(not set)</span>
                          )}
                        </>
                      ) : (
                        <span className="italic text-muted-foreground/70">
                          No env var mapping for this field.
                        </span>
                      )}
                    </div>
                    {f.hint && (
                      <p className="text-[10px] text-muted-foreground">{f.hint}</p>
                    )}
                    {fieldStatus?.required && !fieldStatus.present && (
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Required — set this env var to use {meta.displayName}.
                      </p>
                    )}
                  </div>
                )
              }

              // ── DB-stored fields: regular input ─────────────────────
              return (
                <div key={f.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`gw-${f.key}`} className="text-xs">
                      {f.label}
                      {isSecret && (
                        <KeyRound className="inline h-3 w-3 ml-1 text-muted-foreground" />
                      )}
                    </Label>
                    {set && isSecret && (
                      <Badge
                        variant="outline"
                        className="text-[9px] py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      >
                        •••••• set
                      </Badge>
                    )}
                  </div>
                  <div className="relative">
                    {isTextarea ? (
                      <Textarea
                        id={`gw-${f.key}`}
                        placeholder={
                          set ? '•••••• (enter new to replace)' : f.placeholder
                        }
                        value={values[f.key] || ''}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [f.key]: e.target.value }))
                        }
                        rows={2}
                        className="text-sm"
                      />
                    ) : (
                      <Input
                        id={`gw-${f.key}`}
                        type={isSecret && !show ? 'password' : 'text'}
                        placeholder={
                          set && isSecret ? '•••••• (enter new to replace)' : f.placeholder
                        }
                        value={values[f.key] || ''}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [f.key]: e.target.value }))
                        }
                        autoComplete="off"
                        className={isSecret ? 'pr-9' : ''}
                      />
                    )}
                    {isSecret && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowSecrets((s) => ({ ...s, [f.key]: !s[f.key] }))
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={show ? 'Hide' : 'Show'}
                      >
                        {show ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                  {f.hint && (
                    <p className="text-[10px] text-muted-foreground">{f.hint}</p>
                  )}
                </div>
              )
            })}
          </div>

          <Alert className="py-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            <AlertTitle className="text-xs">Secrets come from environment variables</AlertTitle>
            <AlertDescription className="text-[11px]">
              Credential keys (public / secret / API / webhook) are read exclusively from <code className="font-mono">process.env</code> — they are not stored in the database.
              Set <code className="font-mono">{provider}_TEST_*</code> vars for sandbox mode and <code className="font-mono">{provider}_*</code> vars for live mode.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Configuration'}
          </Button>
        </DialogFooter>

        {cropFile && (
          <ImageCropper
            file={cropFile}
            onCrop={(dataUrl) => {
              uploadCroppedLogo(dataUrl)
              setCropFile(null)
            }}
            onCancel={() => setCropFile(null)}
            title="Crop Provider Logo"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Provider Avatar (logo or letter initials)
// ---------------------------------------------------------------------------

function ProviderAvatar({
  provider,
  gateway,
  size = 'md',
}: {
  provider: Provider
  gateway?: Gateway
  size?: 'sm' | 'md' | 'lg'
}) {
  const meta = PROVIDER_META[provider]
  const logoUrl = gateway?.logoUrl
  const sizeCls = size === 'sm' ? 'h-9 w-9 text-sm' : size === 'lg' ? 'h-14 w-14 text-xl' : 'h-11 w-11 text-base'

  if (logoUrl) {
    return (
      <div className={cn('rounded-xl overflow-hidden grid place-items-center shrink-0 border', sizeCls)}>
        <img src={logoUrl} alt={meta.displayName} className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl grid place-items-center font-bold shrink-0',
        sizeCls,
        meta.avatarBg
      )}
    >
      {meta.avatarLetter}
    </div>
  )
}

// ---------------------------------------------------------------------------
// URL row (webhook + callback) with copy buttons
// ---------------------------------------------------------------------------

/**
 * A single labelled URL row with a copy button. Used to render both the
 * webhook URL and the callback URL on each gateway card.
 */
function UrlRow({
  label,
  url,
  description,
  icon,
  copyLabel,
}: {
  label: string
  url: string
  description?: string
  icon: React.ReactNode
  copyLabel: string
}) {
  const [copied, setCopied] = React.useState(false)
  return (
    <div className="rounded-md border bg-muted/30 px-2.5 py-2 space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/80">
          {label}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url)
                  setCopied(true)
                  toast.success(`${label} copied`)
                  setTimeout(() => setCopied(false), 1500)
                } catch {
                  toast.error('Copy failed')
                }
              }}
              className="ml-auto text-muted-foreground hover:text-foreground shrink-0"
              aria-label={copyLabel}
            >
              {copied ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>{copyLabel}</TooltipContent>
        </Tooltip>
      </div>
      <div className="font-mono text-[10px] truncate text-muted-foreground" title={url}>
        {url}
      </div>
      {description && (
        <div className="text-[10px] text-muted-foreground/80 leading-snug">{description}</div>
      )}
    </div>
  )
}

/**
 * Renders both the per-provider webhook URL (server-to-server) and the shared
 * browser-redirect callback URL for a gateway. Skipped entirely for
 * MANUAL_TRANSFER which has no webhook — though the callback URL is still
 * useful as a reference (the bursar verifies the receipt manually).
 */
function GatewayUrlsRow({ provider, gateway }: { provider: Provider; gateway?: Gateway }) {
  const meta = PROVIDER_META[provider]
  const webhookUrl = resolveWebhookUrl(provider, gateway)
  const callbackUrl = resolveCallbackUrl(gateway)
  const hasWebhook = meta.hasWebhook !== false

  return (
    <div className="space-y-1.5">
      {hasWebhook && webhookUrl && (
        <UrlRow
          label="Webhook URL"
          url={webhookUrl}
          icon={<Webhook className="h-3.5 w-3.5" />}
          copyLabel="Copy webhook URL"
          description="Set this in your provider's dashboard to receive server-to-server payment notifications."
        />
      )}
      <UrlRow
        label="Callback URL"
        url={callbackUrl}
        icon={<Link2 className="h-3.5 w-3.5" />}
        copyLabel="Copy callback URL"
        description="Where students are redirected in the browser after completing payment."
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Key Detection Panel — shows whether LIVE and/or SANDBOX env vars are
// detected for a gateway. Gives admins an at-a-glance answer to "can I
// switch this gateway to live mode without hitting a missing-key error?"
// ---------------------------------------------------------------------------

function KeyDetectionPanel({
  keysReady,
  liveKeysDetected,
  sandboxKeysDetected,
  isSandbox,
}: {
  keysReady?: 'both' | 'live-only' | 'sandbox-only' | 'none'
  liveKeysDetected?: boolean
  sandboxKeysDetected?: boolean
  isSandbox: boolean
}) {
  // Overall readiness label + color
  const readyMeta: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    'both': {
      label: 'Both modes ready',
      cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    'live-only': {
      label: 'Live keys only — sandbox will fall back to live',
      cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    'sandbox-only': {
      label: 'Sandbox keys only — live mode not ready',
      cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    'none': {
      label: 'No keys detected',
      cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
      icon: <AlertCircle className="h-3 w-3" />,
    },
  }
  const meta = readyMeta[keysReady || 'none'] || readyMeta['none']

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <KeyRound className="h-3 w-3" /> Key Detection
        </div>
        <Badge variant="outline" className={cn('text-[9px] py-0 flex items-center gap-0.5', meta.cls)}>
          {meta.icon}
          {meta.label}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {/* LIVE keys */}
        <div
          className={cn(
            'rounded-md border px-2.5 py-2 space-y-0.5',
            liveKeysDetected
              ? 'border-rose-500/30 bg-rose-500/5'
              : 'border-muted bg-muted/30'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider">
              <Radio className="h-2.5 w-2.5 text-rose-500" /> Live
            </div>
            {liveKeysDetected ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {liveKeysDetected ? 'All required keys set' : 'Required keys missing'}
          </div>
        </div>
        {/* SANDBOX keys */}
        <div
          className={cn(
            'rounded-md border px-2.5 py-2 space-y-0.5',
            sandboxKeysDetected
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-muted bg-muted/30'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider">
              <FlaskConical className="h-2.5 w-2.5 text-amber-500" /> Sandbox
            </div>
            {sandboxKeysDetected ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {sandboxKeysDetected ? 'All required keys set' : 'Required keys missing'}
          </div>
        </div>
      </div>
      {/* Active mode indicator — highlights which mode is currently in use */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="font-semibold">Active:</span>
        {isSandbox ? (
          <Badge variant="outline" className="text-[9px] py-0 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 flex items-center gap-0.5">
            <FlaskConical className="h-2.5 w-2.5" /> Sandbox mode
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[9px] py-0 bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 flex items-center gap-0.5">
            <Radio className="h-2.5 w-2.5" /> Live mode
          </Badge>
        )}
        {isSandbox && !sandboxKeysDetected && liveKeysDetected && (
          <span className="text-amber-600 dark:text-amber-400 text-[9px]">
            (falling back to live keys)
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gateway Card
// ---------------------------------------------------------------------------

function GatewayCard({
  provider,
  gateway,
  canEdit,
  onConfigure,
  onToggle,
}: {
  provider: Provider
  gateway: Gateway | undefined
  canEdit: boolean
  onConfigure: () => void
  onToggle: (field: 'isEnabled' | 'isSandbox', value: boolean) => void
}) {
  const meta = PROVIDER_META[provider]
  const enabled = gateway?.isEnabled ?? false
  const sandbox = gateway?.isSandbox ?? true
  const configuredFieldsCount = meta.fields.filter((f) => isFieldSet(gateway, f)).length
  const totalFields = meta.fields.length
  const fullyConfigured = configuredFieldsCount === totalFields

  // ── Test connection state ──────────────────────────────────────────
  // Local state — the parent doesn't need to know about it. The endpoint
  // supports being called with either the DB row id OR the provider name
  // (when no DB row exists yet), so we can always test.
  const [testing, setTesting] = React.useState(false)
  const [testPaymentOpen, setTestPaymentOpen] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{
    ok: boolean
    message: string
    latencyMs?: number
    endpoint?: string
    detail?: string
  } | null>(null)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const t = toast.loading(`Testing ${meta.displayName} connection…`)
    try {
      // Use provider name as the id when no DB row exists yet — the
      // endpoint accepts both.
      const testId = gateway?.id || provider
      const res = await fetch(`/api/payment-gateways/${testId}/test`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // 4xx/5xx means we couldn't even attempt the test (auth, 404,
        // etc.). Surface the error message directly.
        throw new Error(data?.error || `Test failed (${res.status})`)
      }
      // The endpoint always returns 200 when the test ran, with ok=true/false.
      const result = {
        ok: !!data.ok,
        message: data.message || (data.ok ? 'Connection successful' : 'Connection failed'),
        latencyMs: data.latencyMs,
        endpoint: data.endpoint,
        detail: data.detail,
      }
      setTestResult(result)
      if (result.ok) {
        toast.success(result.message, { id: t })
      } else {
        toast.error(result.message, { id: t })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Test failed'
      setTestResult({ ok: false, message: msg })
      toast.error(msg, { id: t })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ProviderAvatar provider={provider} gateway={gateway} size="md" />
            <div className="min-w-0">
              <div className="font-semibold truncate">{meta.displayName}</div>
              <div className="text-xs text-muted-foreground truncate">
                {meta.description}
              </div>
            </div>
          </div>
          <Badge variant="outline" className={cn('text-[10px] shrink-0', meta.badgeColor)}>
            {provider}
          </Badge>
        </div>

        {/* Toggles — hidden for MANUAL_TRANSFER (no sandbox concept) */}
        {provider !== 'MANUAL_TRANSFER' && (
          <div className="space-y-2.5 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Power className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <div className="text-xs font-medium">Enabled</div>
                  <div className="text-[10px] text-muted-foreground">
                    {enabled ? 'Accepts payments' : 'Inactive'}
                  </div>
                </div>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => onToggle('isEnabled', v)}
                aria-label={`Toggle ${meta.displayName} enabled`}
                disabled={!canEdit}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <div className="text-xs font-medium">Sandbox mode</div>
                  <div className="text-[10px] text-muted-foreground">
                    {sandbox ? 'Test environment' : 'Live (real charges)'}
                  </div>
                </div>
              </div>
              <Switch
                checked={sandbox}
                onCheckedChange={(v) => onToggle('isSandbox', v)}
                aria-label={`Toggle ${meta.displayName} sandbox mode`}
                disabled={!canEdit}
              />
            </div>
          </div>
        )}

        {provider === 'MANUAL_TRANSFER' && (
          <div className="space-y-2.5 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Power className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <div className="text-xs font-medium">Enabled</div>
                  <div className="text-[10px] text-muted-foreground">
                    {enabled ? 'Shows to students' : 'Hidden from students'}
                  </div>
                </div>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => onToggle('isEnabled', v)}
                aria-label={`Toggle ${meta.displayName} enabled`}
                disabled={!canEdit}
              />
            </div>
          </div>
        )}

        {/* Webhook + Callback URLs */}
        <GatewayUrlsRow provider={provider} gateway={gateway} />

        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'text-[10px]',
              enabled
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/30'
            )}
          >
            {enabled ? 'Enabled' : 'Disabled'}
          </Badge>
          {provider !== 'MANUAL_TRANSFER' && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px]',
                sandbox
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
              )}
            >
              {sandbox ? 'Sandbox' : 'Live'}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn(
              'text-[10px]',
              fullyConfigured
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {configuredFieldsCount}/{totalFields} fields set
          </Badge>
          {/* Env-source indicator — makes it explicit that secrets come
              from env vars, not the DB. */}
          <Badge
            variant="outline"
            className="text-[10px] bg-primary/5 text-primary/70 border-primary/20 flex items-center gap-0.5"
            title="Credentials are read from environment variables, not the database"
          >
            <KeyRound className="h-2.5 w-2.5" /> ENV
          </Badge>
        </div>

        {/* Key Detection panel — shows whether LIVE and/or SANDBOX env vars
            are detected for this provider. This is the "at a glance" answer
            to "can I switch this gateway to live mode without hitting a
            missing-key error?" */}
        {provider !== 'MANUAL_TRANSFER' && gateway?.credStatus && (
          <KeyDetectionPanel
            keysReady={gateway.credStatus.keysReady}
            liveKeysDetected={gateway.credStatus.liveKeysDetected}
            sandboxKeysDetected={gateway.credStatus.sandboxKeysDetected}
            isSandbox={sandbox}
          />
        )}

        {/* Test connection result — inline panel that appears after a
            test runs. Stays visible until the user runs another test or
            closes it. */}
        {testResult && (
          <div
            className={cn(
              'rounded-md border px-3 py-2 space-y-1',
              testResult.ok
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : 'bg-rose-500/5 border-rose-500/30'
            )}
          >
            <div className="flex items-start gap-2">
              {testResult.ok ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  {testResult.ok ? 'Connection successful' : 'Connection failed'}
                  {typeof testResult.latencyMs === 'number' && testResult.latencyMs > 0 && (
                    <span className="text-[10px] font-normal text-muted-foreground">
                      · {testResult.latencyMs}ms
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground break-words">
                  {testResult.message}
                </div>
                {testResult.endpoint && (
                  <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">
                    {testResult.endpoint}
                  </div>
                )}
                {testResult.detail && (
                  <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5 break-all">
                    {testResult.detail}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Dismiss test result"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[10px] text-muted-foreground">
            {gateway?.updatedAt ? (
              <span>Updated {fmtRelative(gateway.updatedAt)}</span>
            ) : (
              <span>Not configured</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleTest}
                    disabled={testing}
                    className="flex-1 sm:flex-none"
                  >
                    {testing ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {testing ? 'Testing…' : 'Test Connection'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Verify {meta.displayName} credentials by calling a lightweight
                  read-only API endpoint.
                </TooltipContent>
              </Tooltip>
            )}
            {canEdit && (
              <Button size="sm" variant="outline" onClick={onConfigure} className="flex-1 sm:flex-none">
                <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Configure
              </Button>
            )}
            {canEdit && sandbox && (
              <Button
                size="sm"
                variant="outline"
                className="text-primary border-primary/30 hover:bg-primary/5 flex-1 sm:flex-none"
                onClick={() => setTestPaymentOpen(true)}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Test Payment
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* ── Test Payment Modal ──
          Only shown when the gateway is in sandbox mode. Lets the admin
          enter an email + amount and actually initiate a test payment
          with the gateway to verify the full checkout flow works. */}
      <TestPaymentDialog
        open={testPaymentOpen}
        onOpenChange={setTestPaymentOpen}
        provider={provider}
        displayName={meta.displayName}
        gatewayId={gateway?.id || provider}
      />
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Env var reference row — used by the env-var reference table at the bottom
// of the page. Shows the env var name, with a "required" badge and an
// optional hint. The "live" cell is always shown; the "sandbox" cell shows
// the sandbox-specific env var or "—" if there's no sandbox variant.
// ---------------------------------------------------------------------------

function EnvVarRow({
  provider,
  field,
  live,
  sandbox,
  required,
  hint,
}: {
  provider: string
  field: string
  live: string
  sandbox?: string
  required?: boolean
  hint?: string
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/20">
      <td className="px-2 py-1.5 font-mono text-foreground/80 align-top whitespace-nowrap">{provider}</td>
      <td className="px-2 py-1.5 align-top">
        <span className="flex items-center gap-1">
          {field}
          {required && (
            <Badge variant="outline" className="text-[8px] py-0 px-1 bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30">
              required
            </Badge>
          )}
        </span>
        {hint && <div className="text-[10px] text-muted-foreground/80 mt-0.5">{hint}</div>}
      </td>
      <td className="px-2 py-1.5 font-mono text-[10px] align-top">
        <span className="rounded bg-muted/50 px-1 py-0.5">{live}</span>
      </td>
      <td className="px-2 py-1.5 font-mono text-[10px] align-top">
        {sandbox ? (
          <span className="rounded bg-amber-500/10 px-1 py-0.5 text-amber-700 dark:text-amber-300">{sandbox}</span>
        ) : (
          <span className="text-muted-foreground/60">— (reuses live)</span>
        )}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PaymentGateways() {
  const { mutate } = useSWRConfig()
  const { data, isLoading, error } = useSWR<GatewaysResponse>(
    '/api/payment-gateways',
    fetcher,
    { ...swrStable, refreshInterval: 60_000, revalidateOnFocus: false }
  )

  const { canManage, isViewOnly } = useRolePermissions()
  const canEdit = canManage('canManagePaymentGateways')
  const viewOnly = isViewOnly('canManagePaymentGateways', 'canViewPaymentGateways')

  const gateways = data?.gateways ?? []

  const gatewaysByProvider = React.useMemo(() => {
    const map: Partial<Record<Provider, Gateway>> = {}
    for (const g of gateways) {
      if ((ALL_PROVIDERS as string[]).includes(g.provider)) {
        map[g.provider as Provider] = g
      }
    }
    return map
  }, [gateways])

  const [configProvider, setConfigProvider] = React.useState<Provider | null>(null)
  const [configOpen, setConfigOpen] = React.useState(false)

  // ── "Test All" bulk action state ────────────────────────────────────
  // Runs Test Connection on every gateway in parallel, then shows a
  // summary dialog with pass/fail counts and per-gateway results.
  const [testAllOpen, setTestAllOpen] = React.useState(false)
  const [testAllRunning, setTestAllRunning] = React.useState(false)
  const [testAllResults, setTestAllResults] = React.useState<
    Record<string, { ok: boolean; message: string; latencyMs?: number; testing?: boolean }>
  >({})

  const handleTestAll = React.useCallback(async () => {
    setTestAllOpen(true)
    setTestAllRunning(true)
    // Reset all to "testing" state
    const initial: Record<string, { ok: boolean; message: string; testing: boolean }> = {}
    for (const p of ALL_PROVIDERS) {
      initial[p] = { ok: false, message: '', testing: true }
    }
    setTestAllResults(initial)

    const t = toast.loading('Testing all gateway connections…')

    // Fire all tests in parallel. Each updates its own slot in the results
    // map as soon as it resolves, so the UI fills in progressively.
    await Promise.all(
      ALL_PROVIDERS.map(async (p) => {
        const gw = gatewaysByProvider[p]
        const testId = gw?.id || p
        try {
          const res = await fetch(`/api/payment-gateways/${testId}/test`, {
            method: 'POST',
            credentials: 'include',
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            throw new Error(data?.error || `Test failed (${res.status})`)
          }
          setTestAllResults((prev) => ({
            ...prev,
            [p]: {
              ok: !!data.ok,
              message: data.message || (data.ok ? 'Connection successful' : 'Connection failed'),
              latencyMs: data.latencyMs,
              testing: false,
            },
          }))
        } catch (e) {
          setTestAllResults((prev) => ({
            ...prev,
            [p]: {
              ok: false,
              message: e instanceof Error ? e.message : 'Test failed',
              testing: false,
            },
          }))
        }
      })
    )

    setTestAllRunning(false)
    toast.success('All gateway tests completed', { id: t })
  }, [gatewaysByProvider])

  const anySandboxLive = Object.values(gatewaysByProvider).some(
    (g) => g?.isEnabled && g?.isSandbox
  )
  const anyLiveMode = Object.values(gatewaysByProvider).some(
    (g) => g?.isEnabled && g?.isSandbox === false
  )

  const stats = React.useMemo(() => {
    const all = ALL_PROVIDERS.map((p) => gatewaysByProvider[p]).filter(Boolean) as Gateway[]
    return {
      total: ALL_PROVIDERS.length,
      enabled: all.filter((g) => g.isEnabled).length,
      sandbox: all.filter((g) => g.isEnabled && g.isSandbox).length,
      live: all.filter((g) => g.isEnabled && !g.isSandbox).length,
    }
  }, [gatewaysByProvider])

  const refresh = React.useCallback(() => {
    mutate('/api/payment-gateways')
    mutate('/api/dashboard')
  }, [mutate])

  const handleToggle = React.useCallback(
    async (
      provider: Provider,
      gateway: Gateway | undefined,
      field: 'isEnabled' | 'isSandbox',
      value: boolean
    ) => {
      const meta = PROVIDER_META[provider]
      const t = toast.loading(`Updating ${meta.displayName}…`)
      try {
        if (gateway) {
          // PATCH only the changed field — preserves existing secrets
          const res = await fetch(`/api/payment-gateways/${gateway.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: value }),
          })
          if (!res.ok) {
            const b = await res.json().catch(() => ({}))
            throw new Error(b?.error || `Failed (${res.status})`)
          }
        } else {
          // Create new gateway with just the toggle
          const res = await fetch('/api/payment-gateways', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider,
              displayName: meta.displayName,
              isEnabled: field === 'isEnabled' ? value : false,
              isSandbox: field === 'isSandbox' ? value : true,
            }),
          })
          if (!res.ok) {
            const b = await res.json().catch(() => ({}))
            throw new Error(b?.error || `Failed (${res.status})`)
          }
        }
        await mutate('/api/payment-gateways')
        await mutate('/api/dashboard')
        const verb = field === 'isEnabled' ? (value ? 'enabled' : 'disabled') : value ? 'set to sandbox' : 'set to live'
        toast.success(`${meta.displayName} ${verb}`, { id: t })
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Failed to update', { id: t })
      }
    },
    [mutate]
  )

  const handleConfigure = (provider: Provider) => {
    setConfigProvider(provider)
    setConfigOpen(true)
  }

  // ---- Loading skeleton ----
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Payment Gateways"
          description="Configure Paystack, Opay, Flutterwave, Remita, Kora, Zainpay, and Manual Transfer."
        />
        <Skeleton className="h-14 rounded-xl" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Payment Gateways" />
        <EmptyState
          icon={AlertCircle}
          title="Failed to load payment gateways"
          description={error.message || 'Please try again.'}
          action={
            <Button onClick={() => refresh()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-1.5" /> Retry
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Gateways"
        description="Configure Paystack, Opay, Flutterwave, Remita, Kora, Zainpay, and Manual Transfer."
        actions={
          <div className="flex items-center gap-2">
            {canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleTestAll}
                    disabled={testAllRunning}
                  >
                    {testAllRunning ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-1.5" />
                    )}
                    {testAllRunning ? 'Testing…' : 'Test All'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Run Test Connection on all 7 gateways in parallel and show a summary.
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => refresh()}>
                  <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reload gateway configs</TooltipContent>
            </Tooltip>
          </div>
        }
      />

      {viewOnly && (
        <div className="rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span>You have view-only access. Enabling, disabling, and configuring gateways is disabled.</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Gateways"
          value={stats.total}
          icon={CreditCard}
          hint="Supported providers"
          accent="primary"
        />
        <StatCard
          label="Enabled"
          value={stats.enabled}
          icon={CheckCircle2}
          hint="Accepting payments"
          accent="primary"
        />
        <StatCard
          label="Sandbox"
          value={stats.sandbox}
          icon={FlaskConical}
          hint="Test environment"
          accent="amber"
        />
        <StatCard
          label="Live"
          value={stats.live}
          icon={Radio}
          hint="Real charges"
          accent="destructive"
        />
      </div>

      {/* Sandbox notice */}
      {anySandboxLive ? (
        <Alert>
          <FlaskConical className="h-4 w-4" />
          <AlertTitle>Sandbox mode is ON</AlertTitle>
          <AlertDescription>
            At least one enabled gateway is in sandbox mode. No real payments will
            be processed through it. Toggle off sandbox mode in the gateway card to
            go live.
          </AlertDescription>
        </Alert>
      ) : anyLiveMode ? (
        <Alert variant="destructive">
          <Radio className="h-4 w-4" />
          <AlertTitle>LIVE MODE ACTIVE</AlertTitle>
          <AlertDescription>
            One or more gateways are running in <strong>live</strong> mode. Real
            charges will be processed. Double-check your API keys before accepting
            student payments.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Power className="h-4 w-4" />
          <AlertTitle>No gateways enabled</AlertTitle>
          <AlertDescription>
            Enable at least one payment gateway below to start accepting hostel fee
            payments from students.
          </AlertDescription>
        </Alert>
      )}

      {/* Env-only credentials banner */}
      <Alert>
        <KeyRound className="h-4 w-4" />
        <AlertTitle>Credentials come from environment variables</AlertTitle>
        <AlertDescription>
          For security, payment-gateway secret / public / API / webhook keys are read <strong>exclusively</strong> from <code className="font-mono">process.env</code> — they are not stored in the database. Set <code className="font-mono">{`{PROVIDER}_TEST_*`}</code> vars for sandbox mode and <code className="font-mono">{`{PROVIDER}_*`}</code> vars for live mode. Use <strong>Test Connection</strong> on each card to verify the env vars are detected and the keys are valid. The full env-var reference is at the bottom of this page.
        </AlertDescription>
      </Alert>

      {/* Gateway cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {ALL_PROVIDERS.map((provider) => (
          <GatewayCard
            key={provider}
            provider={provider}
            gateway={gatewaysByProvider[provider]}
            canEdit={canEdit}
            onConfigure={() => handleConfigure(provider)}
            onToggle={(field, value) =>
              handleToggle(provider, gatewaysByProvider[provider], field, value)
            }
          />
        ))}
      </div>

      {/* Webhook & callback note */}
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
          <div className="flex items-center gap-1.5 font-medium text-foreground text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" /> Webhook &amp; Callback URLs
          </div>
          <p>
            Each provider card above shows <strong>two URLs</strong> with copy
            buttons:
          </p>
          <ul className="space-y-1 pl-1">
            <li className="flex items-start gap-1.5">
              <Webhook className="h-3.5 w-3.5 mt-0.5 shrink-0 text-foreground/70" />
              <span>
                <strong className="text-foreground">Webhook URL</strong> — set
                this in your provider&apos;s dashboard to receive server-to-server
                payment notifications. All providers share a single endpoint with
                the provider passed as a query param, e.g.:
                <span className="block mt-1 rounded-md border bg-muted/30 px-2 py-1.5 font-mono text-[11px]">
                  {buildWebhookUrl('PAYSTACK')}
                </span>
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <Link2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-foreground/70" />
              <span>
                <strong className="text-foreground">Callback URL</strong> — the
                browser redirect target after a student completes payment on the
                provider&apos;s hosted checkout. Shared by every provider:
                <span className="block mt-1 rounded-md border bg-muted/30 px-2 py-1.5 font-mono text-[11px]">
                  {buildCallbackUrl()}
                </span>
              </span>
            </li>
          </ul>
          <p className="pt-1">
            Set the Webhook URL in your provider&apos;s dashboard to receive
            payment notifications. The Callback URL is where users are redirected
            after payment.
          </p>
          <div className="border-t pt-2 mt-2 space-y-0.5">
            <div className="font-medium text-foreground/90 text-[11px] mb-1">
              Expected webhook signature headers per provider:
            </div>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>Paystack — header <code className="font-mono">x-paystack-signature</code> (HMAC-SHA512)</li>
              <li>Flutterwave — header <code className="font-mono">verif-hash</code></li>
              <li>OPay — header <code className="font-mono">x-opay-signature</code> (SHA-512)</li>
              <li>Remita — header <code className="font-mono">x-remita-signature</code> (SHA-512)</li>
              <li>Kora — header <code className="font-mono">x-korapay-signature</code> (HMAC-SHA512)</li>
              <li>Zainpay — header <code className="font-mono">Zainpay-Signature</code> (HmacSHA256)</li>
            </ul>
          </div>
          <div className="flex items-center gap-1.5 pt-2 text-foreground text-sm">
            <Building2 className="h-4 w-4 text-primary" /> Manual Transfer
          </div>
          <p>
            Manual Transfer does not use a webhook — payments are confirmed by the
            bursar from the receipt the student uploads.
          </p>
        </CardContent>
      </Card>

      {/* ── Bursary / Authorization Code toggle ────────────────────────── */}
      <BursaryCodeToggleCard />

      {/* Env var reference card — shows the exact env var names the
          backend reads for each provider, in both live and sandbox mode.
          This is the single source of truth for admins setting up env. */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-1.5 font-medium text-foreground text-sm">
            <KeyRound className="h-4 w-4 text-primary" /> Environment Variable Reference
          </div>
          <p className="text-xs text-muted-foreground">
            These are the exact <code className="font-mono">process.env</code> names the backend reads for each provider. Sandbox vars are used when <strong>Sandbox mode</strong> is ON; if a sandbox var is not set, the live var is reused as a fallback (so local dev with only live vars still works in sandbox mode).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-2 py-1.5 font-semibold text-foreground">Provider</th>
                  <th className="px-2 py-1.5 font-semibold text-foreground">Field</th>
                  <th className="px-2 py-1.5 font-semibold text-foreground">Live env var</th>
                  <th className="px-2 py-1.5 font-semibold text-foreground">Sandbox env var</th>
                </tr>
              </thead>
              <tbody>
                <EnvVarRow provider="PAYSTACK" field="Public Key" live="PAYSTACK_PUBLIC_KEY" sandbox="PAYSTACK_TEST_PUBLIC_KEY" />
                <EnvVarRow provider="PAYSTACK" field="Secret Key" live="PAYSTACK_SECRET_KEY" sandbox="PAYSTACK_TEST_SECRET_KEY" required />
                <EnvVarRow provider="PAYSTACK" field="Webhook Secret" live="PAYSTACK_WEBHOOK_SECRET" />
                <EnvVarRow provider="FLUTTERWAVE" field="Public Key" live="FLUTTERWAVE_PUBLIC_KEY" sandbox="FLUTTERWAVE_TEST_PUBLIC_KEY" />
                <EnvVarRow provider="FLUTTERWAVE" field="Secret Key" live="FLUTTERWAVE_SECRET_KEY" sandbox="FLUTTERWAVE_TEST_SECRET_KEY" required />
                <EnvVarRow provider="FLUTTERWAVE" field="Encryption Key" live="FLUTTERWAVE_ENCRYPTION_KEY" sandbox="FLUTTERWAVE_TEST_ENCRYPTION_KEY" />
                <EnvVarRow provider="FLUTTERWAVE" field="Webhook Hash" live="FLUTTERWAVE_WEBHOOK_SECRET" />
                <EnvVarRow provider="OPAY" field="Public Key" live="OPAY_PUBLIC_KEY" sandbox="OPAY_TEST_PUBLIC_KEY" required />
                <EnvVarRow provider="OPAY" field="Secret Key" live="OPAY_SECRET_KEY" sandbox="OPAY_TEST_SECRET_KEY" required />
                <EnvVarRow provider="OPAY" field="Merchant ID" live="OPAY_MERCHANT_ID" sandbox="OPAY_TEST_MERCHANT_ID" required />
                <EnvVarRow provider="OPAY" field="Webhook Secret" live="OPAY_SECRET_KEY" sandbox="OPAY_TEST_SECRET_KEY" hint="OPay uses the Secret Key (HMAC-SHA3-512) to sign webhook callbacks — no separate webhook secret exists." />
                <EnvVarRow provider="REMITA" field="Merchant ID" live="REMITA_MERCHANT_ID" required />
                <EnvVarRow provider="REMITA" field="API Key" live="REMITA_API_KEY" sandbox="REMITA_TEST_API_KEY" required />
                <EnvVarRow provider="REMITA" field="Webhook Secret" live="REMITA_WEBHOOK_SECRET" sandbox="REMITA_TEST_WEBHOOK_SECRET" />
                <EnvVarRow provider="KORA" field="Public Key" live="KORA_PUBLIC_KEY" sandbox="KORA_TEST_PUBLIC_KEY" />
                <EnvVarRow provider="KORA" field="Secret Key" live="KORA_SECRET_KEY" sandbox="KORA_TEST_SECRET_KEY" required />
                <EnvVarRow provider="KORA" field="Webhook Secret" live="KORA_WEBHOOK_SECRET" />
                <EnvVarRow provider="ZAINPAY" field="Public Key" live="ZAINPAY_PUBLIC_KEY" sandbox="ZAINPAY_TEST_PUBLIC_KEY" />
                <EnvVarRow provider="ZAINPAY" field="Private Key" live="ZAINPAY_SECRET_KEY" sandbox="ZAINPAY_TEST_SECRET_KEY" required />
                <EnvVarRow provider="ZAINPAY" field="Webhook Secret" live="ZAINPAY_WEBHOOK_SECRET" />
                <EnvVarRow provider="ZAINPAY" field="Zainbox Code" live="ZAINPAY_ZAINBOX_CODE" hint="Configurable in the gateway dialog too — DB takes priority over env." />
                <EnvVarRow provider="MANUAL_TRANSFER" field="Bank details" live="(gateway dialog)" hint="Bank name / account number / account name are set in the gateway dialog — stored in the DB config blob, not env vars." />
              </tbody>
            </table>
          </div>
          <Alert className="py-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            <AlertTitle className="text-xs">Why env-only?</AlertTitle>
            <AlertDescription className="text-[11px]">
              Secrets in the database are an attack surface — DB backups, audit logs,
              and Prisma Studio all expose them. Env vars are visible only to the
              runtime, never serialized into backups, and rotating a key is a redeploy
              instead of a migration. The <code className="font-mono">PaymentGateway</code> DB table still exists for
              non-secret metadata (display name, enabled/sandbox toggles, logo,
              config blob) but the <code className="font-mono">secretKey</code> / <code className="font-mono">publicKey</code> / <code className="font-mono">apiKey</code> / <code className="font-mono">webhookSecret</code> columns are deprecated and ignored at runtime.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Config dialog */}
      <GatewayConfigDialog
        provider={configProvider}
        gateway={configProvider ? gatewaysByProvider[configProvider] : undefined}
        open={configOpen}
        onOpenChange={setConfigOpen}
        onSaved={async () => {
          await mutate('/api/payment-gateways')
          await mutate('/api/dashboard')
        }}
      />

      {/* Test All summary dialog — shows pass/fail counts + per-gateway
          results after the bulk Test All action runs. */}
      <Dialog open={testAllOpen} onOpenChange={(v) => !testAllRunning && setTestAllOpen(v)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Test All Gateways
            </DialogTitle>
            <DialogDescription>
              {testAllRunning
                ? 'Running connection tests on all 7 gateways in parallel…'
                : 'Connection test results for all configured gateways.'}
            </DialogDescription>
          </DialogHeader>

          {/* Summary stats */}
          {(() => {
            const results = Object.values(testAllResults)
            const completed = results.filter((r) => !r.testing)
            const passed = completed.filter((r) => r.ok).length
            const failed = completed.filter((r) => !r.ok).length
            const testing = results.filter((r) => r.testing).length
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/30 p-2.5 text-center">
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{passed}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Passed</div>
                </div>
                <div className="rounded-lg border bg-rose-500/5 border-rose-500/30 p-2.5 text-center">
                  <div className="text-xl font-bold text-rose-600 dark:text-rose-400">{failed}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">Failed</div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
                  <div className="text-xl font-bold text-muted-foreground">{testing}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Testing</div>
                </div>
              </div>
            )
          })()}

          {/* Per-gateway results */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {ALL_PROVIDERS.map((p) => {
              const meta = PROVIDER_META[p]
              const result = testAllResults[p]
              const gw = gatewaysByProvider[p]
              return (
                <div
                  key={p}
                  className={cn(
                    'rounded-md border px-3 py-2 flex items-center gap-2.5',
                    !result || result.testing
                      ? 'border-muted bg-muted/20'
                      : result.ok
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-rose-500/30 bg-rose-500/5'
                  )}
                >
                  <ProviderAvatar provider={p} gateway={gw} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{meta.displayName}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {!result || result.testing ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Testing…
                        </span>
                      ) : (
                        <>
                          {result.message}
                          {typeof result.latencyMs === 'number' && result.latencyMs > 0 && (
                            <span className="text-muted-foreground/70"> · {result.latencyMs}ms</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {result && !result.testing && (
                    result.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    )
                  )}
                </div>
              )
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTestAllOpen(false)}
              disabled={testAllRunning}
            >
              Close
            </Button>
            {!testAllRunning && (
              <Button onClick={handleTestAll} disabled={testAllRunning}>
                <RefreshCw className="h-4 w-4 mr-1.5" /> Re-run All
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Test Payment Dialog — lets the admin initiate a REAL test payment
// with the gateway (in sandbox mode) to verify the full checkout flow.
// NOT logged in our DB — purely a connection/flow test.
// ---------------------------------------------------------------------------

function TestPaymentDialog({
  open,
  onOpenChange,
  provider,
  displayName,
  gatewayId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  provider: string
  displayName: string
  gatewayId: string
}) {
  const [email, setEmail] = React.useState('')
  const [amount, setAmount] = React.useState('500')
  const [testing, setTesting] = React.useState(false)
  const [result, setResult] = React.useState<{
    ok: boolean
    message: string
    checkoutUrl?: string | null
    reference?: string
  } | null>(null)

  async function handleTestPayment() {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email')
      return
    }
    setTesting(true)
    setResult(null)
    const t = toast.loading(`Initiating test payment via ${displayName}…`)
    try {
      const res = await fetch(`/api/payment-gateways/${gatewayId}/test-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), amount: Number(amount) || 500 }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Test payment failed')
      }
      setResult(data)
      if (data.ok && data.checkoutUrl) {
        toast.success('Test payment initiated! Opening checkout…', { id: t })
        window.open(data.checkoutUrl, '_blank')
      } else if (data.ok && !data.checkoutUrl) {
        toast.success(data.message || 'Test payment verified', { id: t })
      } else {
        toast.error(data.message || 'Test payment failed', { id: t })
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Network error', { id: t })
      setResult({ ok: false, message: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setResult(null); setEmail(''); setAmount('500') } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Test Payment — {displayName}
          </DialogTitle>
          <DialogDescription>
            Initiate a real test payment in sandbox mode to verify the full checkout flow.
            This is NOT logged in the system — purely a connection test.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-600">SANDBOX</Badge>
            <span>This will create a real test transaction on {displayName}'s sandbox. No real charges.</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold">Test Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={testing}
            />
            <p className="text-[10px] text-muted-foreground">The gateway will use this as the customer email.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold">Test Amount (NGN)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="100"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={testing}
            />
            <p className="text-[10px] text-muted-foreground">Minimum ₦100. No upper limit. Test only — no real charges.</p>
          </div>

          {result && (
            <div className={`rounded-lg border p-3 text-xs ${
              result.ok
                ? 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                : 'border-red-500/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {result.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span className="font-semibold">{result.ok ? 'Success' : 'Failed'}</span>
              </div>
              <p>{result.message}</p>
              {result.reference && (
                <p className="mt-1 text-[10px] font-mono opacity-70">Ref: {result.reference}</p>
              )}
              {result.checkoutUrl && (
                <a href={result.checkoutUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-primary hover:underline">
                  Open checkout page <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={testing}>
            Close
          </Button>
          <Button onClick={handleTestPayment} disabled={testing || !email.trim()}>
            {testing ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Testing…</>
            ) : (
              <><CreditCard className="h-4 w-4 mr-1.5" /> Initiate Test Payment</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Bursary / Authorization Code toggle card
// ---------------------------------------------------------------------------

function BursaryCodeToggleCard() {
  const { mutate } = useSWRConfig()
  const [enabled, setEnabled] = React.useState<boolean | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    fetch('/api/settings?category=GENERAL', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const val = data?.settings?.GENERAL?.auth_code_payment_enabled
        setEnabled(val === undefined || val === '' ? true : val === 'true')
      })
      .catch(() => { if (!cancelled) setEnabled(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleToggle = async (value: boolean) => {
    setEnabled(value)
    setSaving(true)
    const t = toast.loading(value ? 'Enabling bursary code payment…' : 'Disabling bursary code payment…')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key: 'auth_code_payment_enabled', value: String(value), category: 'GENERAL' }),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast.success(value ? 'Bursary code payment enabled' : 'Bursary code payment disabled', { id: t })
      mutate('/api/settings')
    } catch {
      toast.error('Failed to update', { id: t })
      setEnabled(!value)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0">
              <Ticket className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold">Bursary / Authorization Code</h3>
                {!loading && (
                  <Badge variant="outline" className={cn('text-[9px]', enabled ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' : 'bg-muted text-muted-foreground')}>
                    {enabled ? <><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Enabled</> : <><XCircle className="h-2.5 w-2.5 mr-0.5" /> Disabled</>}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Allow students to pay with bursary-issued authorization codes. When enabled, the checkout page shows a &ldquo;Pay with authorization code&rdquo; option — even if no payment gateways are configured. Disable to hide the option entirely.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
              <Switch checked={enabled ?? false} onCheckedChange={handleToggle} disabled={saving} aria-label="Toggle bursary code payment" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
