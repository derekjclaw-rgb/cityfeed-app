/**
 * Terms of Service — City Feed Marketplace
 */
export default function TermsPage() {
  const lastUpdated = 'March 1, 2026'

  return (
    <div className="min-h-screen pt-24 pb-16 px-6" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3" style={{ color: '#2b2b2b' }}>Terms of Service</h1>
          <p className="text-sm" style={{ color: '#888' }}>Last updated: {lastUpdated}</p>
        </div>

        <div className="rounded-2xl p-8 space-y-10" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p className="text-sm leading-relaxed" style={{ color: '#555' }}>
            Welcome to City Feed. By creating an account or using our platform, you agree to these Terms of Service.
            Please read them carefully. If you do not agree, do not use City Feed.
          </p>

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>1. Account Terms</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p>You must be at least 18 years old to create an account on City Feed. By registering, you represent that all information you provide is accurate and current.</p>
              <p>You are responsible for maintaining the confidentiality of your login credentials. City Feed is not liable for any loss resulting from unauthorized access to your account.</p>
              <p>Each person may maintain one account. Creating multiple accounts to circumvent suspensions or platform rules is prohibited and will result in permanent removal.</p>
              <p>City Feed reserves the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or harm other users.</p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>2. Marketplace Rules</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p>City Feed is a two-sided marketplace connecting Hosts (who list advertising spaces) and Advertisers (who book those spaces). All transactions must occur through the platform.</p>
              <p><strong>Prohibited content:</strong> Listings and campaigns may not promote illegal products or services, adult content, hate speech, violence, or any content that violates applicable law.</p>
              <p>Hosts are responsible for ensuring their listings accurately describe the advertising space, location, dimensions, and expected impressions. Materially inaccurate listings may be removed.</p>
              <p>Advertisers are responsible for ensuring their creative materials comply with all applicable advertising standards, laws, and the content restrictions specified by the Host.</p>
              <p>Circumventing the platform — including arranging payments outside City Feed to avoid fees — is strictly prohibited and will result in account termination.</p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>3. Payments & Fees</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p>City Feed charges a platform fee on each completed transaction:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Advertiser fee: 7%</strong> of the total booking amount (charged at checkout)</li>
                <li><strong>Host fee: 7%</strong> of the total booking amount (deducted from payout)</li>
              </ul>
              <p>All payments are processed securely through Stripe. City Feed does not store your credit card information.</p>
              <p>Payouts to Hosts are processed within 7 business days after Proof of Performance (POP) has been approved by the Advertiser, or 14 days after campaign completion if no dispute is raised.</p>
              <p>All fees are non-refundable except as specified in our Cancellation Policy.</p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>4. Cancellation Policy</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p><strong>Advertiser cancellations:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>More than 7 days before start date: Full refund minus platform fees</li>
                <li>3–7 days before start date: 50% refund</li>
                <li>Less than 3 days before start date: No refund</li>
              </ul>
              <p className="mt-3"><strong>Host cancellations:</strong> Hosts who cancel a confirmed booking within 48 hours of the start date may be subject to penalties, including a reduction in search visibility. Full refunds will be issued to the Advertiser.</p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>5. Proof of Performance</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p>After a campaign runs, Hosts are required to submit Proof of Performance (POP) — photographic or documented evidence that the advertising was displayed as agreed.</p>
              <p>Advertisers have 72 hours to review and approve or dispute the POP after submission. If no action is taken within 72 hours, the POP is automatically approved and payout is initiated.</p>
              <p>Submitting fraudulent POP (fabricated images, misrepresented dates, etc.) is grounds for immediate account termination and potential legal action.</p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>6. Dispute Resolution</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p>If a dispute arises between an Advertiser and a Host, either party may contact City Feed support within 7 days of the issue arising. City Feed will review available evidence and make a binding determination.</p>
              <p>City Feed&apos;s dispute resolution process is the sole mechanism for resolving platform-related disputes. Users agree not to pursue legal action against other users for platform-related disputes without first completing the City Feed dispute process.</p>
              <p>For disputes that cannot be resolved through City Feed&apos;s process, the parties agree to binding arbitration under the rules of the American Arbitration Association in the state of Nevada.</p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>7. Limitation of Liability</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p>City Feed is a marketplace platform. We facilitate connections between Hosts and Advertisers but are not a party to any agreement between them and make no representations about the quality, safety, legality, or accuracy of listings.</p>
              <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, CITY FEED SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL.</p>
              <p>Our total liability for any claim arising from or related to these Terms or use of the platform shall not exceed the total fees paid by you to City Feed in the 12 months preceding the claim.</p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>8. Changes to Terms</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p>City Feed may update these Terms at any time. We will notify users of material changes via email or in-app notification. Continued use of the platform after changes constitutes acceptance of the new Terms.</p>
              <p>Questions about these Terms? Contact us at <span style={{ color: '#7ecfc0' }}>support@cityfeed.io</span></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
