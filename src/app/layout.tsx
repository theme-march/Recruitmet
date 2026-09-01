import type { Metadata } from "next";
import "./globals.css";
import "./components.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Orbit Overseas | Recruitment OS",
  description: "Recruitment and overseas employment management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // 1. Strip bis_skin_checked injected by Bitdefender before React hydration
                try {
                  if (typeof MutationObserver !== 'undefined') {
                    var observer = new MutationObserver(function(mutations) {
                      for (var i = 0; i < mutations.length; i++) {
                        var m = mutations[i];
                        if (m.type === "attributes" && m.attributeName === "bis_skin_checked" && m.target && m.target.removeAttribute) {
                          m.target.removeAttribute("bis_skin_checked");
                        }
                      }
                    });
                    if (document && document.documentElement) {
                      observer.observe(document.documentElement, {
                        subtree: true,
                        attributes: true,
                        attributeFilter: ["bis_skin_checked"]
                      });
                    }
                  }
                } catch(e) {}

                function shouldIgnoreMessage(str) {
                  if (!str) return false;
                  return (
                    str.indexOf("bis_skin_checked") !== -1 ||
                    str.indexOf("A tree hydrated") !== -1 ||
                    str.indexOf("didn't match the client properties") !== -1 ||
                    str.indexOf("did not match") !== -1 ||
                    str.indexOf("Hydration failed") !== -1 ||
                    str.indexOf("hydrat") !== -1 ||
                    str.indexOf("chrome-extension://") !== -1 ||
                    str.indexOf("moz-extension://") !== -1 ||
                    str.indexOf("M_ID") !== -1
                  );
                }

                function isExtensionError(e) {
                  if (!e) return false;
                  var filename = (e && e.filename) || "";
                  var message = (e && e.message) || (typeof e === "string" ? e : (e && e.error && e.error.message) || "");
                  var stack = (e && e.error && e.error.stack) || (typeof e === "object" ? String(e) : "");
                  return (
                    shouldIgnoreMessage(filename) ||
                    shouldIgnoreMessage(message) ||
                    shouldIgnoreMessage(stack)
                  );
                }

                window.addEventListener("error", function(e) {
                  if (isExtensionError(e)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return true;
                  }
                }, true);

                window.addEventListener("unhandledrejection", function(e) {
                  if (isExtensionError(e) || isExtensionError(e.reason)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);

                var origError = console.error;
                console.error = function() {
                  var str = "";
                  for (var i = 0; i < arguments.length; i++) {
                    try {
                      str += (typeof arguments[i] === "object" ? JSON.stringify(arguments[i]) : String(arguments[i])) + " ";
                    } catch(err) {
                      str += String(arguments[i]) + " ";
                    }
                  }
                  if (shouldIgnoreMessage(str)) {
                    return;
                  }
                  origError.apply(console, arguments);
                };

                var origWarn = console.warn;
                console.warn = function() {
                  var str = "";
                  for (var i = 0; i < arguments.length; i++) {
                    try {
                      str += (typeof arguments[i] === "object" ? JSON.stringify(arguments[i]) : String(arguments[i])) + " ";
                    } catch(err) {
                      str += String(arguments[i]) + " ";
                    }
                  }
                  if (shouldIgnoreMessage(str)) {
                    return;
                  }
                  origWarn.apply(console, arguments);
                };
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
