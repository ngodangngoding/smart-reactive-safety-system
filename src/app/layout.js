import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const satoshi = localFont({
  variable: "--font-satoshi",
  src: [
    { path: "./fonts/Satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Satoshi-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Satoshi-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Satoshi-900.woff2", weight: "900", style: "normal" },
  ],
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Lone Worker Safety",
  description: "Smart reactive safety monitoring for lone workers",
};

const toastOptions = {
  duration: 4000,
  style: {
    backgroundColor: "var(--card)",
    color: "var(--foreground)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    boxShadow: "var(--elev-toast)",
    padding: "12px 14px",
    minWidth: 280,
    maxWidth: "min(92vw, 480px)",
    fontSize: 13,
    fontWeight: 600,
  },
  success: {
    iconTheme: { primary: "var(--success)", secondary: "var(--success-soft)" },
    style: { backgroundImage: "linear-gradient(var(--success-soft), var(--success-soft))", color: "var(--success-soft-foreground)", border: "1px solid var(--success)" },
  },
  error: {
    iconTheme: { primary: "var(--danger)", secondary: "var(--danger-soft)" },
    style: { backgroundImage: "linear-gradient(var(--danger-soft), var(--danger-soft))", color: "var(--danger-soft-foreground)", border: "1px solid var(--danger-border)" },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${satoshi.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}` }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" toastOptions={toastOptions} />
      </body>
    </html>
  );
}
