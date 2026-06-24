import https from 'https';

// Query for standalone ships
const query = JSON.stringify([{
  operationName: 'CatalogItemsWidgetViewQuery',
  variables: {
    query: {
      skus: { products: ['72'] },  // Standalone Ships category
      page: 1,
      limit: 50
    },
    storeFront: 'pledge'
  },
  query: `query CatalogItemsWidgetViewQuery($query: SearchQuery, $storeFront: String = "pledge") {
    store(name: $storeFront, browse: true) {
      search(query: $query) {
        count
        totalCount
        resources {
          id
          slug
          name
          title
          type
          url
          price { amount discounted }
          nativePrice { amount discounted discountDescription }
          ... on TySku { isWarbond isPackage label }
          ... on TyBundle { isVip }
        }
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
      const storeData = json[0]?.data?.store?.search;
      const resources = storeData?.resources || [];
      
      console.log('Total items:', storeData?.totalCount || 0);
      console.log('Warbond items:', resources.filter(r => r.isWarbond).length);
      
      // Check for items without images
      console.log('\nWarbond items without slug:');
      let count = 0;
      for (const item of resources) {
        if (item.isWarbond && !item.slug) {
          console.log('  -', item.name);
          count++;
        }
      }
      if (count === 0) console.log('  All items have slugs');
    } catch (e) {
      console.log('Error:', e.message);
    }
  });
});

req.on('error', (e) => console.log('Error:', e.message));
req.write(query);
req.end();
