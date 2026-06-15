"use client";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalFetch = window.fetch;
      window.fetch = async function (input, init) {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url.includes("/api/auth/session")) {
          try {
            const response = await originalFetch(input, init);
            if (response.ok) {
              const clone = response.clone();
              const sessionText = await clone.text();
              localStorage.setItem("pwa_cached_session", sessionText);
            }
            return response;
          } catch (err) {
            const offlineCheck = !navigator.onLine;
            if (offlineCheck) {
              const cached = localStorage.getItem("pwa_cached_session");
              if (cached) {
                return new Response(cached, {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                });
              }
            }
            throw err;
          }
        }
        return originalFetch(input, init);
      };
    }
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
