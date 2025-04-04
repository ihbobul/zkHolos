import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function generateKeys() {
    console.log('Generating RSA key pair...');
    
    const keysDir = path.join(__dirname, '..', 'keys');
    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir);
    }

    try {
        // Generate private key
        await execAsync('openssl genrsa -out keys/private.pem 2048');
        console.log('✓ Private key generated');

        // Generate public key
        await execAsync('openssl rsa -in keys/private.pem -pubout -out keys/public.pem');
        console.log('✓ Public key generated');

        // Convert to base64
        const privateKeyBase64 = fs.readFileSync('keys/private.pem').toString('base64');
        const publicKeyBase64 = fs.readFileSync('keys/public.pem').toString('base64');

        // Create .env file if it doesn't exist
        const envPath = path.join(__dirname, '..', '.env');
        if (!fs.existsSync(envPath)) {
            fs.copyFileSync(path.join(__dirname, '..', '.env.example'), envPath);
        }

        // Update .env file with the new keys
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(
            /IPFS_PRIVATE_KEY=.*/,
            `IPFS_PRIVATE_KEY=${privateKeyBase64}`
        );
        envContent = envContent.replace(
            /IPFS_ENCRYPTION_KEY=.*/,
            `IPFS_ENCRYPTION_KEY=${publicKeyBase64}`
        );
        fs.writeFileSync(envPath, envContent);

        console.log('✓ Keys added to .env file');
        console.log('\nIMPORTANT: Keep your private key secure and never commit it to version control!');
        console.log('The keys directory has been created in your project root.');
        console.log('Make sure to add the following to your .gitignore:');
        console.log('keys/');
        console.log('.env');

    } catch (error) {
        console.error('Error generating keys:', error);
        process.exit(1);
    }
}

generateKeys(); 