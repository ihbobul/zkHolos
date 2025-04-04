/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ELECTION_MANAGER_ADDRESS: string
  readonly VITE_VOTING_CONTRACT_ADDRESS: string
  readonly VITE_VOTER_REGISTRATION_ADDRESS: string
  readonly VITE_MOCK_ZKP_VERIFIER_ADDRESS: string
  readonly VITE_IPFS_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 