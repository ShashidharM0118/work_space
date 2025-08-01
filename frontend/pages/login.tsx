import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const router = useRouter();
  const { user, signInWithGoogle, signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signInWithEmail(email, password);
      // Success - user will be redirected by useEffect
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Failed to sign in. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');
    
    const timeoutId = setTimeout(() => {
      setIsGoogleLoading(false);
      setError('Authentication timed out. Please try again.');
    }, 30000);
    
    try {
      const result = await signInWithGoogle();
      clearTimeout(timeoutId);
      
      if (result === null) {
        return;
      }
      
      setIsGoogleLoading(false);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Google sign in error:', error);
      setIsGoogleLoading(false);
      
      let errorMessage = 'Failed to sign in with Google. Please try again.';
      
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized for Google Sign-In. Please contact support.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Pop-up was blocked. Please allow pop-ups and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
    }
  };

  if (user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Inter", sans-serif'
      }}>
        <div style={{
          color: 'white',
          textAlign: 'center',
          fontSize: '18px'
        }}>
          Redirecting to dashboard...
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Sign In - NexOffice</title>
        <meta name="description" content="Sign in to your NexOffice workspace" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏢</text></svg>" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '"Inter", sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative'
      }}>
        {/* Background pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '20px 20px',
          opacity: 0.5
        }} />

        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '24px',
          padding: '48px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          {/* Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              boxShadow: '0 10px 25px -5px rgba(102, 126, 234, 0.4)'
            }}>
              🏢
            </div>

            <h1 style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#0F172A',
              margin: '0 0 8px 0',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Welcome Back
            </h1>

            <p style={{
              fontSize: '16px',
              color: '#64748B',
              margin: 0
            }}>
              Sign in to your NexOffice workspace
            </p>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            style={{
              width: '100%',
              padding: '16px 24px',
              backgroundColor: isGoogleLoading ? '#94A3B8' : 'white',
              color: isGoogleLoading ? 'white' : '#333',
              border: '2px solid #E2E8F0',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isGoogleLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              transition: 'all 0.3s ease',
              marginBottom: '24px',
              opacity: isGoogleLoading ? 0.8 : 1
            }}
            onMouseOver={(e) => !isGoogleLoading && (e.currentTarget.style.borderColor = '#667eea')}
            onMouseOut={(e) => !isGoogleLoading && (e.currentTarget.style.borderColor = '#E2E8F0')}
          >
            {isGoogleLoading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Signing in...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '32px 0',
            color: '#94A3B8',
            fontSize: '14px'
          }}>
            <div style={{
              flex: 1,
              height: '1px',
              backgroundColor: '#E2E8F0'
            }} />
            <span style={{
              padding: '0 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)'
            }}>
              or continue with email
            </span>
            <div style={{
              flex: 1,
              height: '1px',
              backgroundColor: '#E2E8F0'
            }} />
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#374151'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease',
                  backgroundColor: 'white'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (email) {
                      // Add forgot password logic here
                      alert('Password reset email would be sent to: ' + email);
                    } else {
                      alert('Please enter your email address first');
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#667eea',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    padding: '0'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease',
                  backgroundColor: 'white'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              style={{
                width: '100%',
                padding: '16px 24px',
                backgroundColor: isLoading || !email || !password ? '#94A3B8' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading || !email || !password ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
                marginBottom: '24px'
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '16px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              color: '#DC2626',
              fontSize: '14px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              {error}
            </div>
          )}

          {/* Footer Links */}
          <div style={{
            textAlign: 'center',
            fontSize: '14px',
            color: '#64748B'
          }}>
            <p style={{ margin: '0 0 16px 0' }}>
              Don't have an account?{' '}
              <Link href="/signup" style={{
                color: '#667eea',
                textDecoration: 'none',
                fontWeight: '600'
              }}>
                Sign up
              </Link>
            </p>
            
            <Link href="/" style={{
              color: '#64748B',
              textDecoration: 'none',
              fontSize: '13px'
            }}>
              ← Back to home
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}