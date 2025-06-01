import { useState } from 'react';

import { Pagination } from './pagination';

export function PaginationDemo() {
  const [currentPage1, setCurrentPage1] = useState(1);
  const [currentPage2, setCurrentPage2] = useState(5);
  const [currentPage3, setCurrentPage3] = useState(3);
  const [currentPage4, setCurrentPage4] = useState(1);
  const [currentPageLarge, setCurrentPageLarge] = useState(15);

  const totalPages = 10;
  const totalPagesLarge = 50;

  return (
    <div className="p-8 space-y-12 bg-cream-50 min-h-screen">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-8">Pagination Component</h2>

        {/* Basic Examples */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700">Basic Pagination</h3>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-mist-200">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Default Style (Coral)</p>
                  <Pagination
                    currentPage={currentPage1}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage1}
                    showPrevNext
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">With First/Last Navigation</p>
                  <Pagination
                    currentPage={currentPage2}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage2}
                    showPrevNext
                    showFirstLast
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Size Variants */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700">Size Variants</h3>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-mist-200">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Small</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} size="sm" showPrevNext />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Medium (Default)</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} size="md" showPrevNext />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Large</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} size="lg" showPrevNext />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Extra Large</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} size="xl" showPrevNext />
                </div>
              </div>
            </div>
          </div>

          {/* Core Color Variants */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700">Core Color Variants</h3>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-mist-200">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">🔥 Coral (Primary)</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} colorScheme="coral" showPrevNext />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">🌿 Sage (Secondary)</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} colorScheme="sage" showPrevNext />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">🌫️ Mist (Tertiary)</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} colorScheme="mist" showPrevNext />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">🔘 Slate (Ghost)</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} colorScheme="slate" showPrevNext />
                </div>
              </div>
            </div>
          </div>

          {/* Style Variants */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700">Style Variants</h3>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-mist-200">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Secondary Style</p>
                  <Pagination
                    currentPage={3}
                    totalPages={8}
                    onPageChange={() => {}}
                    colorScheme="secondary"
                    showPrevNext
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Tertiary Style</p>
                  <Pagination
                    currentPage={3}
                    totalPages={8}
                    onPageChange={() => {}}
                    colorScheme="tertiary"
                    showPrevNext
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Ghost Style</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} colorScheme="ghost" showPrevNext />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Outline Style</p>
                  <Pagination
                    currentPage={3}
                    totalPages={8}
                    onPageChange={() => {}}
                    colorScheme="outline"
                    showPrevNext
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Semantic Color Variants */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700">Semantic Color Variants</h3>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-mist-200">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">✅ Success (Completed Operations)</p>
                  <Pagination
                    currentPage={3}
                    totalPages={8}
                    onPageChange={() => {}}
                    colorScheme="success"
                    showPrevNext
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">ℹ️ Info (System Information)</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} colorScheme="info" showPrevNext />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">⚠️ Warning (Attention Needed)</p>
                  <Pagination
                    currentPage={3}
                    totalPages={8}
                    onPageChange={() => {}}
                    colorScheme="warning"
                    showPrevNext
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">🚨 Danger (Critical States)</p>
                  <Pagination
                    currentPage={3}
                    totalPages={8}
                    onPageChange={() => {}}
                    colorScheme="danger"
                    showPrevNext
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Item Shape Variants */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700">Item Shape Variants</h3>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-mist-200">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Default (Rounded)</p>
                  <Pagination
                    currentPage={3}
                    totalPages={8}
                    onPageChange={() => {}}
                    itemVariant="default"
                    showPrevNext
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Pill Shape</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} itemVariant="pill" showPrevNext />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Square Shape</p>
                  <Pagination
                    currentPage={3}
                    totalPages={8}
                    onPageChange={() => {}}
                    itemVariant="square"
                    showPrevNext
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Container Spacing Variants */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700">Container Spacing Variants</h3>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-mist-200">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Compact Spacing</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} variant="compact" showPrevNext />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Default Spacing</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} variant="default" showPrevNext />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Spaced Layout</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} variant="spaced" showPrevNext />
                </div>
              </div>
            </div>
          </div>

          {/* Large Dataset Example */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700">Large Dataset with Ellipsis</h3>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-mist-200">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">
                    Page {currentPageLarge} of {totalPagesLarge} - Shows intelligent truncation with ellipsis
                  </p>
                  <Pagination
                    currentPage={currentPageLarge}
                    totalPages={totalPagesLarge}
                    onPageChange={setCurrentPageLarge}
                    showPrevNext
                    showFirstLast
                    siblingCount={2}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Custom Labels Example */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700">Custom Labels</h3>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-mist-200">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">With Custom Navigation Labels</p>
                  <Pagination
                    currentPage={currentPage3}
                    totalPages={10}
                    onPageChange={setCurrentPage3}
                    showPrevNext
                    showFirstLast
                    colorScheme="sage"
                    labels={{
                      first: '« First',
                      last: 'Last »',
                      previous: '‹ Prev',
                      next: 'Next ›',
                      page: (page) => `${page}`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* States */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700">States</h3>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-mist-200">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Normal State</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} showPrevNext />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Disabled State</p>
                  <Pagination currentPage={3} totalPages={8} onPageChange={() => {}} showPrevNext disabled />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Single Page (No Navigation)</p>
                  <Pagination currentPage={1} totalPages={1} onPageChange={() => {}} showPrevNext showFirstLast />
                </div>
              </div>
            </div>
          </div>

          {/* Financial App Use Cases */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-700">Financial App Use Cases</h3>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-mist-200">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">💳 Transaction History (Primary Coral)</p>
                  <Pagination
                    currentPage={currentPage4}
                    totalPages={15}
                    onPageChange={setCurrentPage4}
                    colorScheme="coral"
                    showPrevNext
                    showFirstLast
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">💰 Account Statements (Trustworthy Sage)</p>
                  <Pagination currentPage={2} totalPages={12} onPageChange={() => {}} colorScheme="sage" showPrevNext />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">📊 Reports (Professional Mist)</p>
                  <Pagination
                    currentPage={4}
                    totalPages={20}
                    onPageChange={() => {}}
                    colorScheme="mist"
                    showPrevNext
                    itemVariant="pill"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">⚙️ Settings/Admin (Minimal Slate)</p>
                  <Pagination
                    currentPage={1}
                    totalPages={5}
                    onPageChange={() => {}}
                    colorScheme="slate"
                    showPrevNext
                    variant="compact"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
