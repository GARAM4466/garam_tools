const fetch = require('node-fetch'); // wait node 25 has native fetch

async function test() {
  console.log("Fetching upbit via proxy...");
  const u = await fetch('https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent('https://api.upbit.com/v1/market/all'));
  console.log("Upbit status:", u.status, u.ok);
  if (u.ok) {
     const t = await u.text();
     console.log("Upbit proxy response sample:", t.substring(0, 100));
  }

  console.log("Fetching bithumb via proxy...");
  const b = await fetch('https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent('https://api.bithumb.com/v1/market/all'));
  console.log("Bithumb status:", b.status, b.ok);
  if (b.ok) {
     const t = await b.text();
     console.log("Bithumb proxy response sample:", t.substring(0, 100));
  }
}
test();
