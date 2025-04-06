import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { voterService } from '@/services/VoterService';
import { ethers } from 'ethers';

interface VoterInfo {
  region: string;
  isEligible: boolean;
}

interface AuthState {
  address: string | null;
  isAdmin: boolean;
  isVoter: boolean;
  voterInfo: VoterInfo | null;
  isInitialized: boolean;
  checkAuth: () => Promise<void>;
  reset: () => void;
  // New methods for testing
  setVoterRole: (isVoter: boolean, voterInfo?: VoterInfo) => void;
}

const ADMIN_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      address: null,
      isAdmin: false,
      isVoter: false,
      voterInfo: null,
      isInitialized: false,

      checkAuth: async () => {
        try {
          const provider = new ethers.JsonRpcProvider('http://localhost:8545');
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          
          // Check if admin
          const isAdmin = address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
          
          // Check if registered voter
          const isVoter = await voterService.isRegistered(address);
          let voterInfo = null;
          
          if (isVoter) {
            voterInfo = await voterService.getVoterInfo(address);
          }
          
          set({
            address,
            isAdmin,
            isVoter,
            voterInfo,
            isInitialized: true,
          });
          
          console.log('Auth state updated:', {
            address,
            isAdmin,
            isVoter,
            voterInfo,
          });
        } catch (error) {
          console.error('Error checking auth:', error);
          set({
            address: null,
            isAdmin: false,
            isVoter: false,
            voterInfo: null,
            isInitialized: true,
          });
        }
      },

      // New method to toggle voter role for testing
      setVoterRole: (isVoter: boolean, voterInfo?: VoterInfo) => {
        const currentState = get();
        set({
          ...currentState,
          isVoter,
          voterInfo: voterInfo || null,
        });
        console.log('Voter role updated:', { isVoter, voterInfo });
      },

      reset: () => {
        set({
          address: null,
          isAdmin: false,
          isVoter: false,
          voterInfo: null,
          isInitialized: false,
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
); 