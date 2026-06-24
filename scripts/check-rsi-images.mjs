import https from 'https';

const query = JSON.stringify([{
  operationName: 'filters',
  variables: {},
  query: `query filters {
    ships {
      name
      skus {
        title
        medias { storeThumbSkuDetail }
      }
    }
  }`
}]);

const options = {
  hostname: 'robertsspaceindustries.com',
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  rejectUnauthorized: false,
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const ships = json[0]?.data?.ships || [];
      
      // Find Ironclad
      const ironclad = ships.filter(s => s.name.includes('Ironclad'));
      console.log('Ironclad ships found:', ironclad.length);
      ironclad.forEach(s => {
        console.log('  Name:', s.name);
        const sku = s.skus?.[0];
        const media = sku?.medias?.[0];
        console.log('  Image:', media?.storeThumbSkuDetail || 'N/A');
      });
      
      // Also check for other ships without images
      console.log('\nShips without images:');
      let count = 0;
      for (const ship of ships) {
        const sku = ship.skus?.[0];
        const media = sku?.medias?.[0];
        if (!media?.storeThumbSkuDetail) {
          console.log('  -', ship.name);
          count++;
          if (count >= 10) break;
        }
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  });
});

req.on('error', (e) => console.log('Error:', e.message));
req.write(query);
req.end();
