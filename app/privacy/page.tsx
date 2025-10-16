// app/privacy/page.tsx
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="mb-4">Last Updated: May 10, 2025</p>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
        <p>
          Welcome to GitHub Profile Analyzer (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information, please contact us at [Your Contact Email Address].
        </p>
        <p className="mt-2">
          This privacy notice describes how we might use your information if you:
        </p>
        <ul className="list-disc list-inside ml-4">
          <li>Visit our website at [Your Website URL]</li>
          <li>Engage with us in other related ways ― including any sales, marketing, or events</li>
        </ul>
        <p className="mt-2">
          In this privacy notice, if we refer to:
        </p>
        <ul className="list-disc list-inside ml-4">
          <li>&quot;Website&quot;, we are referring to any website of ours that references or links to this policy</li>
          <li>&quot;Services&quot;, we are referring to our Website, and other related services, including any sales, marketing, or events</li>
        </ul>
        <p className="mt-2">
          The purpose of this privacy notice is to explain to you in the clearest way possible what information we collect, how we use it, and what rights you have in relation to it.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
        <p>
          We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services or otherwise when you contact us.
        </p>
        <p className="mt-2">
          The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make and the products and features you use. The personal information we collect may include the following:
        </p>
        <ul className="list-disc list-inside ml-4">
          <li><strong>Personal Information Provided by You:</strong> We collect names; email addresses; usernames; passwords (stored securely, e.g., hashed); contact preferences; and other similar information. When you log in using GitHub, we may collect your GitHub username, public profile information, and email address associated with your GitHub account.</li>
          <li><strong>Data from GitHub:</strong> To provide our analysis services, we fetch public data from GitHub profiles and repositories as requested by you. This includes repository names, languages, commit history, and other publicly available metrics.</li>
          <li><strong>Usage Data:</strong> We may automatically collect certain information when you visit, use or navigate the Services. This information does not reveal your specific identity (like your name or contact information) but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, information about how and when you use our Services and other technical information.</li>
          <li><strong>AI-Generated Data:</strong> Our AI tools may generate analyses and insights based on the GitHub data you provide. These analyses may be stored in association with your account to provide you with our Services.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
        <p>
          We use personal information collected via our Services for a variety of business purposes described below.
        </p>
        <ul className="list-disc list-inside ml-4">
          <li>To facilitate account creation and logon process.</li>
          <li>To provide, operate, and maintain our Services, including GitHub profile analysis and comparisons.</li>
          <li>To improve, personalize, and expand our Services.</li>
          <li>To understand and analyze how you use our Services.</li>
          <li>For security purposes, such as monitoring for and preventing fraudulent activity.</li>
          <li>To respond to user inquiries and offer support.</li>
          {/* Add more specific uses as relevant */}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">4. Data Storage and Security</h2>
        <p>
          We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
        </p>
        <p className="mt-2">
          Your information is stored in a database hosted by [mention general type of hosting, e.g., "a reputable cloud service provider"].
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">5. Data Sharing and Disclosure</h2>
        <p>
          We do not share your personal information with third parties except as described in this Privacy Policy or with your consent. We may share information with:
        </p>
        <ul className="list-disc list-inside ml-4">
          <li><strong>Service Providers:</strong> We may share your information with third-party vendors, service providers, contractors or agents who perform services for us or on our behalf and require access to such information to do that work. Examples include: data analysis, AI processing services, hosting services, customer service and marketing efforts.</li>
          <li><strong>Legal Obligations:</strong> We may disclose your information where we are legally required to do so in order to comply with applicable law, governmental requests, a judicial proceeding, court order, or legal process.</li>
        </ul>
        <p className="mt-2">We do not sell your personal information.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">6. Your Data Protection Rights</h2>
        <p>
          Depending on your location, you may have the following rights regarding your personal information:
        </p>
        <ul className="list-disc list-inside ml-4">
          <li>The right to access – You have the right to request copies of your personal data.</li>
          <li>The right to rectification – You have the right to request that we correct any information you believe is inaccurate or complete information you believe is incomplete.</li>
          <li>The right to erasure – You have the right to request that we erase your personal data, under certain conditions.</li>
          {/* Add other rights like restriction of processing, data portability, object to processing as applicable */}
        </ul>
        <p className="mt-2">If you would like to exercise any of these rights, please contact us at [Your Contact Email Address].</p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">7. Cookies and Tracking Technologies</h2>
        <p>
          We may use cookies and similar tracking technologies (like web beacons and pixels) to access or store information. Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Policy [Link to Cookie Policy if you have a separate one, or detail here].
        </p>
        {/* If simple, you can state: "We use cookies primarily for session management and to remember your preferences." */}
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">8. Children&apos;s Privacy</h2>
        <p>
          Our Services are not intended for use by children under the age of 13 [or 16, as appropriate], and we do not knowingly collect personal information from children under this age. If we learn that we have collected personal information from a child under this age, we will take steps to delete such information from our files as soon as possible.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">9. Changes to This Privacy Policy</h2>
        <p>
          We may update this privacy notice from time to time. The updated version will be indicated by an updated &quot;Last Updated&quot; date and the updated version will be effective as soon as it is accessible. We encourage you to review this privacy notice frequently to be informed of how we are protecting your information.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-3">10. Contact Us</h2>
        <p>
          If you have questions or comments about this notice, you may email us at [Your Contact Email Address] or by post to:
        </p>
        <p className="mt-2">
          [Your Company Name, if applicable]<br />
          [Your Address, if applicable]
        </p>
      </section>

      <div className="mt-8 text-center">
        <Link href="/" className="text-blue-600 hover:underline">
          Go back to Home
        </Link>
      </div>
    </div>
  );
}
