import type { Metadata } from "next"; import "./globals.css"; import "./components.css"; import {Toaster} from "sonner"; import {Providers} from "@/components/providers";
export const metadata:Metadata={title:"Orbit Overseas | Recruitment OS",description:"Recruitment and overseas employment management system"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body suppressHydrationWarning><Providers>{children}</Providers><Toaster richColors position="top-right"/></body></html>}
