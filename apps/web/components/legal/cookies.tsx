export function CookiesContent() {
  return (
    <>
      <section><h2>1. Essential storage</h2><p>PowerPay may use browser storage that is required for application preferences, wallet connection state, security controls, and reliable navigation. These mechanisms are not used to custody wallet keys.</p></section>
      <section><h2>2. Wallet software</h2><p>Third-party wallet extensions or applications may store their own preferences or identifiers under their own terms. PowerPay does not control the storage practices of those wallet providers.</p></section>
      <section><h2>3. Analytics and optional services</h2><p>If analytics, support tooling, or card processing is enabled later, those services may use cookies or similar technologies. Non-essential tracking should be gated behind the consent configuration applicable to the deployment.</p></section>
      <section><h2>4. Managing cookies</h2><p>You can block or remove cookies and local storage through your browser settings. Disabling essential storage may prevent parts of PowerPay from working correctly.</p></section>
    </>
  );
}
