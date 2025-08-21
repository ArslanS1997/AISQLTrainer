import React from 'react';

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
    rank?: number;
    date: string;
    certificate_url: string;
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

export const Certificate: React.FC<CertificateProps> = ({ userName, type, session, competition, master }) => {
  // Add a print function that isolates the current certificate
  // Remove the handlePrint function and use window.print() directly
  // Add a download PDF function

  // Add this function to handle LinkedIn sharing with proper type checking
  const handleLinkedInShare = () => {
    const cert = session || competition || master;
    if (!cert) return;
    
    // Handle different certificate types
    let certificateText = '';
    let certificateTitle = '';
    
    if ('title' in cert && 'score' in cert) {
      // Session certificate
      certificateText = `I just completed ${cert.title} with a score of ${cert.score}% on SQLTutor AI! 🎉 #SQL #Learning #Certification`;
      certificateTitle = cert.title;
    } else if ('date' in cert) {
      // Competition certificate
      certificateText = `I just won an SQL Competition on SQLTutor AI! 🏆 #SQL #Competition #Victory`;
      certificateTitle = 'SQL Competition Victory';
    } else {
      // Fallback
      certificateText = `I just earned a certificate on SQLTutor AI! 🎉 #SQL #Learning #Certification`;
      certificateTitle = 'SQL Certificate';
    }
    
    // LinkedIn sharing URL
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(certificateTitle)}&summary=${encodeURIComponent(certificateText)}`;
    
    // Open LinkedIn sharing in a new window
    window.open(linkedInUrl, '_blank', 'width=600,height=600');
  };

  const renderSessionCertificate = () => (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-blue-800 mb-4">Certificate of Achievement</h1>
      <h2 className="text-xl text-blue-600 mb-8">SQL Fundamentals Mastery</h2>
      
      <div className="border-2 border-dashed border-blue-200 rounded-lg p-8 mb-8">
        <p className="text-lg text-gray-700 mb-4">This certifies that</p>
        <h3 className="text-2xl font-bold text-blue-800 mb-2">{userName}</h3>
        {userName.includes('(') && userName.includes(')') && (
          <p className="text-xs text-gray-400 mb-4">
            {userName.match(/\(([^)]+)\)/)?.[1]}
          </p>
        )}
        <p className="text-base text-gray-700 mb-6">
          has successfully completed the SQL Fundamentals course with a score of
        </p>
        <div className="text-4xl font-bold text-blue-800 mb-6">{session?.score}%</div>
        
        <div className="text-sm text-gray-600">
          <div className="mb-2">
            <span className="font-semibold">Topic:</span> {session?.topic} | 
            <span className="font-semibold"> Difficulty:</span> {session?.difficulty}
          </div>
          <div>
            <span className="font-semibold">Completed:</span> {session?.completion_date}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between text-sm text-gray-600 border-t pt-6">
        <div>
          <p>Issued: {new Date().toLocaleDateString()}</p>
          <p>ID: #SQL-{new Date().getFullYear()}-{String(session?.session_id).padStart(3, '0')}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-blue-800">FireBirdTech</p>
          <p>Singapore</p>
          <p className="text-xs text-gray-500">sqltrainerai.com</p>
        </div>
      </div>
    </div>
  );

  const renderCompetitionCertificate = () => (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-purple-800 mb-4">Competition Certificate</h1>
      <h2 className="text-xl text-purple-600 mb-8">User vs AI SQL Challenge</h2>
      
      <div className="border-2 border-dashed border-purple-200 rounded-lg p-8 mb-8">
        <p className="text-lg text-gray-700 mb-4">This certifies that</p>
        <h3 className="text-2xl font-bold text-purple-800 mb-2">{userName}</h3>
        {userName.includes('(') && userName.includes(')') && (
          <p className="text-xs text-gray-400 mb-4">
            {userName.match(/\(([^)]+)\)/)?.[1]}
          </p>
        )}
        <p className="text-base text-gray-700 mb-6">
          has achieved <span className="font-bold">Victory</span> in the SQL Competition
        </p>
        
        <div className="text-sm text-gray-600 mb-6">
          <div className="mb-2">
            <span className="font-semibold">Result:</span> {competition?.result === 'win' ? 'VICTORY' : competition?.result === 'lose' ? 'DEFEAT' : 'TIE'}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Score:</span> {competition?.user_score} vs AI: {competition?.ai_score}
          </div>
          <div>
            <span className="font-semibold">Date:</span> {competition?.date}
          </div>
        </div>
        
        <p className="text-purple-800 font-semibold">Awarded by SQL Trainer AI</p>
      </div>
      
      <div className="text-center mb-8">
        <div className="text-2xl font-bold text-purple-800 mb-2">Arslan Shahid</div>
        <div className="text-sm text-gray-600">Managing Director</div>
      </div>
      
      <div className="text-center text-sm text-gray-600">
        <div className="font-semibold text-purple-800">FirebirdTech Pte. Ltd.</div>
        <div>68 Circular Road, #02-01, 049422, Singapore</div>
        <div className="text-xs text-gray-500">sqltrainerai.com</div>
      </div>
    </div>
  );

  const renderMasterCertificate = () => (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-orange-800 mb-4">Certificate of Mastery</h1>
      <h2 className="text-xl text-orange-600 mb-8">In Recognition of Outstanding Achievement</h2>
      
      <div className="border-2 border-dashed border-orange-200 rounded-lg p-8 mb-8">
        <p className="text-lg text-gray-700 mb-4">This certifies that</p>
        <h3 className="text-2xl font-bold text-orange-800 mb-2">{userName}</h3>
        {userName.includes('(') && userName.includes(')') && (
          <p className="text-xs text-gray-400 mb-4">
            {userName.match(/\(([^)]+)\)/)?.[1]}
          </p>
        )}
        <p className="text-base text-gray-700 mb-6">
          has successfully achieved the level of <span className="font-bold">Master in SQL</span>
        </p>
        <p className="text-sm text-gray-700 mb-6">
          demonstrating expertise in database design, querying, performance optimization,
          and advanced SQL problem-solving.
        </p>
        
        <div className="text-sm text-gray-600 mb-6">
          <div>
            <span className="font-semibold">Awarded:</span> {master?.date}
          </div>
        </div>
        
        <p className="text-orange-800 font-semibold">Awarded by SQL Trainer AI</p>
      </div>
      
      <div className="text-center mb-8">
        <div className="text-2xl font-bold text-orange-800 mb-2">Arslan Shahid</div>
        <div className="text-sm text-gray-600">Managing Director</div>
      </div>
      
      <div className="text-center text-sm text-gray-600">
        <div className="font-semibold text-orange-800">FirebirdTech Pte. Ltd.</div>
        <div>68 Circular Road, #02-01, 049422, Singapore</div>
        <div className="text-xs text-gray-500">sqltrainerai.com</div>
      </div>
    </div>
  );

  const renderCertificateContent = () => {
    switch (type) {
      case 'session':
        return renderSessionCertificate();
      case 'competition':
        return renderCompetitionCertificate();
      case 'master':
        return renderMasterCertificate();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="max-w-4xl mx-auto">
        {/* Certificate Preview Header with Buttons */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Certificate Preview</h2>
          
          <button
            onClick={handleLinkedInShare}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            <span>Share on LinkedIn</span>
          </button>
        </div>

        {/* Certificate Content */}
        <div className="bg-white border-8 border-blue-600 rounded-lg p-8 shadow-lg print:shadow-none print:border-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-3 flex items-center justify-center">
              <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="h-1 w-24 bg-blue-600 mx-auto"></div>
          </div>
          
          {renderCertificateContent()}
        </div>
      </div>
      
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body { margin: 0; padding: 0; }
            .print\\:hidden { display: none !important; }
            .print\\:shadow-none { box-shadow: none !important; }
            .print\\:border-4 { border-width: 4px !important; }
            .bg-gray-50 { background: white !important; }
            .py-4 { padding: 0 !important; }
            .max-w-4xl { max-width: none !important; }
            .mx-auto { margin: 0 !important; }
            .mb-4 { margin-bottom: 0 !important; }
            .p-8 { padding: 20px !important; }
          }
        `
      }} />
    </div>
  );
};
