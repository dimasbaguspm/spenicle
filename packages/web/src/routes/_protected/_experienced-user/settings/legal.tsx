import { createFileRoute } from '@tanstack/react-router';
import { Shield, FileText, Eye, Download, ExternalLink, AlertCircle } from 'lucide-react';

import { PageLayout, Button } from '../../../../components';

export const Route = createFileRoute('/_protected/_experienced-user/settings/legal')({
  component: LegalComponent,
});

function LegalComponent() {
  const documents = [
    {
      id: 'privacy-policy',
      title: 'Privacy Policy',
      description: 'How we collect, use, and protect your personal information',
      lastUpdated: 'January 15, 2024',
      icon: Shield,
    },
    {
      id: 'terms-of-service',
      title: 'Terms of Service',
      description: 'Legal agreement between you and SpendLess',
      lastUpdated: 'January 15, 2024',
      icon: FileText,
    },
    {
      id: 'cookie-policy',
      title: 'Cookie Policy',
      description: 'How we use cookies and similar technologies',
      lastUpdated: 'December 10, 2023',
      icon: Eye,
    },
    {
      id: 'data-processing',
      title: 'Data Processing Agreement',
      description: 'GDPR compliance and data processing details',
      lastUpdated: 'November 20, 2023',
      icon: Shield,
    },
  ];

  const handleDownload = (documentId: string) => {
    // Handle download logic here
    alert(`Downloading ${documentId}...`);
  };

  const handleViewDocument = (documentId: string) => {
    // TODO: Implement document viewing functionality
    alert(`Opening document: ${documentId}`);
  };

  return (
    <PageLayout background="cream" title="Legal & Privacy" showBackButton={true}>
      <div className="space-y-6">
        {/* Privacy Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-coral-600" />
              Your Privacy Matters
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              We are committed to protecting your privacy and being transparent about our practices
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Data We Collect</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Account information (name, email)</li>
                  <li>• Financial transaction data</li>
                  <li>• Device and usage information</li>
                  <li>• Security and authentication data</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">How We Protect It</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Bank-level encryption (AES-256)</li>
                  <li>• Secure cloud infrastructure</li>
                  <li>• Regular security audits</li>
                  <li>• Two-factor authentication</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Your Rights</p>
                  <p className="text-sm text-blue-700 mt-1">
                    You have the right to access, correct, or delete your personal data. You can also request data
                    portability or object to processing under certain circumstances.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Documents */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Legal Documents</h3>
            <p className="text-sm text-slate-600 mt-1">Important legal information and policies</p>
          </div>

          <div className="divide-y divide-slate-100">
            {documents.map((doc) => {
              const IconComponent = doc.icon;
              return (
                <div key={doc.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-coral-600">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{doc.title}</h4>
                        <p className="text-sm text-slate-500">{doc.description}</p>
                        <p className="text-xs text-slate-400 mt-1">Last updated: {doc.lastUpdated}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewDocument(doc.id)}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(doc.id)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compliance & Certifications */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Compliance & Certifications</h3>
            <p className="text-sm text-slate-600 mt-1">Standards and regulations we adhere to</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">GDPR Compliant</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    Full compliance with European General Data Protection Regulation
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">SOC 2 Type II</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    Independently audited security, availability, and confidentiality controls
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">PCI DSS</h4>
                  <p className="text-sm text-slate-600 mt-1">Payment Card Industry Data Security Standard compliance</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Shield className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">CCPA Compliant</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    California Consumer Privacy Act compliance for CA residents
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Requests */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Data Requests</h3>
            <p className="text-sm text-slate-600 mt-1">Exercise your data rights</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <p className="font-medium">Request My Data</p>
                  <p className="text-sm text-slate-500 mt-1">Download a copy of all your personal data</p>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <p className="font-medium">Correct My Data</p>
                  <p className="text-sm text-slate-500 mt-1">Request corrections to your personal information</p>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto p-4 text-red-600 hover:text-red-700">
                <div className="text-left">
                  <p className="font-medium">Delete My Data</p>
                  <p className="text-sm text-slate-500 mt-1">Request permanent deletion of your account</p>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <p className="font-medium">Data Portability</p>
                  <p className="text-sm text-slate-500 mt-1">Transfer your data to another service</p>
                </div>
              </Button>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">Processing Time</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Data requests are typically processed within 30 days. You'll receive email confirmation when your
                    request is submitted and when it's completed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Questions About Privacy or Legal?</h3>
            <p className="text-slate-600 mb-4">
              If you have questions about our privacy practices or legal policies, our Data Protection Officer is here
              to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => (window.location.href = 'mailto:privacy@spendless.app')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Email Privacy Team
              </Button>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Submit Privacy Request
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
