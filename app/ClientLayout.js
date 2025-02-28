'use client';

import { useEffect, useState } from "react";

export default function ClientLayout({ children }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Return a minimal layout during SSR to avoid hydration errors
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <div suppressHydrationWarning={true}>
      {children}
    </div>
  );
}
