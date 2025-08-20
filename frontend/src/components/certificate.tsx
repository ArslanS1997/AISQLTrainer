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
  const handlePrint = () => {
    window.print();
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
        {/* Print Button */}
        <div className="text-center mb-4 print:hidden">
          <button
            onClick={handlePrint}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Print Certificate
          </button>
        </div>
        
        {/* Certificate */}
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
