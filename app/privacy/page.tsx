/**
 * Privacy Policy — City Feed Marketplace
 */
export default function PrivacyPage() {
  const lastUpdated = 'March 1, 2026'

  return (
    <div className="min-h-screen pt-24 pb-16 px-6" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3" style={{ color: '#2b2b2b' }}>Privacy Policy</h1>
          <p className="text-sm" style={{ color: '#888' }}>Last updated: {lastUpdated}</p>
        </div>

        <div className="rounded-2xl p-8 space-y-10" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p className="text-sm leading-relaxed" style={{ color: '#555' }}>
            City Feed, Inc. (&quot;City Feed,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy. This Privacy Policy explains how we collect,
            use, and share information about you when you use our platform.
          </p>

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>1. Data We Collect</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p><strong>Account information:</strong> When you create an account, we collect your name, email address, and role (Host or Advertiser). Optionally, you may provide a company name, bio, and profile photo.</p>
              <p><strong>Transaction data:</strong> We collect information about bookings, payments, and campaigns conducted through the platform, including amounts, dates, and counterparty information.</p>
              <p><strong>Communications:</strong> Messages sent through City Feed&apos;s in-app messaging system are stored on our servers to facilitate the service and resolve disputes.</p>
              <p><strong>Usage data:</strong> We collect standard log data including IP addresses, browser type, pages visited, and timestamps. This helps us improve the platform and detect abuse.</p>
              <p><strong>Photos and media:</strong> Listing photos, Proof of Performance images, and profile avatars you upload are stored on our servers.</p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>2. How We Use Your Data</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Operate and improve the City Feed platform</li>
                <li>Facilitate transactions between Hosts and Advertisers</li>
                <li>Process payments and issue payouts</li>
                <li>Send transactional emails (booking confirmations, POP reminders, etc.)</li>
                <li>Detect, investigate, and prevent fraud and abuse</li>
                <li>Respond to support requests and disputes</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p className="mt-2">We do not sell your personal data to third parties for marketing purposes.</p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>3. Third-Party Services</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p>City Feed uses the following third-party services that may receive your data:</p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#f8f8f5' }}>
                  <p className="font-semibold mb-1" style={{ color: '#2b2b2b' }}>Stripe</p>
                  <p>Payment processing. Stripe handles all credit card transactions. City Feed never stores your full payment card details. Stripe is PCI-DSS compliant. Learn more at <span style={{ color: '#7ecfc0' }}>stripe.com/privacy</span>.</p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#f8f8f5' }}>
                  <p className="font-semibold mb-1" style={{ color: '#2b2b2b' }}>Supabase</p>
                  <p>Database and authentication infrastructure. Your account data, messages, and files are stored on Supabase&apos;s secure servers. Learn more at <span style={{ color: '#7ecfc0' }}>supabase.com/privacy</span>.</p>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#f8f8f5' }}>
                  <p className="font-semibold mb-1" style={{ color: '#2b2b2b' }}>Mapbox</p>
                  <p>Map rendering for listing locations. Mapbox may collect anonymous location data for map tile requests. Learn more at <span style={{ color: '#7ecfc0' }}>mapbox.com/legal/privacy</span>.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>4. Cookies</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p>City Feed uses essential cookies to maintain your authentication session. We do not use advertising cookies or tracking pixels.</p>
              <p>You can disable cookies in your browser settings, but doing so will prevent you from staying logged in to City Feed.</p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>5. Data Sharing</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p>When a booking is made, limited profile information (first name, profile photo, role) is shared between the Host and Advertiser to facilitate the transaction. Full contact details are never exposed through the platform.</p>
              <p>We may share your data with law enforcement or regulators when required by law, or to protect the rights, safety, or property of City Feed or others.</p>
              <p>In the event of a merger, acquisition, or sale of City Feed, user data may be transferred as part of the transaction. We will notify users of any such change.</p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>6. Your Rights</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p>Depending on your location, you may have the following rights regarding your personal data:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                <li><strong>Correction:</strong> Update inaccurate information through your account settings</li>
                <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                <li><strong>Portability:</strong> Request an export of your data in a machine-readable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from non-transactional emails at any time</li>
              </ul>
              <p className="mt-2">To exercise these rights, contact us at <span style={{ color: '#7ecfc0' }}>privacy@cityfeed.io</span>.</p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>7. Data Retention</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p>We retain your account data for as long as your account is active. After account deletion, most personal data is removed within 30 days, except where retention is required for legal, tax, or fraud prevention purposes (typically up to 7 years for financial records).</p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#2b2b2b' }}>8. Contact</h2>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#555' }}>
              <p>Questions, concerns, or requests regarding this Privacy Policy can be directed to:</p>
              <p><strong>City Feed, Inc.</strong><br />
              Email: <span style={{ color: '#7ecfc0' }}>privacy@cityfeed.io</span><br />
              For general support: <span style={{ color: '#7ecfc0' }}>support@cityfeed.io</span>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
