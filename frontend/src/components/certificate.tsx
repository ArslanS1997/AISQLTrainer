import React, { useRef } from 'react';

// Helper to get color palette by type/difficulty, inspired by Japanese minimalism and the provided HTML
const getColorByType = (type: 'session' | 'competition' | 'master', difficulty?: string) => {
  if (type === 'session') {
    switch (difficulty?.toLowerCase()) {
      case 'basic':
        return {
          border: '#b3c6e6',
          accent: '#345480',
          gradient: 'linear-gradient(90deg, #8ecae6 0%, #219ebc 100%)',
          name: '#003049',
          subtitle: '#234469',
          text: '#34455c',
          bg: '#f7fafd'
        };
      case 'intermediate':
        return {
          border: '#b3e6c6',
          accent: '#2a6e4f',
          gradient: 'linear-gradient(90deg, #b7e4c7 0%, #40916c 100%)',
          name: '#1b4332',
          subtitle: '#234469',
          text: '#34455c',
          bg: '#f7fafd'
        };
      case 'hard':
        return {
          border: '#e6b3b3',
          accent: '#a63d40',
          gradient: 'linear-gradient(90deg, #f4978e 0%, #a63d40 100%)',
          name: '#a63d40',
          subtitle: '#234469',
          text: '#34455c',
          bg: '#f7fafd'
        };
      default:
        return {
          border: '#b3c6e6',
          accent: '#345480',
          gradient: 'linear-gradient(90deg, #8ecae6 0%, #219ebc 100%)',
          name: '#003049',
          subtitle: '#234469',
          text: '#34455c',
          bg: '#f7fafd'
        };
    }
  }
  if (type === 'competition') {
    return {
      border: '#d1b3e6',
      accent: '#6d3fa9',
      gradient: 'linear-gradient(90deg, #cdb4db 0%, #6d3fa9 100%)',
      name: '#3d0066',
      subtitle: '#234469',
      text: '#34455c',
      bg: '#f7fafd'
    };
  }
  // master
  return {
    border: '#f9c74f',
    accent: '#345480',
    gradient: 'linear-gradient(90deg, #f9c74f 0%, #f9844a 100%)',
    name: '#003049',
    subtitle: '#234469',
    text: '#34455c',
    bg: '#f7fafd'
  };
};

interface CertificateProps {
  userName: string;
  type: 'session' | 'competition' | 'master';
  session?: {
    session_id: string;
    title: string;
    difficulty: string;
    score: number;
    total_points: number;
    completion_date: string;
    topic: string;
    certificate_url: string;
    queries?: any[];
    correct_answers?: number;
  };
  competition?: {
    name: string;
    rank?: number; // Make rank optional since we're not using it
    date: string;
    certificate_url: string;
    // Add new properties for the User vs AI competition:
    result: 'win' | 'lose' | 'tie';
    user_score: number;
    ai_score: number;
    difficulty: string;
  };
  master?: {
    date: string;
    certificate_url: string;
  };
}

// Helper to render user's name with large initials
function RenderNameWithLargeInitials({
  name,
  fontSize = '1.7rem',
  color = '#003049',
  fontFamily = "'Merriweather', serif",
  letterSpacing = 1.5,
  style = {},
}: {
  name: string;
  fontSize?: string | number;
  color?: string;
  fontFamily?: string;
  letterSpacing?: number;
  style?: React.CSSProperties;
}) {
  // Function to properly capitalize names
  const capitalizeName = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Split name into words, capitalize properly
  const capitalizedName = capitalizeName(name.trim());
  const words = capitalizedName.split(/\s+/);
  
  return (
    <span
      className="cert-name"
      style={{
        fontSize,
        fontFamily,
        fontWeight: 700,
        color,
        marginBottom: 10,
        letterSpacing,
        display: 'inline-block',
        ...style,
      }}
    >
      {words.map((word, i) =>
        word.length > 0 ? (
          <span key={i} style={{ marginRight: 4 }}>
            <span style={{
              fontSize: typeof fontSize === 'number'
                ? fontSize * 1.5
                : `calc(${fontSize} * 1.5)`,
              verticalAlign: 'middle',
              lineHeight: 1,
              display: 'inline-block'
            }}>
              {word[0]}
            </span>
            <span style={{ marginLeft: 1 }}>
              {word.slice(1)}
            </span>
          </span>
        ) : null
      )}
    </span>
  );
}

// Official signature block using Monsieur La Doulaise font, always centered
const SignatureBlock = ({
  name,
  title,
  accent,
  fontSize = 32,
}: {
  name: string;
  title: string;
  accent: string;
  fontSize?: number;
}) => (
  <div className="signature-block" style={{ textAlign: 'center', width: '100%', margin: '0 auto' }}>
    <div
      style={{
        fontFamily: "'Brush Script MT', 'Lucida Handwriting', 'Dancing Script', cursive", // Changed to cursive
        fontSize,
        color: '#000000', // Changed to black for signature
        fontWeight: 'normal',
        marginBottom: 2,
        letterSpacing: 1,
        lineHeight: 1.1,
        userSelect: 'none',
        textAlign: 'center',
        fontStyle: 'italic', // Added italic
        textShadow: '0 1px 2px rgba(0,0,0,0.1)', // Added subtle shadow
      }}
    >
      {name}
    </div>
    <div
      style={{
        fontFamily: 'Montserrat, Arial, sans-serif',
        fontSize: 13,
        color: '#234469',
        fontWeight: 500,
        letterSpacing: 0.5,
        opacity: 0.95,
        marginTop: 2,
        textAlign: 'center',
      }}
    >
      {title}
    </div>
  </div>
);

// Download PDF button using browser's print-to-PDF
const DownloadPDFButton: React.FC<{ targetRef: React.RefObject<HTMLDivElement>; fileName: string }> = ({ targetRef, fileName }) => {
  const handleDownload = () => {
    if (!targetRef.current) return;

    // Create a new window with the certificate content
    const printContents = targetRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) return;

    // Copy stylesheets
    let styles = '';
    Array.from(document.styleSheets).forEach((styleSheet: any) => {
      try {
        if (styleSheet.href) {
          styles += `<link rel="stylesheet" type="text/css" href="${styleSheet.href}">`;
        } else if (styleSheet.cssRules) {
          styles += '<style>';
          Array.from(styleSheet.cssRules).forEach((rule: any) => {
            styles += rule.cssText;
          });
          styles += '</style>';
        }
      } catch (e) {
        // Ignore CORS issues
      }
    });

    // Add Google Fonts for signature and Montserrat/Merriweather
    styles += `
      <link href="https://fonts.googleapis.com/css2?family=Brush+Script+MT&family=Dancing+Script:wght@400;700&family=Montserrat:wght@400;500;700;800&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">
    `;

    // Compose the printable HTML
    printWindow.document.write(`
      <html>
        <head>
          <title>${fileName.replace('.pdf', '')}</title>
          <meta name="viewport" content="width=1200, initial-scale=1.0">
          ${styles}
          <style>
            body {
              background: #f7fafd;
              margin: 0;
              padding: 0;
            }
            .print-certificate-container {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
          </style>
        </head>
        <body>
          <div class="print-certificate-container">
            <div style="width: 900px; margin: auto;">
              ${printContents}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <button
      onClick={handleDownload}
      className="mt-4 px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded shadow font-semibold hover:from-yellow-500 hover:to-orange-600 transition"
    >
      Download PDF
    </button>
  );
};

export const Certificate: React.FC<CertificateProps> = ({ userName, type, session, competition, master }) => {
  const certRef = useRef<HTMLDivElement>(null);

  // Change this from const to let:
  let color = getColorByType(type, session?.difficulty);
  let fileName = 'certificate.pdf';

  // Certificate content by type
  let certContent: React.ReactNode = null;

  // Decorative minimalist line
  const DecorativeLine = (
    <div
      className="cert-line"
      style={{
        width: 120,
        height: 4,
        background: color.gradient,
        margin: '0 auto 24px auto',
        borderRadius: 4,
      }}
    />
  );

  // Decorative minimalist seal (no stars)
  const Seal = (
    <div className="seal" style={{ textAlign: 'center', fontSize: 20, color: color.accent, fontWeight: 700 }}>
      <span style={{ fontFamily: 'Montserrat, Arial, sans-serif', fontSize: 16, color: color.accent, fontWeight: 700, letterSpacing: 1.2 }}>
        FirebirdTech
      </span>
    </div>
  );

  if (type === 'session' && session) {
    fileName = `SQL_Trainer_Session_Certificate_${session.session_id}.pdf`;
    certContent = (
      <>
        <div className="cert-title" style={{
          fontFamily: "'Merriweather', serif",
          fontSize: '2.3rem',
          color: color.accent,
          textAlign: 'center',
          marginBottom: 12,
          fontWeight: 700,
          letterSpacing: 1.5,
        }}>
          Certificate of Completion
        </div>
        {DecorativeLine}
        <div className="cert-subtitle" style={{
          color: color.subtitle,
          fontSize: '1.1rem',
          textAlign: 'center',
          letterSpacing: 2,
          marginBottom: 32,
          fontWeight: 500,
        }}>
          In Recognition of Achievement
        </div>
        <div className="cert-body" style={{
          color: color.text,
          fontSize: '1.08rem',
          textAlign: 'center',
          marginBottom: 32,
          fontFamily: "'Montserrat', Arial, sans-serif",
        }}>
          This certifies that<br />
          <RenderNameWithLargeInitials
            name={userName}
            fontSize="1.7rem"
            color={color.name}
            fontFamily="'Merriweather', serif"
            letterSpacing={1.5}
            style={{ marginBottom: 10 }}
          />
          <br />
          has successfully completed the session:<br />
          <b>{session.title || 'SQL Practice Session'}</b>
          <br />
          <span style={{ fontSize: 15, color: color.text }}>
            <span style={{ fontWeight: 500 }}>Topic:</span> {session.topic}
            <br />
            <span style={{ fontWeight: 500 }}>Difficulty:</span> <span style={{ textTransform: 'capitalize' }}>{session.difficulty}</span>
            <br />
            <span style={{ fontWeight: 500 }}>Score:</span> {session.correct_answers || Math.round(session.score * session.total_points / 100)}/{session.total_points} ({session.score}%)
            <br />
            <span style={{ fontWeight: 500 }}>Date:</span> {new Date(session.completion_date).toLocaleDateString()}
          </span>
          <br /><br />
          <span style={{ color: color.accent, fontWeight: 600 }}>Awarded by SQL Trainer AI</span>
        </div>
        <div className="cert-footer" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 44,
          color: color.subtitle,
          fontSize: '1rem',
        }}>
          <SignatureBlock name="Arslan Shahid" title="Managing Director" accent={color.accent} fontSize={38} />
          <div style={{ height: 18 }} />
          {Seal}
        </div>
        <div style={{
          marginTop: 36,
          textAlign: 'center',
          fontFamily: 'Montserrat, Arial, sans-serif',
          fontSize: 13,
          color: '#64748b',
          fontWeight: 500,
          letterSpacing: 0.5
        }}>
          <span style={{ fontWeight: 700, color: color.accent }}>FirebirdTech Pte. Ltd.</span>
          <br />
          <span style={{
            fontSize: 12,
            color: '#94a3b8',
            fontWeight: 400,
            letterSpacing: 0.2
          }}>
            68 Circular Road, #02-01, 049422, Singapore
          </span>
        </div>
      </>
    );
  } else if (type === 'competition' && competition) {
    color = {
      border: '#a21caf', // purple-700
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      accent: '#a21caf',
      gradient: 'linear-gradient(90deg, #a21caf 0%, #7c3aed 100%)',
      name: '#581c87',
      subtitle: '#6b21a8'
    };
    fileName = `SQL_Trainer_Competition_Certificate_${competition.date.replace(/\//g, '-')}.pdf`;
    certContent = (
      <>
        <div className="cert-title" style={{
          fontFamily: "'Merriweather', serif",
          fontSize: '2.3rem',
          color: color.accent,
          textAlign: 'center',
          marginBottom: 12,
          fontWeight: 700,
          letterSpacing: 1.5,
        }}>
          Competition Certificate
        </div>
        {DecorativeLine}
        <div className="cert-subtitle" style={{
          color: color.subtitle,
          fontSize: '1.1rem',
          textAlign: 'center',
          letterSpacing: 2,
          marginBottom: 32,
          fontWeight: 500,
        }}>
          User vs AI SQL Challenge
        </div>
        <div className="cert-body" style={{
          color: color.text,
          fontSize: '1.08rem',
          textAlign: 'center',
          marginBottom: 32,
          fontFamily: "'Montserrat', Arial, sans-serif",
        }}>
          This certifies that<br />
          <RenderNameWithLargeInitials
            name={userName}
            fontSize="1.7rem"
            color={color.name}
            fontFamily="'Merriweather', serif"
            letterSpacing={1.5}
            style={{ marginBottom: 10 }}
          />
          <br />
          has achieved <b>Victory</b> in the SQL Competition<br />
          competing against our AI Text2SQL system
          <br />
          <span style={{ fontSize: 15, color: color.text }}>
            <span style={{ fontWeight: 500 }}>Result:</span> {competition.result === 'win' ? 'VICTORY' : competition.result === 'lose' ? 'DEFEAT' : 'TIE'}<br />
            <span style={{ fontWeight: 500 }}>Score:</span> {competition.user_score} vs AI: {competition.ai_score}<br />
            <span style={{ fontWeight: 500 }}>Date:</span> {new Date(competition.date).toLocaleDateString()}
          </span>
          <br /><br />
          <span style={{ color: color.accent, fontWeight: 600 }}>Awarded by SQL Trainer AI</span>
        </div>
        <div className="cert-footer" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 44,
          color: color.subtitle,
          fontSize: '1rem',
        }}>
          <SignatureBlock name="Arslan Shahid" title="Managing Director" accent={color.accent} fontSize={38} />
          <div style={{ height: 18 }} />
          {Seal}
        </div>
        <div style={{
          marginTop: 36,
          textAlign: 'center',
          fontFamily: 'Montserrat, Arial, sans-serif',
          fontSize: 13,
          color: '#64748b',
          fontWeight: 500,
          letterSpacing: 0.5
        }}>
          <span style={{ fontWeight: 700, color: color.accent }}>FirebirdTech Pte. Ltd.</span>
          <br />
          <span style={{
            fontSize: 12,
            color: '#94a3b8',
            fontWeight: 400,
            letterSpacing: 0.2
          }}>
            68 Circular Road, #02-01, 049422, Singapore
          </span>
        </div>
      </>
    );
  } else if (type === 'master' && master) {
    fileName = `SQL_Trainer_Master_Certificate.pdf`;
    certContent = (
      <>
        <div className="cert-title" style={{
          fontFamily: "'Merriweather', serif",
          fontSize: '2.6rem',
          color: color.accent,
          textAlign: 'center',
          marginBottom: 12,
          fontWeight: 700,
          letterSpacing: 1.5,
        }}>
          Certificate of Mastery
        </div>
        {DecorativeLine}
        <div className="cert-subtitle" style={{
          color: color.subtitle,
          fontSize: '1.2rem',
          textAlign: 'center',
          letterSpacing: 3,
          marginBottom: 36,
          fontWeight: 600,
        }}>
          In Recognition of Outstanding Achievement
        </div>
        <div className="cert-body" style={{
          color: color.text,
          fontSize: '1.13rem',
          textAlign: 'center',
          marginBottom: 32,
          fontFamily: "'Montserrat', Arial, sans-serif",
        }}>
          This certifies that<br />
          <RenderNameWithLargeInitials
            name={userName}
            fontSize="2rem"
            color={color.name}
            fontFamily="'Merriweather', serif"
            letterSpacing={2}
            style={{ marginBottom: 12 }}
          />
          <br />
          has successfully achieved the level of <b>Master in SQL</b>
          <br />
          demonstrating expertise in database design, querying, performance optimization,
          <br />
          and advanced SQL problem-solving.
          <br /><br />
          Awarded this day: <b>{new Date(master.date).toLocaleDateString()}</b>
          <br /><br />
          <span style={{ color: color.accent, fontWeight: 600 }}>Awarded by SQL Trainer AI</span>
        </div>
        <div className="cert-footer" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 48,
          color: color.subtitle,
          fontSize: '1rem',
        }}>
          <SignatureBlock name="Arslan Shahid" title="Managing Director" accent={color.accent} fontSize={38} />
          <div style={{ height: 18 }} />
          {Seal}
        </div>
        <div style={{
          marginTop: 36,
          textAlign: 'center',
          fontFamily: 'Montserrat, Arial, sans-serif',
          fontSize: 13,
          color: '#64748b',
          fontWeight: 500,
          letterSpacing: 0.5
        }}>
          <span style={{ fontWeight: 700, color: color.accent }}>FirebirdTech Pte. Ltd.</span>
          <br />
          <span style={{
            fontSize: 12,
            color: '#94a3b8',
            fontWeight: 400,
            letterSpacing: 0.2
          }}>
            68 Circular Road, #02-01, 049422, Singapore
          </span>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center py-10" style={{ background: color.bg }}>
      <div
        ref={certRef}
        className="certificate-container relative w-full max-w-3xl mx-auto"
        style={{
          maxWidth: 800,
          margin: '40px auto',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 24px rgba(45,53,69,0.09)',
          border: `10px solid ${color.border}`,
          padding: '48px 40px',
          fontFamily: "'Montserrat', Arial, sans-serif",
          position: 'relative',
        }}
      >
        {/* Watermark */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '60%',
            transform: 'translate(-50%, -50%)',
            opacity: 0.04,
            fontSize: 110,
            fontWeight: 900,
            letterSpacing: 8,
            color: color.accent,
            pointerEvents: 'none',
            userSelect: 'none',
            fontFamily: 'Montserrat, Arial, sans-serif',
            zIndex: 0,
            whiteSpace: 'nowrap',
            textShadow: '0 2px 8px rgba(0,0,0,0.10)'
          }}
        >
          FIREBIRDTECH
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          {certContent}
        </div>
      </div>
      <DownloadPDFButton targetRef={certRef} fileName={fileName} />
    </div>
  );
};
