import React, { useEffect, useState } from 'react';

const HealthCheck: React.FC = () => {
  const [status, setStatus] = useState<string>('Checking...');
  const [backendUrl, setBackendUrl] = useState<string>('');

  useEffect(() => {
    const url = process.env.REACT_APP_BACKEND_URL || 'http://localhost:10000';
    setBackendUrl(url);
    
    fetch(`${url}/health`)
      .then(res => res.json())
      .then(data => setStatus(`✅ Connected: ${data.status}`))
      .catch(err => setStatus(`❌ Error: ${err.message}`));
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, background: 'white', padding: '10px', border: '1px solid #ccc' }}>
      <div>Backend URL: {backendUrl}</div>
      <div>Status: {status}</div>
    </div>
  );
};

export default HealthCheck;
