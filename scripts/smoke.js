(async () => {
  try {
    const r = await fetch('http://localhost:5173/');
    console.log('DEV_STATUS', r.status);
    const t = await r.text();
    console.log('DEV_INDEX_ROOT', t.includes('<div id="root"'));
  } catch (e) {
    console.error('DEV_ERROR', e.message);
  }

  const base = process.env.VITE_CHARITY_APP_BASE_URL;
  if (base) {
    try {
      const b = await fetch(new URL('/auth/me', base).toString());
      console.log('BACKEND_STATUS', b.status);
      const tb = await b.text();
      console.log('BACKEND_CONTENT', tb.slice(0, 200));
    } catch (e) {
      console.error('BACKEND_ERROR', e.message);
    }
  } else {
    console.log('BACKEND_BASE not set');
  }
})();
