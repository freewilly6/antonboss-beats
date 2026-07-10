// src/components/LegalLinks.jsx
//
// Terms and Privacy live in modals rather than routes. Shared by the scroll
// page's SiteFooter and the standalone routes' Footer, so the copy exists once.

import React, { useEffect, useRef, useState } from 'react';

function LegalModal({ title, onClose, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    const onClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
      style={{ zIndex: 'var(--z-dialog)' }}
    >
      {/* `relative` so the close button anchors here and not to the viewport. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label={title}
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto border border-[var(--fg-20)] bg-black p-8"
      >
        <button
          onClick={onClose}
          className="ab-btn ab-btn-bare ab-btn-sm absolute right-4 top-4"
          aria-label="Close"
        >
          ×
        </button>

        <h2 className="ab-label mb-8">{title}</h2>
        <div className="ab-body space-y-5">{children}</div>
      </div>
    </div>
  );
}

function Clause({ heading, children }) {
  return (
    <>
      <h3 className="ab-label mt-8 !text-[var(--fg-70)]">{heading}</h3>
      <p>{children}</p>
    </>
  );
}

export default function LegalLinks({ className = '' }) {
  const [open, setOpen] = useState(null); // 'terms' | 'privacy' | null

  return (
    <>
      <button onClick={() => setOpen('terms')} className={`ab-label hover:text-white ${className}`}>
        Terms of Use
      </button>
      <button onClick={() => setOpen('privacy')} className={`ab-label hover:text-white ${className}`}>
        Privacy Policy
      </button>

      {open === 'terms' && (
        <LegalModal title="Terms of Use" onClose={() => setOpen(null)}>
          <p>
            Welcome to Anton Boss Beats. By using this website, you agree to the following Terms of
            Use. If you do not agree, please do not use the website.
          </p>
          <Clause heading="1. Intellectual Property">
            All beats, audio files, and content on this site are the property of Anton Boss and are
            protected by copyright laws.
          </Clause>
          <Clause heading="2. License Terms">
            When you purchase a license, you are granted specific rights outlined in that license.
            You may not use the beats beyond what is allowed in the license.
          </Clause>
          <Clause heading="3. Prohibited Uses">
            You may not resell, redistribute, or sub-license any beats or content from this website
            without written permission.
          </Clause>
          <Clause heading="4. Disclaimer">
            All content is provided &quot;as is.&quot; We make no warranties regarding the accuracy
            or fitness for a particular purpose.
          </Clause>
          <Clause heading="5. Limitation of Liability">
            We are not liable for any damages resulting from your use of this website or purchased
            content.
          </Clause>
          <Clause heading="6. Governing Law">
            These Terms of Use are governed by and construed in accordance with the laws of your
            jurisdiction.
          </Clause>
          <Clause heading="7. Changes to Terms">
            We reserve the right to update these Terms of Use at any time. Changes will be posted on
            this page.
          </Clause>
          <p className="pt-4">For any questions, please contact antonbosspd@gmail.com.</p>
        </LegalModal>
      )}

      {open === 'privacy' && (
        <LegalModal title="Privacy Policy" onClose={() => setOpen(null)}>
          <p>
            This Privacy Policy explains how Anton Boss (&quot;we&quot;, &quot;our&quot;, or
            &quot;us&quot;) collects, uses, and protects your information when you use this website.
          </p>
          <Clause heading="1. Information We Collect">
            Information you provide through forms (such as name, email address, purchase details).
            Automatically collected information (such as IP address, browser type, device
            information) through cookies and analytics tools. This website is hosted on Vercel.
            Certain technical information such as IP address and browser type may be collected
            automatically by Vercel for security and analytics purposes. Please refer to{' '}
            <a
              href="https://vercel.com/legal/privacy-policy"
              className="text-[var(--accent)] underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vercel&rsquo;s Privacy Policy
            </a>{' '}
            for more information.
          </Clause>
          <Clause heading="2. How We Use Your Information">
            To process purchases and transactions. To send important updates or respond to
            inquiries. To analyze website performance and improve user experience. We do not sell or
            rent your information to third parties.
          </Clause>
          <Clause heading="3. Cookies">
            We use cookies to provide a better browsing experience and for analytics purposes. You
            can manage your cookie preferences through your browser settings.
          </Clause>
          <Clause heading="4. Security">
            We take reasonable steps to protect your information. However, no system is completely
            secure. Use this website at your own risk.
          </Clause>
          <Clause heading="5. Your Rights">
            You may request access, correction, or deletion of your personal data by contacting us.
          </Clause>
          <Clause heading="6. Changes to This Policy">
            We may update this Privacy Policy at any time. Changes will be posted on this page.
          </Clause>
          <p className="pt-4">
            If you have any questions about this Privacy Policy, please contact us at
            antonbosspd@gmail.com.
          </p>
        </LegalModal>
      )}
    </>
  );
}
