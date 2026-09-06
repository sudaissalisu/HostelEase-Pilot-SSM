'use client'

import * as React from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { swrStable } from '@/lib/swr-config'
import { toast } from 'sonner'
import {
  Image as ImageIcon,
  Save,
  Upload,
  GraduationCap,
  Building2,
  CheckCircle2,
  CircleAlert,
  RefreshCw,
  Loader2,
  School,
  Palette,
  Type,
  Fingerprint,
  Smartphone,
  Eye,
} from 'lucide-react'

import { PageHeader, EmptyState } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ImageCropper } from '@/components/shared/image-cropper'
import { useRolePermissions } from '@/lib/use-role-permissions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BrandingResponse {
  branding: {
    school_name: string
    school_code: string
    school_logo_url: string
    favicon_url: string
    pwa_icon_url: string
    tagline: string
    institution_full_name: string
    institution_short_name: string
    school_address: string
    school_domain: string
    school_email: string
    school_phone: string
  }
}

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: 'include' })
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error(body?.error || `Request failed: ${r.status}`)
  }
  return r.json()
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function BrandingManager() {
  const { mutate } = useSWRConfig()
  const { data, isLoading, error } = useSWR<BrandingResponse>('/api/branding', fetcher, swrStable)

  const { canManage, isViewOnly } = useRolePermissions()
  const canEdit = canManage('canManageBranding')
  const viewOnly = isViewOnly('canManageBranding', 'canViewBranding')

  const [form, setForm] = React.useState({
    school_name: '',
    school_code: '',
    school_logo_url: '',
    favicon_url: '',
    pwa_icon_url: '',
    tagline: '',
    institution_full_name: '',
    institution_short_name: '',
    school_address: '',
    school_domain: '',
    school_email: '',
    school_phone: '',
  })
  const [saving, setSaving] = React.useState(false)
  const [uploadingLogo, setUploadingLogo] = React.useState(false)
  const [uploadingFavicon, setUploadingFavicon] = React.useState(false)
  const [uploadingPwaIcon, setUploadingPwaIcon] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)
  const [cropFile, setCropFile] = React.useState<File | null>(null)
  const [cropKind, setCropKind] = React.useState<'logo' | 'favicon' | 'pwa'>('logo')

  const logoInputRef = React.useRef<HTMLInputElement>(null)
  const faviconInputRef = React.useRef<HTMLInputElement>(null)
  const pwaIconInputRef = React.useRef<HTMLInputElement>(null)

  // Hydrate form once data loads — only on the very first load (when the
  // form is still in its initial empty state). We use a ref to ensure this
  // only runs once per data-load, NOT after every mutate() call (which
  // would overwrite the user's unsaved edits).
  const hydratedRef = React.useRef(false)
  React.useEffect(() => {
    if (data?.branding && !hydratedRef.current) {
      hydratedRef.current = true
      setForm({
        school_name: data.branding.school_name || '',
        school_code: data.branding.school_code || '',
        school_logo_url: data.branding.school_logo_url || '',
        favicon_url: data.branding.favicon_url || '',
        pwa_icon_url: data.branding.pwa_icon_url || '',
        tagline: data.branding.tagline || '',
        institution_full_name: data.branding.institution_full_name || '',
        institution_short_name: data.branding.institution_short_name || '',
        school_address: data.branding.school_address || '',
        school_domain: data.branding.school_domain || '',
        school_email: data.branding.school_email || '',
        school_phone: data.branding.school_phone || '',
      })
      setDirty(false)
    }
  }, [data])

  // Re-hydrate when the SWR cache key changes (e.g. after a manual
  // mutate with new data from the server) — but only if the form is
  // NOT dirty (no unsaved changes).
  React.useEffect(() => {
    if (data?.branding && !dirty) {
      setForm({
        school_name: data.branding.school_name || '',
        school_code: data.branding.school_code || '',
        school_logo_url: data.branding.school_logo_url || '',
        favicon_url: data.branding.favicon_url || '',
        pwa_icon_url: data.branding.pwa_icon_url || '',
        tagline: data.branding.tagline || '',
        institution_full_name: data.branding.institution_full_name || '',
        institution_short_name: data.branding.institution_short_name || '',
        school_address: data.branding.school_address || '',
        school_domain: data.branding.school_domain || '',
        school_email: data.branding.school_email || '',
        school_phone: data.branding.school_phone || '',
      })
    }
  }, [data, dirty])

  const update = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setDirty(true)
  }

  async function uploadFile(file: File, kind: 'logo' | 'favicon' | 'pwa') {
    const setUploader = kind === 'logo' ? setUploadingLogo : kind === 'favicon' ? setUploadingFavicon : setUploadingPwaIcon
    setUploader(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body?.error || 'Upload failed')
      const url: string = body.url
      if (kind === 'logo') {
        update('school_logo_url', url)
      } else if (kind === 'favicon') {
        update('favicon_url', url)
      } else {
        update('pwa_icon_url', url)
      }
      const label = kind === 'logo' ? 'Logo' : kind === 'favicon' ? 'Favicon' : 'PWA icon'
      toast.success(`${label} uploaded. Click Save Branding to apply.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploader(false)
    }
  }

  async function uploadCropped(dataUrl: string, kind: 'logo' | 'favicon' | 'pwa') {
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const croppedFile = new File([blob], `${kind}.png`, { type: 'image/png' })
      await uploadFile(croppedFile, kind)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Crop upload failed')
    }
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>, kind: 'logo' | 'favicon' | 'pwa') {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    setCropKind(kind)
    setCropFile(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  async function handleSave() {
    setSaving(true)
    try {
      const r = await fetch('/api/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      })
      const body = await r.json()
      if (!r.ok) throw new Error(body?.error || 'Failed to save branding')
      toast.success('Branding saved')
      setDirty(false)
      mutate('/api/branding')
      // Branding is used by many places — revalidate the dashboard too
      mutate('/api/dashboard')
      mutate('/api/settings')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save branding')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="School Branding"
          description="Configure your institution's logo, name, and favicon."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="School Branding" />
        <EmptyState
          icon={CircleAlert}
          title="Failed to load branding"
          description={error.message || 'Please try again.'}
          action={
            <Button onClick={() => mutate('/api/branding')} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-1.5" /> Retry
            </Button>
          }
        />
      </div>
    )
  }

  const branding = data?.branding

  return (
    <div className="space-y-6">
      <PageHeader
        title="School Branding"
        description="Configure your institution's logo, name, and favicon."
        actions={
          <>
            {dirty && (
              <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
                Unsaved changes
              </Badge>
            )}
            {canEdit && (
              <Button onClick={handleSave} disabled={saving || !dirty} size="sm">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1.5" /> Save Branding
                  </>
                )}
              </Button>
            )}
          </>
        }
      />

      {viewOnly && (
        <div className="rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span>You have view-only access. Editing is disabled.</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left — form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <School className="h-4 w-4" /> Institution Identity
              </CardTitle>
              <CardDescription>The name and code displayed across the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">School Name (legacy / fallback)</Label>
                <Input
                  value={form.school_name}
                  onChange={(e) => update('school_name', e.target.value)}
                  placeholder="e.g. Ahmadu Bello University"
                  disabled={!canEdit}
                />
                <p className="text-[10px] text-muted-foreground">
                  Used as a fallback when Full Name or Short Name aren't set. Email templates, QR verify page.
                </p>
              </div>

              {/* ── Full Name vs Short Name ──
                  Full Name is shown on desktop headers + all PDFs (invoice,
                  letter, card). Short Name is shown on mobile headers for
                  compact display. If Short Name is blank, the system auto-
                  derives initials from the Full Name (e.g. "Adeleke
                  University Student Union" → "AUSU"). */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Institution Full Name</Label>
                  <Input
                    value={form.institution_full_name}
                    onChange={(e) => update('institution_full_name', e.target.value)}
                    placeholder="e.g. Adeleke University Student Union"
                    disabled={!canEdit}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Desktop sidebar header, invoice/letter/card PDFs, formal documents.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Institution Short Name / Abbreviation</Label>
                  <Input
                    value={form.institution_short_name}
                    onChange={(e) => update('institution_short_name', e.target.value.toUpperCase())}
                    placeholder="e.g. AUSU"
                    className="uppercase font-mono"
                    disabled={!canEdit}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Mobile sidebar header, compact views, footer. Auto-derived from Full Name if blank.
                  </p>
                </div>
              </div>

              {/* ── Contact details for invoice header ── */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">School Address</Label>
                <Input
                  value={form.school_address}
                  onChange={(e) => update('school_address', e.target.value)}
                  placeholder="e.g. Km 8, Ife-Ibadan Road, Ede, Osun State"
                  disabled={!canEdit}
                />
                <p className="text-[10px] text-muted-foreground">
                  Shown in the invoice PDF header (right side, under the name).
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Website Domain</Label>
                  <Input
                    value={form.school_domain}
                    onChange={(e) => update('school_domain', e.target.value)}
                    placeholder="e.g. ausu.edu.ng"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Contact Email</Label>
                  <Input
                    value={form.school_email}
                    onChange={(e) => update('school_email', e.target.value)}
                    placeholder="e.g. studentaffairs@ausu.edu.ng"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Contact Phone</Label>
                  <Input
                    value={form.school_phone}
                    onChange={(e) => update('school_phone', e.target.value)}
                    placeholder="e.g. +234 800 000 0000"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">School Code</Label>
                  <Input
                    value={form.school_code}
                    onChange={(e) => update('school_code', e.target.value)}
                    placeholder="e.g. ABU"
                    className="uppercase font-mono"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tagline</Label>
                  <Input
                    value={form.tagline}
                    onChange={(e) => update('tagline', e.target.value)}
                    placeholder="e.g. Knowledge · Integrity · Service"
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo upload */}
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="h-4 w-4" /> Logo
                </CardTitle>
                <CardDescription>
                  Square PNG or JPG, ideally 512×512. Used in the sidebar header, QR codes, and allocation letters.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UploadZone
                  imageUrl={form.school_logo_url}
                  uploading={uploadingLogo}
                  onPick={() => logoInputRef.current?.click()}
                  onClear={() => update('school_logo_url', '')}
                  fallback={<GraduationCap className="h-8 w-8" />}
                  label="Logo"
                />
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => onFileSelected(e, 'logo')}
                />
              </CardContent>
            </Card>
          )}

          {/* Favicon upload */}
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Fingerprint className="h-4 w-4" /> Favicon
                </CardTitle>
                <CardDescription>
                  Small icon (16×16 or 32×32, PNG/ICO) shown in browser tabs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UploadZone
                  imageUrl={form.favicon_url}
                  uploading={uploadingFavicon}
                  onPick={() => faviconInputRef.current?.click()}
                  onClear={() => update('favicon_url', '')}
                  fallback={<Fingerprint className="h-6 w-6" />}
                  label="Favicon"
                  size="sm"
                />
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/png,image/x-icon,image/webp"
                  className="hidden"
                  onChange={(e) => onFileSelected(e, 'favicon')}
                />
              </CardContent>
            </Card>
          )}

          {/* PWA App Icon upload */}
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Smartphone className="h-4 w-4" /> PWA App Icon
                </CardTitle>
                <CardDescription>
                  High-resolution icon (512×512 PNG recommended) used when the app is installed on a phone or desktop home screen. Also used for the splash screen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UploadZone
                  imageUrl={form.pwa_icon_url}
                  uploading={uploadingPwaIcon}
                  onPick={() => pwaIconInputRef.current?.click()}
                  onClear={() => update('pwa_icon_url', '')}
                  fallback={<GraduationCap className="h-8 w-8" />}
                  label="PWA Icon"
                />
                <input
                  ref={pwaIconInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => onFileSelected(e, 'pwa')}
                />
                <p className="text-[10px] text-muted-foreground mt-2">
                  If not set, the school logo is used as a fallback for the PWA manifest icon.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right — live preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" /> Live Preview
              </CardTitle>
              <CardDescription>How branding appears in different places.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Sidebar preview */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Sidebar Header
                </div>
                <div className="rounded-lg border bg-sidebar p-3 flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center shadow-md shadow-primary/30 overflow-hidden shrink-0">
                    {form.school_logo_url ? (
                       
                      <img
                        src={form.school_logo_url}
                        alt="School logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm leading-tight truncate">
                      {form.school_name || 'University Portal'}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {form.tagline || 'University Allocation System'}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Auth screen preview */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Login Screen
                </div>
                <div className="rounded-lg border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-xl shadow-primary/30 overflow-hidden mb-3">
                    {form.school_logo_url ? (
                       
                      <img
                        src={form.school_logo_url}
                        alt="School logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <GraduationCap className="h-7 w-7" />
                    )}
                  </div>
                  <div className="font-bold text-base">
                    {form.school_name || 'University Portal'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {form.tagline || 'Official University Portal'}
                  </div>
                  {form.school_code && (
                    <Badge variant="outline" className="mt-2 text-[10px] font-mono">
                      {form.school_code}
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* QR code preview */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  QR Code Center
                </div>
                <div className="rounded-lg border p-4 flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-white border-2 border-primary grid place-items-center overflow-hidden">
                    {form.school_logo_url ? (
                       
                      <img
                        src={form.school_logo_url}
                        alt="School logo"
                        className="h-12 w-12 object-contain"
                      />
                    ) : (
                      <GraduationCap className="h-8 w-8 text-primary" />
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                  The logo is embedded in the centre of every allocation QR code.
                </p>
              </div>

              <Separator />

              {/* Usage list */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Branding is used in
                </div>
                <ul className="space-y-1.5 text-xs">
                  {[
                    { icon: Building2, label: 'Sidebar header' },
                    { icon: GraduationCap, label: 'Auth / login screen' },
                    { icon: ImageIcon, label: 'Allocation QR codes' },
                    { icon: Type, label: 'Email templates' },
                    { icon: Type, label: 'Allocation letters (PDF)' },
                    { icon: Fingerprint, label: 'Public QR verify page' },
                  ].map((item) => (
                    <li key={item.label} className="flex items-center gap-2 text-muted-foreground">
                      <item.icon className="h-3.5 w-3.5 text-primary" />
                      <span>{item.label}</span>
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 ml-auto" />
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {cropFile && (
        <ImageCropper
          file={cropFile}
          onCrop={(dataUrl) => {
            uploadCropped(dataUrl, cropKind)
            setCropFile(null)
          }}
          onCancel={() => setCropFile(null)}
          title={cropKind === 'logo' ? 'Crop Logo' : 'Crop Favicon'}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// UploadZone
// ---------------------------------------------------------------------------

function UploadZone({
  imageUrl,
  uploading,
  onPick,
  onClear,
  fallback,
  label,
  size = 'lg',
}: {
  imageUrl: string
  uploading: boolean
  onPick: () => void
  onClear: () => void
  fallback: React.ReactNode
  label: string
  size?: 'lg' | 'sm'
}) {
  const [dragging, setDragging] = React.useState(false)
  const previewSize = size === 'lg' ? 'h-32 w-32' : 'h-16 w-16'

  return (
    <div className="flex items-start gap-4 flex-wrap">
      {/* Preview */}
      <div
        className={cn(
          'rounded-xl border-2 border-dashed grid place-items-center bg-muted/30 overflow-hidden shrink-0',
          previewSize,
          dragging ? 'border-primary bg-primary/5' : 'border-input'
        )}
      >
        {imageUrl ? (
           
          <img src={imageUrl} alt={label} className="h-full w-full object-contain" />
        ) : (
          <div className="text-muted-foreground">{fallback}</div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onPick} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1.5" /> {imageUrl ? 'Replace' : 'Upload'} {label}
              </>
            )}
          </Button>
          {imageUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={uploading}>
              Remove
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Drag &amp; drop or click to upload. PNG, JPG, or WEBP. Max 5MB.
        </p>
        {imageUrl && (
          <div className="text-[10px] font-mono text-muted-foreground break-all bg-muted/40 rounded px-2 py-1">
            {imageUrl}
          </div>
        )}
      </div>
    </div>
  )
}
