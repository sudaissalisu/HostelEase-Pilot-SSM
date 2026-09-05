'use client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Scale, FileText, Shield, Copyright } from 'lucide-react'

export default function LegalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Legal & Licensing</h1>
        <p className="text-sm text-slate-500 mt-1">SSM Limited legal documents and licensing information.</p>
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Copyright className="h-4 w-4 text-primary" /> Copyright & IP</CardTitle>
            <CardDescription>Intellectual property ownership</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-slate-600">
            <p><strong>Owner:</strong> SSM Limited (RC 7977037)</p>
            <p><strong>Product:</strong> HostelEase — Hostel Management Platform</p>
            <p><strong>Copyright:</strong> © 2024–2026 SSM Limited. All rights reserved.</p>
            <p>HostelEase is proprietary software developed, owned, and copyrighted by SSM Limited. Unauthorized copying, modification, distribution, or reverse engineering is strictly prohibited.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> License Agreement</CardTitle>
            <CardDescription>Software licensing terms</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-slate-600">
            <p>HostelEase is licensed, not sold, to educational institutions. Each license is granted on an annual basis and includes:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Right to use the software for hostel management</li>
              <li>Access to updates and bug fixes during the license period</li>
              <li>Technical support during business hours</li>
              <li>One production deployment per license</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Privacy Policy</CardTitle>
            <CardDescription>Data handling practices</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-slate-600">
            <p>SSM Limited acts as a data processor on behalf of licensed institutions. Student data is stored in the institution's own database and is not accessed by SSM Limited except for support purposes with explicit authorization.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Scale className="h-4 w-4 text-primary" /> Company Information</CardTitle>
            <CardDescription>SSM Limited registration details</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-slate-600">
            <p><strong>Legal Name:</strong> SSM Limited</p>
            <p><strong>Registration Number:</strong> RC 7977037</p>
            <p><strong>Address:</strong> Kano, Nigeria</p>
            <p><strong>Email:</strong> support@ssm.com.ng</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
