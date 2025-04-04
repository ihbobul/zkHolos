import { create } from 'kubo-rpc-client';

async function main() {
  try {
    // Create IPFS client
    const ipfs = create({ url: 'http://127.0.0.1:5001' });

    // Test data
    const testData = {
      title: "Test Election",
      description: "This is a test election",
      candidates: [
        { id: 1, name: "Candidate 1", description: "First candidate" },
        { id: 2, name: "Candidate 2", description: "Second candidate" }
      ],
      additionalDetails: {
        organizerInfo: "Test Organization",
        rules: "Test Rules",
        requirements: "Test Requirements"
      },
      metadata: {
        createdAt: new Date().toISOString(),
        version: "1.0.0"
      }
    };

    console.log('\nStoring test data in IPFS...');
    console.log('Data:', JSON.stringify(testData, null, 2));

    // Store data
    const buffer = Buffer.from(JSON.stringify(testData));
    const result = await ipfs.add(buffer);
    console.log('\nIPFS Hash:', result.path);

    // Pin the data
    await ipfs.pin.add(result.path);
    console.log('Data pinned successfully');

    // Retrieve and verify data
    console.log('\nRetrieving data from IPFS...');
    const chunks = [];
    for await (const chunk of ipfs.cat(result.path)) {
      chunks.push(chunk);
    }
    const retrievedData = Buffer.concat(chunks).toString();
    console.log('Retrieved data:', retrievedData);

    // Verify data integrity
    const parsedData = JSON.parse(retrievedData);
    if (JSON.stringify(parsedData) === JSON.stringify(testData)) {
      console.log('\n✅ Data verification successful!');
    } else {
      console.log('\n❌ Data verification failed!');
      console.log('Original:', testData);
      console.log('Retrieved:', parsedData);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

main(); 