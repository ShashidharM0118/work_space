import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import DemoModal from '../components/DemoModal';
import VirtualOfficeBackground from '../components/VirtualOfficeBackground';

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, -50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -100]);
  const [showDemo, setShowDemo] = useState(false);

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
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
          Redirecting to your workspace...
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>NexOffice - Next Generation Virtual Office Platform</title>
        <meta name="description" content="Transform your remote work experience with NexOffice - the premium virtual office platform for modern teams" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏢</text></svg>" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        fontFamily: '"Inter", sans-serif',
        backgroundColor: '#0f172a',
        color: 'white',
        overflow: 'hidden'
      }}>
        {/* Fixed Navigation */}
        <motion.nav 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            padding: '20px 40px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          {/* Logo */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{
              fontSize: '28px'
            }}>
              🏢
            </div>
            <span style={{
              fontSize: '24px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              NexOffice
            </span>
          </motion.div>

          {/* Navigation Links */}
          <div style={{
            display: 'flex',
            gap: '32px',
            alignItems: 'center'
          }}>
            <Link href="#features" style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'color 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#f1f5f9'}
            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              Features
            </Link>

            <Link href="#about" style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'color 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#f1f5f9'}
            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              About
            </Link>
          </div>

          {/* Auth Buttons */}
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center'
          }}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/login" style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#f1f5f9',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
              }}
              >
                Sign In
              </Link>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/signup" style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              >
                Get Started
              </Link>
            </motion.div>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <section style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          overflow: 'hidden'
        }}>
          {/* Three.js Virtual Office Background */}
          <VirtualOfficeBackground />
          
          {/* Background Elements */}
          <motion.div
            style={{ y: y1 }}
            className="absolute inset-0"
          >
            <div style={{
              position: 'absolute',
              top: '10%',
              left: '10%',
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(40px)',
              zIndex: 1
            }} />
          </motion.div>
          
          <motion.div
            style={{ y: y2 }}
            className="absolute inset-0"
          >
            <div style={{
              position: 'absolute',
              top: '60%',
              right: '10%',
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(40px)',
              zIndex: 1
            }} />
          </motion.div>

          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 40px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 10
          }}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={{
                display: 'inline-block',
                padding: '8px 20px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '50px',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '32px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                color: '#93c5fd'
              }}
            >
              ✨ Next Generation Workspace
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              style={{
                fontSize: '72px',
                fontWeight: '900',
                margin: '0 0 24px 0',
                lineHeight: '1.1',
                background: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Transform Your
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Remote Workspace
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              style={{
                fontSize: '24px',
                margin: '0 0 48px 0',
                lineHeight: '1.5',
                color: '#94a3b8',
                maxWidth: '600px',
                margin: '0 auto 48px auto'
              }}
            >
              Experience seamless collaboration with enterprise-grade virtual offices, 
              HD video conferencing, and real-time team synchronization.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              style={{
                display: 'flex',
                gap: '20px',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '80px'
              }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/signup" style={{
                  padding: '20px 40px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.3)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                >
                  🚀 Start Free Trial
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <button
                  onClick={() => setShowDemo(true)}
                  style={{
                    padding: '20px 40px',
                    backgroundColor: 'rgba(148, 163, 184, 0.1)',
                    color: '#f1f5f9',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '12px',
                    fontSize: '18px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  ▶️ Watch Demo
                </button>
              </motion.div>
            </motion.div>

            {/* Key Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '60px',
                marginTop: '60px'
              }}
            >
              {[
                { icon: '🚀', label: 'Launch Ready' },
                { icon: '🔒', label: 'Secure by Design' },
                { icon: '⚡', label: 'Lightning Fast' }
              ].map((benefit, index) => (
                <div key={index} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '32px',
                    marginBottom: '8px'
                  }}>
                    {benefit.icon}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    color: '#64748b',
                    fontWeight: '500'
                  }}>
                    {benefit.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" style={{
          padding: '120px 40px',
          backgroundColor: '#1e293b',
          position: 'relative'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              style={{ textAlign: 'center', marginBottom: '80px' }}
            >
              <h2 style={{
                fontSize: '48px',
                fontWeight: '800',
                margin: '0 0 24px 0',
                background: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Powerful Features for Modern Teams
              </h2>
              <p style={{
                fontSize: '20px',
                color: '#94a3b8',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                Everything you need to create immersive virtual workspaces and boost team productivity
              </p>
            </motion.div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '40px'
            }}>
              {[
                {
                  icon: '🎥',
                  title: 'Video Conferencing',
                  description: 'Crystal clear video calls with advanced noise cancellation and real-time collaboration tools'
                },
                {
                  icon: '🖥️',
                  title: 'Screen Sharing & Control',
                  description: 'Share your screen with pixel-perfect quality and allow remote control for seamless collaboration'
                },
                {
                  icon: '🎨',
                  title: 'Interactive Whiteboard',
                  description: 'Brainstorm and visualize ideas together with our advanced collaborative whiteboard tools'
                },
                {
                  icon: '💬',
                  title: 'Real-time Messaging',
                  description: 'Instant messaging with file sharing, emoji reactions, and threaded conversations'
                },
                {
                  icon: '🏢',
                  title: 'Virtual Office Spaces',
                  description: 'Create custom virtual environments that reflect your company culture and workflow'
                },
                {
                  icon: '🔐',
                  title: 'OAuth Integrated',
                  description: 'Seamless authentication with popular OAuth providers for secure and easy access'
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                  style={{
                    padding: '40px',
                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: '16px',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.5)';
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)';
                  }}
                >
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '24px'
                  }}>
                    {feature.icon}
                  </div>
                  <h3 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    margin: '0 0 16px 0',
                    color: '#f1f5f9'
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    fontSize: '16px',
                    color: '#94a3b8',
                    lineHeight: '1.6',
                    margin: 0
                  }}>
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>



        {/* About Section */}
        <section id="about" style={{
          padding: '120px 40px',
          backgroundColor: '#1e293b'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
            alignItems: 'center'
          }}>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 style={{
                fontSize: '48px',
                fontWeight: '800',
                margin: '0 0 24px 0',
                background: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Built for the Future of Work
              </h2>
              <p style={{
                fontSize: '18px',
                color: '#94a3b8',
                lineHeight: '1.7',
                marginBottom: '32px'
              }}>
                NexOffice is being created by a team of remote work experts who understand the challenges 
                of distributed teams. We're building a platform that doesn't just replicate in-person 
                meetings, but enhances them with powerful digital-first features.
              </p>
              <p style={{
                fontSize: '18px',
                color: '#94a3b8',
                lineHeight: '1.7',
                marginBottom: '40px'
              }}>
                Designed to scale from small startups to large enterprises, 
                NexOffice will be the virtual office platform that grows with your business.
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/signup" style={{
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'inline-block',
                  transition: 'all 0.3s ease'
                }}>
                  Start Your Journey
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px'
              }}
            >
              {[
                { metric: '99.9%', label: 'Target Uptime' },
                { metric: '< 50ms', label: 'Target Latency' },
                { metric: '256-bit', label: 'Encryption' },
                { metric: '24/7', label: 'Planned Support' }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  style={{
                    padding: '30px',
                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: '12px',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    textAlign: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)';
                  }}
                >
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: '#3b82f6',
                    marginBottom: '8px'
                  }}>
                    {item.metric}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#64748b',
                    fontWeight: '500'
                  }}>
                    {item.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          padding: '60px 40px 40px',
          backgroundColor: '#0f172a',
          borderTop: '1px solid rgba(148, 163, 184, 0.1)'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '28px' }}>🏢</div>
              <span style={{
                fontSize: '24px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                NexOffice
              </span>
            </div>
            
            <p style={{
              fontSize: '16px',
              color: '#64748b',
              marginBottom: '32px'
            }}>
              Next Generation Virtual Office Platform
            </p>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '40px',
              marginBottom: '40px'
            }}>
              {['Privacy Policy', 'Terms of Service', 'Contact', 'Support'].map((link, index) => (
                <a key={index} href="#" style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '14px',
                  transition: 'color 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#f1f5f9'}
                onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                >
                  {link}
                </a>
              ))}
            </div>
            
            <p style={{
              fontSize: '14px',
              color: '#475569',
              margin: 0
            }}>
              © 2024 NexOffice. All rights reserved.
            </p>
          </div>
        </footer>
      </div>

      {/* Demo Modal */}
      <DemoModal isOpen={showDemo} onClose={() => setShowDemo(false)} />

      <style jsx>{`
        @media (max-width: 768px) {
          nav {
            padding: 16px 20px !important;
          }
          
          nav > div:first-child span {
            font-size: 20px !important;
          }
          
          nav > div:nth-child(2) {
            display: none !important;
          }
          
          nav > div:last-child {
            gap: 8px !important;
          }
          
          nav > div:last-child a {
            padding: 8px 16px !important;
            font-size: 14px !important;
          }
          
          h1 {
            font-size: 48px !important;
          }
          
          .hero-buttons {
            flex-direction: column !important;
            gap: 16px !important;
          }
          
          .hero-buttons a {
            width: 100% !important;
            justify-content: center !important;
          }
          
          .stats {
            flex-direction: column !important;
            gap: 30px !important;
          }
          
          .about-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          
          .metrics-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </>
  );
}