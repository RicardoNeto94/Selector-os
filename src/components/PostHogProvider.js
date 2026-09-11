// Analytics is consent-gated centrally in SiteConsent. A legacy import must not
// initialise tracking before permission.
export default function PostHogProvider({ children }) { return children; }
