import type { AppProps } from 'next/app';
import { AuthProvider } from '../context/AuthContext';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Head>
      
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
      
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow-x: hidden;
        }
        
        #__next {
          height: 100%;
        }
        
        /* Smooth animations */
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
          /* Prevent zoom on input focus */
          input, textarea, select {
            font-size: 16px !important;
          }
          
          /* Hide scrollbars on mobile */
          ::-webkit-scrollbar {
            display: none;
          }
          
          /* Smooth scrolling */
          html {
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
          }
        }
        
        /* Custom scrollbar for desktop */
        @media (min-width: 769px) {
          ::-webkit-scrollbar {
            width: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: #1f1f1f;
          }
          
          ::-webkit-scrollbar-thumb {
            background: #5f6368;
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: #8e8e8e;
          }
        }
        
        /* Focus styles */
        button:focus,
        input:focus,
        textarea:focus {
          outline: 2px solid #1a73e8;
          outline-offset: 2px;
        }
        
        /* Button hover effects */
        button:not(:disabled):hover {
          transform: translateY(-1px);
        }
        
        button:not(:disabled):active {
          transform: translateY(0);
        }
        
        /* Disable text selection on UI elements */
        button, .no-select {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `}</style>
    </>
  );
} 