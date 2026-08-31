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
                var orig = console.error;
                console.error = function() {
                  var str = "";
                  for (var i = 0; i < arguments.length; i++) {
                    str += (typeof arguments[i] === "object" ? JSON.stringify(arguments[i]) : String(arguments[i])) + " ";
                  }
                  if (
                    str.indexOf("bis_skin_checked") !== -1 ||
                    (str.indexOf("hydrat") !== -1 && str.indexOf("attributes") !== -1) ||
                    str.indexOf("chrome-extension://") !== -1 ||
                    str.indexOf("M_ID") !== -1
                  ) {
                    return;
                  }
                  orig.apply(console, arguments);
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
