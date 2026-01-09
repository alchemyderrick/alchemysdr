// X Cookie Extractor Bookmarklet
// This extracts X/Twitter cookies and sends them to the SDR Console
(function() {
  // Check if we're on X/Twitter
  if (!window.location.hostname.includes('x.com') && !window.location.hostname.includes('twitter.com')) {
    alert('⚠️ You need to run this bookmarklet while on x.com!\n\n1. Open x.com in a new tab\n2. Log in to X/Twitter\n3. Click this bookmarklet again while on x.com');
    return;
  }

  // Prompt for server URL (defaults to localhost for development, but users can enter Railway URL)
  const SERVER_URL = prompt('Enter your SDR Console URL:', 'http://localhost:3000');
  if (!SERVER_URL) {
    return; // User cancelled
  }

  // Get all cookies
  const cookies = document.cookie.split(';').map(c => {
    const [name, value] = c.trim().split('=');
    return {
      name,
      value,
      domain: window.location.hostname,
      path: '/',
      secure: window.location.protocol === 'https:',
      httpOnly: false, // Can't access httpOnly cookies from JS
      sameSite: 'Lax'
    };
  });

  if (cookies.length === 0) {
    alert('⚠️ No cookies found. Please log into X/Twitter first, then try again.');
    return;
  }

  // Send to server
  fetch(`${SERVER_URL}/api/x-auth/save-cookies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Include cookies
    body: JSON.stringify({ cookies })
  })
  .then(r => r.json())
  .then(data => {
    if (data.ok) {
      alert(`✅ Success! Saved ${data.message}\n\nYou can now use X discovery in SDR Console.\n\nGo back to ${SERVER_URL} to continue.`);
    } else {
      alert(`❌ Error: ${data.error}`);
    }
  })
  .catch(err => {
    alert(`❌ Failed to save cookies: ${err.message}\n\nMake sure the SDR Console server is running at ${SERVER_URL}`);
  });
})();
