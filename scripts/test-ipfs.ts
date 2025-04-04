import { IPFSService } from '../src/services/IPFSService';

async function testIPFSService() {
    try {
        const ipfsService = IPFSService.getInstance();
        
        // Check if IPFS node is available
        const isAvailable = await ipfsService.isNodeAvailable();
        console.log('IPFS node available:', isAvailable);
        
        if (!isAvailable) {
            console.error('IPFS node is not available. Please make sure the IPFS daemon is running.');
            return;
        }

        // Test data
        const testData = 'Hello, IPFS! This is a test message.';
        
        // Upload test data
        console.log('Uploading test data...');
        const hash = await ipfsService.upload(testData);
        console.log('Upload successful! Hash:', hash);
        
        // Retrieve test data
        console.log('Retrieving test data...');
        const retrievedData = await ipfsService.retrieve(hash);
        console.log('Retrieved data:', retrievedData);
        
        // Verify data matches
        console.log('Data verification:', testData === retrievedData ? 'SUCCESS' : 'FAILED');
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testIPFSService(); 