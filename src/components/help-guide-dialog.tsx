'use client'

import * as React from 'react'
import { BookOpen } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HelpGuideRole = 'STUDENT' | 'ADMIN' | 'BURSARY' | 'MODERATOR' | 'SUPPORT_REP'

interface GuideStep {
  title: string
  body: React.ReactNode
}

interface GuideSection {
  icon: React.ElementType
  title: string
  description?: string
  steps?: GuideStep[]
  bullets?: string[]
  alert?: { title: string; body: string; variant?: 'default' | 'destructive' }
  terms?: string[]
}

interface GuideContent {
  title: string
  subtitle: string
  intro: React.ReactNode
  sections: GuideSection[]
  closing?: React.ReactNode
}

// ---------------------------------------------------------------------------
// Small building-block components used inside the guides
// ---------------------------------------------------------------------------

function Step({ title, body }: GuideStep) {
  return (
    <li className="space-y-1">
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground leading-relaxed">{body}</div>
    </li>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-sm text-muted-foreground leading-relaxed flex gap-2">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
      <span>{children}</span>
    </li>
  )
}

function GuideSectionCard({ section }: { section: GuideSection }) {
  const Icon = section.icon
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="h-7 w-7 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
            <Icon className="h-4 w-4" />
          </span>
          {section.title}
        </CardTitle>
        {section.description && (
          <CardDescription className="text-xs">{section.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {section.terms && section.terms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {section.terms.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        )}
        {section.bullets && (
          <ul className="space-y-1.5">
            {section.bullets.map((b, i) => (
              <Bullet key={i}>{b}</Bullet>
            ))}
          </ul>
        )}
        {section.steps && (
          <ol className="space-y-2.5 list-none pl-0">
            {section.steps.map((s, i) => (
              <Step key={i} {...s} />
            ))}
          </ol>
        )}
        {section.alert && (
          <Alert variant={section.alert.variant ?? 'default'} className="py-2.5">
            <AlertTitle className="text-xs font-semibold">{section.alert.title}</AlertTitle>
            <AlertDescription className="text-xs">{section.alert.body}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Role-specific guide content
// ---------------------------------------------------------------------------

const STUDENT_GUIDE: GuideContent = {
  title: 'Student Guide',
  subtitle: 'Everything you need to know to apply, pay, and move in.',
  intro: (
    <p className="text-sm text-muted-foreground leading-relaxed">
      Welcome to HostelEase! This walkthrough explains each step of your journey — from
      completing your profile to picking up your room key. Use the sections below to jump
      to whatever you are stuck on.
    </p>
  ),
  sections: [
    {
      icon: BookOpen,
      title: '1. Complete your profile',
      description: 'Required vs optional fields',
      terms: ['Required', 'Optional', 'Verification'],
      bullets: [
        'Open Profile from the sidebar and fill in your personal details, faculty, department, level, and gender.',
        'Required fields (marked with a red asterisk) must be filled before you can apply for a hostel. These include your full name, gender, faculty, department, current level, and a valid phone number.',
        'Optional fields — such as next-of-kin, profile photo, and ID documents — improve your verification speed and unlock roommate matching later.',
        'Upload a clear ID document if requested. The moderator team will review and verify your profile before you can submit an application.',
      ],
      alert: {
        title: 'Cannot apply yet?',
        body: 'If the Apply button is disabled, check the Next Step banner at the top of your dashboard — it tells you exactly what is missing.',
      },
    },
    {
      icon: BookOpen,
      title: '2. Apply for a hostel',
      description: 'Pick the active academic session',
      terms: ['Session', 'Application window'],
      bullets: [
        'Only one academic session is active at a time. The dashboard will show you the active session and its application window dates.',
        'Click Apply for Hostel from the dashboard CTA or sidebar. Review the session details and confirm you want to apply.',
        'Once submitted, your application moves to PENDING status. A moderator or admin will then approve or reject it.',
        'You will receive an in-app notification and (optionally) an email when your application is reviewed.',
      ],
      alert: {
        title: 'Application window closed?',
        body: 'If the window is closed, the Apply button is disabled. Contact the hostel office if you believe this is an error.',
      },
    },
    {
      icon: BookOpen,
      title: '3. Pick your bed',
      description: 'Temporary lock system',
      terms: ['Temp lock', '10 minutes', 'Auto-release'],
      bullets: [
        'After your application is approved, the Bed Picker opens. Browse available blocks, rooms, and beds filtered by your gender.',
        'Clicking a bed temporarily locks it for you for 10 minutes while you complete payment.',
        'The lock countdown is shown on the bed card. If the timer runs out before payment is confirmed, the bed is released back to the pool and another student can take it.',
        'You can release a locked bed manually if you change your mind.',
      ],
      alert: {
        title: 'Bed disappeared?',
        body: 'If your temp-locked bed vanishes, the lock expired. Just pick another available bed and start again — your application is still valid.',
        variant: 'destructive',
      },
    },
    {
      icon: BookOpen,
      title: '4. Pay for your bed',
      description: 'Payment providers, manual transfer, auth code',
      terms: ['Card', 'Bank transfer', 'Manual', 'Auth code'],
      bullets: [
        'You can pay online with a card or bank transfer through the configured payment gateway (e.g. Paystack, Flutterwave). You will be redirected to the gateway checkout page.',
        'If you paid by bank transfer outside the gateway, choose Manual Transfer in the payment screen and upload your payment receipt. The bursary team will verify and confirm it.',
        'After successful payment, you receive an Authorization Code. Keep this code safe — you may be asked for it during check-in.',
        'A payment receipt (PDF) is generated automatically and can be downloaded from the Payments page.',
      ],
      alert: {
        title: 'Payment failed but money was deducted?',
        body: 'Do not pay again. Wait 5–10 minutes for the gateway webhook to reconcile, then open a support ticket with your transaction reference.',
        variant: 'destructive',
      },
    },
    {
      icon: BookOpen,
      title: '5. Use the support chat widget',
      description: 'AI assistant + human handoff',
      terms: ['AI', 'Live agent', 'Quick replies'],
      bullets: [
        'Click the chat bubble (bottom-right corner) to open the Support Chat Widget.',
        'You will first be answered by the AI Assistant. Use the quick-reply chips for common questions about applications, payments, and bed allocation.',
        'If the AI cannot resolve your issue, tap “Speak to a human”. The chat is escalated and a support rep will join shortly.',
        'Your conversation history is saved per session in your browser, so closing the widget does not lose your chat.',
      ],
    },
    {
      icon: BookOpen,
      title: '6. Report a maintenance issue',
      description: 'Submit a ticket for repairs',
      terms: ['Maintenance', 'Priority', 'Ticket'],
      bullets: [
        'Open Maintenance from the sidebar and click New Ticket.',
        'Select a category (electrical, plumbing, furniture, etc.), set a priority, and describe the problem in detail.',
        'Attach a photo if possible — this speeds up the maintenance team\'s response.',
        'You will be notified when the ticket is assigned, in progress, and resolved.',
      ],
    },
    {
      icon: BookOpen,
      title: '7. View your allocation & QR code',
      description: 'Your room assignment details',
      terms: ['Allocation', 'QR code', 'Letter'],
      bullets: [
        'Once your payment is confirmed and the admin allocates your bed, the Allocation card appears on your dashboard.',
        'It shows your block, room number, bed label, and roommate(s) if any.',
        'A QR code is generated for your allocation. Download the allocation letter (PDF) from the Allocation page.',
        'The QR code is what the bursary or warden scans to verify you at check-in.',
      ],
    },
    {
      icon: BookOpen,
      title: '8. Check in at the hostel office',
      description: 'Final step before moving in',
      terms: ['Check-in', 'QR scan', 'Hostel office'],
      bullets: [
        'Visit your hostel office in person on or after your check-in date.',
        'Present your allocation letter or show the QR code on your phone.',
        'The warden or bursary staff will scan the QR code to confirm your allocation and mark you as checked in.',
        'You will then receive your room key and any welcome materials.',
      ],
      alert: {
        title: 'ID required',
        body: 'Bring a valid student ID or government-issued ID to check-in. The hostel office may refuse entry without it.',
      },
    },
  ],
  closing: (
    <Alert>
      <AlertTitle>Need more help?</AlertTitle>
      <AlertDescription>
        If anything in this guide does not match what you see on screen, open the support
        chat widget and a team member will assist you.
      </AlertDescription>
    </Alert>
  ),
}

const ADMIN_GUIDE: GuideContent = {
  title: 'Admin Guide',
  subtitle: 'The complete operator manual for HostelEase administrators.',
  intro: (
    <p className="text-sm text-muted-foreground leading-relaxed">
      As an admin you have full control over the hostel structure, student lifecycle,
      payments, and system configuration. This guide covers each module and the best
      practices for using it.
    </p>
  ),
  sections: [
    {
      icon: BookOpen,
      title: 'Dashboard overview',
      description: 'Stats, today\'s snapshot, gateway health',
      terms: ['Stats', 'Today snapshot', 'System health'],
      bullets: [
        'The top stat cards show total beds, occupancy rate, total students, and revenue. These refresh every 60 seconds.',
        'The Today Snapshot card summarizes today\'s key activity (verifications, applications, payments) pulled from the audit log.',
        'The System Health widget reports gateway connectivity, DB status, and background job health. Red indicators mean something needs your attention.',
        'Block occupancy bars and the recent activity feed give you a live view of what is happening across all hostels.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Managing hostel structure',
      description: 'Blocks, rooms, beds',
      terms: ['Block', 'Room', 'Bed', 'Gender type'],
      bullets: [
        'Open Hostel Structure to create and manage blocks, rooms, and beds.',
        'Each block has a gender type (Male / Female / Mixed). Rooms inside inherit the block gender unless overridden.',
        'Beds can be marked as Available, Occupied, or Maintenance. Beds in maintenance are excluded from allocation.',
        'Use the Warden Map for a visual, floor-by-floor view of every room and bed.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Managing students',
      description: 'Add, verify, reset profile',
      terms: ['Add', 'Verify', 'Reset'],
      bullets: [
        'Add a single student via the Add Student form, or use Bulk Import with the CSV template to onboard many students at once.',
        'Pending verifications appear in the Students table with a PENDING badge. Open a student to verify or reject their profile.',
        'If a student needs to start over (e.g. wrong faculty), use Reset Profile to clear their verification status and return them to the profile-completion step.',
        'You can also reset a student\'s password from the student detail panel.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Managing applications',
      description: 'Approve, reject',
      terms: ['Approve', 'Reject', 'Session'],
      bullets: [
        'Applications are visible in the Applications Manager. Filter by session, status, or block.',
        'Approving an application moves the student to the bed-selection step. Rejecting returns them to the application stage with an optional note.',
        'Use auto-approve (Settings) to skip manual review for students whose profiles are already verified.',
        'You can bulk-approve multiple applications from the table.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Managing allocations',
      description: 'Batch, manual, check-in',
      terms: ['Batch', 'Manual', 'Check-in'],
      bullets: [
        'Once a student pays, the system can auto-allocate the bed they locked. If auto-allocation is off, you allocate manually.',
        'Manual allocation lets you reassign a student to a different bed if needed (e.g. room swaps).',
        'Batch allocation runs the allocation engine for all paid-but-unallocated students in one click — useful after a payment deadline.',
        'Mark a student as Checked In after they physically arrive at the hostel office and present their QR code.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Payment gateways',
      description: 'Configure, test connection, sandbox/live',
      terms: ['Paystack', 'Flutterwave', 'Sandbox', 'Live'],
      bullets: [
        'Open Payment Gateways to add or edit gateway credentials. Only one gateway can be active at a time.',
        'Use Test Connection to verify your API keys before going live.',
        'Sandbox mode processes test transactions that do not charge real cards. Switch to Live only after testing.',
        'The gateway status is reflected on the dashboard System Health widget.',
      ],
      alert: {
        title: 'Going live',
        body: 'Switching from Sandbox to Live immediately starts charging real cards. Confirm your settlement account details first.',
        variant: 'destructive',
      },
    },
    {
      icon: BookOpen,
      title: 'Reports and exports',
      description: 'CSV downloads',
      terms: ['CSV', 'Payments', 'Allocations', 'Students'],
      bullets: [
        'Open Reports to export CSV files for students, applications, allocations, and payments.',
        'Filter by session, date range, or status before exporting.',
        'Reports are generated on-demand and downloaded directly to your device.',
      ],
    },
    {
      icon: BookOpen,
      title: 'System settings',
      description: 'Payment, security, allocation, auto-verify, auto-approve',
      terms: ['Settings', 'Auto-verify', 'Auto-approve'],
      bullets: [
        'The Settings page is organized into tabs: Payment, Security, Allocation, and General.',
        'Enable Auto-verify to automatically approve student profiles that meet certain criteria (e.g. valid email + ID uploaded).',
        'Enable Auto-approve to skip manual application review for verified students.',
        'Configure allocation rules, fee deadlines, and the active academic session here.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Backup and recovery',
      description: 'Database snapshots',
      terms: ['Backup', 'Restore', 'Download'],
      bullets: [
        'Use Backup → Run Backup to create a database snapshot. Backups are listed with timestamp and size.',
        'Download a backup file to keep an off-platform copy.',
        'Restore uploads a backup file and replaces the current database. This is destructive — confirm you have the right file.',
      ],
      alert: {
        title: 'Restore is destructive',
        body: 'Restoring overwrites the current database. Take a fresh backup before restoring, in case you need to roll back.',
        variant: 'destructive',
      },
    },
    {
      icon: BookOpen,
      title: 'Audit logs & email logs',
      description: 'Who did what, when',
      terms: ['Audit log', 'Email log'],
      bullets: [
        'Audit Logs records every significant action (login, allocation, payment, settings change) with actor, timestamp, and IP.',
        'Email Logs shows every system email sent, with delivery status and a preview of the message body.',
        'Use filters and search to investigate incidents.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Role permissions',
      description: 'What each role can do',
      terms: ['Admin', 'Bursary', 'Moderator', 'Support Rep'],
      bullets: [
        'Open Role Permissions to view and toggle the granular capabilities of each non-admin role.',
        'Bursary, Moderator, and Support Rep permissions are managed independently.',
        'Changes take effect immediately for the affected users\' next request.',
      ],
    },
    {
      icon: BookOpen,
      title: 'AI assistant',
      description: 'Ask the system anything',
      terms: ['AI', 'Natural language'],
      bullets: [
        'The AI Assistant can answer natural-language questions about your hostel data (e.g. "How many beds are free in Block A?").',
        'It can also perform read-only actions. Sensitive actions require OTP approval before they are executed.',
        'Conversation history is saved per admin user.',
      ],
    },
  ],
  closing: (
    <Alert>
      <AlertTitle>Need more help?</AlertTitle>
      <AlertDescription>
        Review the audit log to understand recent changes, and use the AI Assistant for
        quick answers about live data.
      </AlertDescription>
    </Alert>
  ),
}

const BURSARY_GUIDE: GuideContent = {
  title: 'Bursary Guide',
  subtitle: 'Payments, codes, revenue, and verification — for finance staff.',
  intro: (
    <p className="text-sm text-muted-foreground leading-relaxed">
      As a bursary officer you have read-only access to most of the system and write
      access to payments, bursary codes, and revenue reports. This guide walks through
      each module you can use.
    </p>
  ),
  sections: [
    {
      icon: BookOpen,
      title: 'Dashboard overview',
      description: 'Revenue, payments, gateway status',
      terms: ['Revenue', 'Payments', 'Gateway'],
      bullets: [
        'The top stat cards show total revenue, successful payments, pending payments, and failed payments.',
        'The gateway status widget shows whether the active payment gateway is reachable and in sandbox or live mode.',
        'A revenue trend chart and payments breakdown help you spot anomalies at a glance.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Processing payments',
      description: 'View and confirm manual payments',
      terms: ['Manual', 'Confirm', 'Receipt'],
      bullets: [
        'Open Payments to see every payment record. Filter by status (Pending, Successful, Failed) or date.',
        'For Manual Transfer payments, open the detail view to inspect the uploaded receipt, then click Confirm to mark it as successful — or Reject if the receipt is invalid.',
        'Confirming a manual payment triggers the allocation engine (if auto-allocation is on) and notifies the student.',
        'You can also retry a failed gateway payment or refund a successful one from the payment detail panel.',
      ],
      alert: {
        title: 'Verify before confirming',
        body: 'Always cross-check the receipt amount, account name, and date against the bank statement before confirming a manual payment.',
        variant: 'destructive',
      },
    },
    {
      icon: BookOpen,
      title: 'Bursary codes',
      description: 'Create, revoke, lookup',
      terms: ['Code', 'Revoke', 'Lookup'],
      bullets: [
        'A bursary code is a discount or scholarship identifier that students can apply during payment.',
        'Create codes with a fixed amount or percentage off, an optional usage cap, and an expiry date.',
        'Use Lookup to check the status, remaining uses, and recent redemptions of any code.',
        'Revoke a code to disable it immediately. Existing redemptions are preserved.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Revenue reports',
      description: 'CSV export and charts',
      terms: ['CSV', 'Charts', 'Date range'],
      bullets: [
        'Open Reports to view revenue charts (daily / weekly / monthly) broken down by gateway, block, or session.',
        'Export the visible data to CSV for accounting or audit purposes.',
        'Filter by date range or session to narrow the report.',
      ],
    },
    {
      icon: BookOpen,
      title: 'QR scanner',
      description: 'Verify allocations',
      terms: ['QR', 'Scan', 'Check-in'],
      bullets: [
        'Open QR Scanner and point your device camera at a student\'s allocation QR code.',
        'The scanner returns the student\'s name, bed, room, block, payment status, and check-in state.',
        'Use this to verify students at the hostel office before issuing a room key.',
        'On devices without a camera, paste the raw QR token into the manual lookup field.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Inbox',
      description: 'Activity feed, sound notifications, filters',
      terms: ['Inbox', 'Sound', 'Filter'],
      bullets: [
        'The Bursary Inbox shows a real-time feed of payment-related events: new manual transfers, gateway settlements, refunds, and bursary code redemptions.',
        'Enable sound notifications to hear an alert when a new high-value event arrives.',
        'Filter by event type, date, or amount range to focus on what matters.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Read-only gateway status',
      description: 'You cannot edit gateways',
      terms: ['Read-only'],
      bullets: [
        'Bursary officers can view the active payment gateway and its mode (sandbox/live) but cannot edit credentials.',
        'If a gateway is unreachable, contact an admin to investigate.',
      ],
      alert: {
        title: 'Cannot edit gateway credentials?',
        body: 'This is expected — only Admins can manage payment gateway configuration. Bursary access is read-only for gateways.',
      },
    },
  ],
  closing: (
    <Alert>
      <AlertTitle>Need more help?</AlertTitle>
      <AlertDescription>
        For gateway configuration or student record changes, contact an Admin. For
        everything else, the inbox and reports pages have what you need.
      </AlertDescription>
    </Alert>
  ),
}

const MODERATOR_GUIDE: GuideContent = {
  title: 'Moderator Guide',
  subtitle: 'Review queue for verifications, applications, and tickets.',
  intro: (
    <p className="text-sm text-muted-foreground leading-relaxed">
      Moderators are the first line of quality control. Your job is to verify student
      profiles, review applications, and triage maintenance and support tickets.
    </p>
  ),
  sections: [
    {
      icon: BookOpen,
      title: 'Dashboard overview',
      description: 'Pending verifications, applications, tickets',
      terms: ['Verifications', 'Applications', 'Tickets'],
      bullets: [
        'The dashboard shows three counts: pending verifications, pending applications, and open tickets.',
        'Each count links directly to the relevant review queue.',
        'The dashboard refreshes on a short interval so you always see the latest queue depth.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Verifying student profiles',
      description: 'Approve, reject, notes',
      terms: ['Approve', 'Reject', 'Notes'],
      bullets: [
        'Open the Verifications queue and click a student to review their profile, uploaded ID, faculty, and department.',
        'Approve to move the student to the application step. Reject to send them back to profile editing.',
        'Always leave a Note when rejecting — it tells the student what to fix.',
        'Notes are visible to the student and to other moderators.',
      ],
      alert: {
        title: 'Check the ID document',
        body: 'Before approving, confirm the uploaded ID matches the student\'s name and that the photo is legible. Approving a fake ID creates downstream problems.',
        variant: 'destructive',
      },
    },
    {
      icon: BookOpen,
      title: 'Reviewing applications',
      description: 'Approve or reject hostel applications',
      terms: ['Approve', 'Reject', 'Session'],
      bullets: [
        'The Applications queue lists students whose profiles are verified but who are waiting for application approval.',
        'Approve to let the student pick a bed and pay. Reject with a reason if they are ineligible.',
        'Use bulk-approve when you have many similar applications to clear at once.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Managing maintenance tickets',
      description: 'Triage and assign repair requests',
      terms: ['Maintenance', 'Assign', 'Priority'],
      bullets: [
        'Maintenance tickets come from students reporting issues in their rooms.',
        'Set the appropriate priority (Low / Normal / High / Urgent) based on severity — urgent issues like electrical faults should be escalated immediately.',
        'Assign the ticket to the relevant maintenance team or contractor and update the status as work progresses.',
        'Comment on the ticket to keep the student informed.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Support tickets',
      description: 'Respond and resolve',
      terms: ['Respond', 'Resolve', 'Close'],
      bullets: [
        'Support tickets are non-urgent written requests from students (e.g. account issues, document requests).',
        'Reply inline to the student. They will be notified by email and in-app.',
        'Mark a ticket Resolved once the issue is addressed. The student can re-open it if needed.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Live support chat',
      description: 'Take over, resolve',
      terms: ['Take over', 'Resolve', 'AI handoff'],
      bullets: [
        'Open Live Support to see the real-time chat inbox. Sessions waiting for an agent are highlighted in amber.',
        'Click Take Over to claim a waiting session. The student is notified that an agent has joined.',
        'Reply in the chat panel. Use the AI handoff context (shown in the student info card) to see what the AI already discussed.',
        'Click Resolve and leave a resolution note to close the conversation.',
      ],
    },
  ],
  closing: (
    <Alert>
      <AlertTitle>Need more help?</AlertTitle>
      <AlertDescription>
        If you are unsure whether to approve or reject a profile, leave a note and ask
        another moderator or an admin to review.
      </AlertDescription>
    </Alert>
  ),
}

const SUPPORT_REP_GUIDE: GuideContent = {
  title: 'Support Rep Guide',
  subtitle: 'Live support chat — pick up waiting students and resolve their issues.',
  intro: (
    <p className="text-sm text-muted-foreground leading-relaxed">
      As a support rep, your primary tool is the Live Support dashboard. Students start
      by chatting with the AI Assistant; when they need a human, the conversation lands
      in your queue.
    </p>
  ),
  sections: [
    {
      icon: BookOpen,
      title: 'Live support dashboard',
      description: 'Queue, take over, resolve',
      terms: ['Queue', 'Take over', 'Resolve'],
      bullets: [
        'The left pane lists all sessions. Filter by status: Waiting only, Active only, Resolved, or Closed.',
        'The In queue count shows how many students are waiting for an agent. Aim to keep this near zero.',
        'Sessions assigned to you are tagged Mine so you can find them quickly.',
        'The inbox polls every 5 seconds and the active chat polls every 3 seconds, so you always have fresh data.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Chat with students',
      description: 'AI handoff context',
      terms: ['AI context', 'Quick replies'],
      bullets: [
        'When you open a session, the right pane shows the full transcript — including everything the AI Assistant already said.',
        'The student info card shows name, email, registration number, level, department, phone, and verification status. Use this to personalize your response.',
        'Press Enter to send, Shift+Enter for a newline. The student sees your replies in real time.',
        'If the student goes idle, the chat stays open until you resolve it.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Resolution notes',
      description: 'Document every resolution',
      terms: ['Resolution note', 'Required'],
      bullets: [
        'Click Resolve to open the resolution dialog. You must enter a resolution note (up to 1000 characters) describing what was wrong and how you fixed it.',
        'Resolution notes are visible to other support reps and admins in the conversation history.',
        'Good notes help future reps handle similar issues faster and feed into the AI training loop.',
      ],
      alert: {
        title: 'Do not abandon chats',
        body: 'If you need to step away, resolve the chat or hand it off. Leaving a student waiting in WITH_AGENT status without reply damages trust.',
        variant: 'destructive',
      },
    },
    {
      icon: BookOpen,
      title: 'Support tickets',
      description: 'Written follow-ups',
      terms: ['Tickets', 'Async'],
      bullets: [
        'Some student issues are tracked as support tickets (async, email-style) rather than live chat.',
        'Check the Support Tickets view for any tickets assigned to you and respond within your team\'s SLA.',
        'If a ticket needs live help, you can invite the student to open the chat widget.',
      ],
    },
  ],
  closing: (
    <Alert>
      <AlertTitle>Need more help?</AlertTitle>
      <AlertDescription>
        Coordinate with admins and moderators for issues that need record changes
        (e.g. manual allocations, password resets). Use resolution notes to keep everyone
        in the loop.
      </AlertDescription>
    </Alert>
  ),
}

const GUIDES: Record<HelpGuideRole, GuideContent> = {
  STUDENT: STUDENT_GUIDE,
  ADMIN: ADMIN_GUIDE,
  BURSARY: BURSARY_GUIDE,
  MODERATOR: MODERATOR_GUIDE,
  SUPPORT_REP: SUPPORT_REP_GUIDE,
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface HelpGuideDialogProps {
  role: HelpGuideRole
  className?: string
  /** Visual variant for the trigger button. Defaults to "outline". */
  triggerVariant?: 'outline' | 'ghost' | 'secondary'
  /** Optional label next to the icon. Defaults to none (icon-only). */
  label?: string
}

export function HelpGuideDialog({
  role,
  className,
  triggerVariant = 'outline',
  label,
}: HelpGuideDialogProps) {
  const [open, setOpen] = React.useState(false)
  const guide = GUIDES[role]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size="sm"
          className={cn('gap-1.5', className)}
          aria-label={`Open ${guide.title}`}
        >
          <BookOpen className="h-4 w-4" />
          {label && <span>{label}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-2 space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
              <BookOpen className="h-4 w-4" />
            </span>
            <DialogTitle className="text-lg">{guide.title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm">{guide.subtitle}</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{guide.intro}</p>

          <div className="space-y-3">
            {guide.sections.map((section, idx) => (
              <GuideSectionCard key={idx} section={section} />
            ))}
          </div>

          {guide.closing && <div className="pt-1">{guide.closing}</div>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
