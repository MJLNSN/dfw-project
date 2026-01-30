export default function TestPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0f172a', 
      color: 'white',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>Test Page</h1>
      <p style={{ fontSize: '18px' }}>If you can see this, React is working!</p>
      <div style={{ marginTop: '20px', padding: '20px', background: '#1e293b', borderRadius: '8px' }}>
        <h2>System Check:</h2>
        <ul style={{ marginTop: '10px' }}>
          <li>✅ React rendering</li>
          <li>✅ TypeScript compiling</li>
          <li>✅ Vite dev server</li>
        </ul>
      </div>
    </div>
  )
}

