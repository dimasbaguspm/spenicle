import { createFileRoute } from '@tanstack/react-router';
import { HelpCircle, MessageCircle, Mail, Phone, FileText, Search, ChevronRight, ExternalLink } from 'lucide-react';
import { useState } from 'react';

import { PageLayout, Button, TextInput } from '../../../../components';

export const Route = createFileRoute('/_protected/_experienced-user/settings/help')({
  component: HelpComponent,
});

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

function HelpComponent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const faqItems: FAQItem[] = [
    {
      id: '1',
      question: 'How do I add a new transaction?',
      answer:
        'You can add a new transaction by clicking the "+" button on the main dashboard or navigating to the Transactions page and clicking "Add Transaction". Fill in the amount, category, and description.',
      category: 'Transactions',
    },
    {
      id: '2',
      question: 'How do I set up a budget?',
      answer:
        'Go to the Budgets section and click "Create Budget". Choose a category, set your spending limit, and select the time period. You can also set up alerts to notify you when you\'re approaching your limit.',
      category: 'Budgets',
    },
    {
      id: '3',
      question: 'Can I export my data?',
      answer:
        'Yes! You can export your transaction data in CSV or PDF format. Go to Account Settings > Data & Export and select your preferred format and date range.',
      category: 'Data',
    },
    {
      id: '4',
      question: 'How do I change my password?',
      answer:
        'Go to Account Settings > Security & Privacy, then click "Change Password". You\'ll need to enter your current password and choose a new one.',
      category: 'Security',
    },
    {
      id: '5',
      question: "Why aren't my transactions syncing?",
      answer:
        'Make sure you have a stable internet connection. If the problem persists, try logging out and back in. For bank account syncing issues, check that your account is still properly connected.',
      category: 'Sync',
    },
  ];

  const filteredFAQs = faqItems.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactSupport = (method: 'chat' | 'email' | 'phone') => {
    switch (method) {
      case 'chat':
        alert('Opening live chat...');
        break;
      case 'email':
        window.location.href = 'mailto:support@spendless.app';
        break;
      case 'phone':
        alert('Phone support: 1-800-SPENDLESS');
        break;
    }
  };

  return (
    <PageLayout background="cream" title="Help & Support" showBackButton={true}>
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleContactSupport('chat')}
            className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-coral-100 p-2 rounded-lg">
                <MessageCircle className="w-5 h-5 text-coral-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Live Chat</h3>
            </div>
            <p className="text-sm text-slate-600">Get instant help from our support team</p>
            <p className="text-xs text-green-600 mt-2">● Available now</p>
          </button>

          <button
            onClick={() => handleContactSupport('email')}
            className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-coral-100 p-2 rounded-lg">
                <Mail className="w-5 h-5 text-coral-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Email Support</h3>
            </div>
            <p className="text-sm text-slate-600">Send us a detailed message</p>
            <p className="text-xs text-slate-500 mt-2">Response within 24 hours</p>
          </button>

          <button
            onClick={() => handleContactSupport('phone')}
            className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-coral-100 p-2 rounded-lg">
                <Phone className="w-5 h-5 text-coral-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Phone Support</h3>
            </div>
            <p className="text-sm text-slate-600">Call our support line</p>
            <p className="text-xs text-slate-500 mt-2">Mon-Fri 9AM-6PM EST</p>
          </button>
        </div>

        {/* FAQ Search */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-coral-600" />
              Frequently Asked Questions
            </h3>
            <p className="text-sm text-slate-600 mt-1">Find answers to common questions</p>
          </div>

          <div className="p-6">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <TextInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help..."
                className="pl-10"
              />
            </div>

            <div className="space-y-4">
              {filteredFAQs.map((faq) => (
                <div key={faq.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    className="w-full p-4 text-left hover:bg-slate-50 flex items-center justify-between"
                    onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{faq.question}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-coral-100 text-coral-700 text-xs rounded-full">
                        {faq.category}
                      </span>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        expandedFAQ === faq.id ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                  {expandedFAQ === faq.id && (
                    <div className="px-4 pb-4 text-slate-600 border-t border-slate-100 bg-slate-50">
                      <p className="pt-4">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}

              {filteredFAQs.length === 0 && (
                <div className="text-center py-8">
                  <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No matching questions found</p>
                  <p className="text-sm text-slate-400 mt-2">Try different keywords or contact our support team</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Additional Resources</h3>
            <p className="text-sm text-slate-600 mt-1">Guides and documentation</p>
          </div>

          <div className="divide-y divide-slate-100">
            <a href="#" className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="text-coral-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Getting Started Guide</p>
                  <p className="text-sm text-slate-500">Learn the basics of SpendLess</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </a>

            <a href="#" className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="text-coral-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Budgeting Best Practices</p>
                  <p className="text-sm text-slate-500">Tips for effective budget management</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </a>

            <a href="#" className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="text-coral-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Security & Privacy Guide</p>
                  <p className="text-sm text-slate-500">How we protect your data</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </a>

            <a href="#" className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="text-coral-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">API Documentation</p>
                  <p className="text-sm text-slate-500">For developers and integrations</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Contact Information</h3>
            <p className="text-sm text-slate-600 mt-1">Other ways to reach us</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900">Email</p>
                <p className="text-sm text-slate-600">support@spendless.app</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900">Phone</p>
                <p className="text-sm text-slate-600">1-800-SPENDLESS (1-800-773-6353)</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900">Social Media</p>
                <p className="text-sm text-slate-600">@SpendLessApp on Twitter, Facebook, Instagram</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="bg-coral-50 border border-coral-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-coral-900 mb-2">Help us improve</h3>
          <p className="text-coral-700 mb-4">
            Found what you were looking for? Let us know how we can make our help section better.
          </p>
          <Button variant="coral">Send Feedback</Button>
        </div>
      </div>
    </PageLayout>
  );
}
