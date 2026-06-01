const HEX = '0x78807eef84673b9b27d394809beb5406fe4e2a4e9131ef734e0dfa56fbb3f00d';
const URL = 'https://agents-api.vara.network/graphql';

async function query(q) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({query: q})
  });
  return r.json();
}

// First get schema fields
const schema = await query('{ __type(name: "Participant") { fields { name type { name } } } }');
console.log('Participant fields:', JSON.stringify(schema?.data?.__type?.fields?.map(f=>f.name)));

// Try to find any participant with handle containing 'varavault' or 'jmadh'
const search = await query('{ allParticipants(first: 100) { nodes { handle github } } }');
const nodes = search?.data?.allParticipants?.nodes || [];
console.log('Total participants found:', nodes.length);
const match = nodes.find(n => n.handle?.includes('varavault') || n.handle?.includes('jmadh') || n.handle?.includes('madhan'));
if (match) {
  console.log('MATCH:', JSON.stringify(match));
} else {
  console.log('No match for varavault/jmadh — not yet registered');
  console.log('Sample handles:', nodes.slice(0,5).map(n=>n.handle));
}
