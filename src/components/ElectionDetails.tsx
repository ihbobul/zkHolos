import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { VotingIPFSService } from '../services/VotingIPFSService';

// Add type declaration for window.ethereum
declare global {
    interface Window {
        ethereum?: any;
    }
}

interface ElectionDetailsProps {
    electionId: number;
    contractAddress: string;
    contractABI: any;
}

interface ElectionData {
    id: number;
    title: string;
    description: string;
    startTime: number;
    endTime: number;
    regions: string[];
    candidates: Candidate[];
}

interface Candidate {
    id: number;
    name: string;
    description: string;
    voteCount: number;
    isActive: boolean;
}

interface VoteRecord {
    electionId: number;
    candidateId: number;
    region: string;
    voter: string;
    timestamp: number;
    commitment: string;
}

export const ElectionDetails: React.FC<ElectionDetailsProps> = ({
    electionId,
    contractAddress,
    contractABI
}) => {
    const [electionData, setElectionData] = useState<ElectionData | null>(null);
    const [voteRecords, setVoteRecords] = useState<VoteRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const ipfsService = VotingIPFSService.getInstance();

    useEffect(() => {
        const fetchElectionData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Get the provider and contract
                const provider = new ethers.BrowserProvider(window.ethereum);
                const contract = new ethers.Contract(contractAddress, contractABI, provider);

                // Get the election from the contract
                const election = await contract.getElection(electionId);
                
                // Get the IPFS hash from the contract
                const ipfsHash = election.ipfsHash;

                if (!ipfsHash) {
                    throw new Error('No IPFS hash found for this election');
                }

                // Fetch election data from IPFS
                const data = await ipfsService.retrieveElectionData(ipfsHash);
                setElectionData(data);

                // Fetch vote records from IPFS
                const records = await ipfsService.retrieveVoteRecords(ipfsHash);
                setVoteRecords(records);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchElectionData();
    }, [electionId, contractAddress, contractABI]);

    if (loading) {
        return <div>Loading election details...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!electionData) {
        return <div>No election data found</div>;
    }

    return (
        <div className="election-details">
            <h2>{electionData.title}</h2>
            <p>{electionData.description}</p>
            
            <div className="election-info">
                <p>Start Time: {new Date(electionData.startTime * 1000).toLocaleString()}</p>
                <p>End Time: {new Date(electionData.endTime * 1000).toLocaleString()}</p>
                <p>Regions: {electionData.regions.join(', ')}</p>
            </div>

            <div className="candidates">
                <h3>Candidates</h3>
                {electionData.candidates.map(candidate => (
                    <div key={candidate.id} className="candidate">
                        <h4>{candidate.name}</h4>
                        <p>{candidate.description}</p>
                        <p>Votes: {candidate.voteCount}</p>
                    </div>
                ))}
            </div>

            <div className="vote-records">
                <h3>Vote Records</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Voter</th>
                            <th>Candidate</th>
                            <th>Region</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {voteRecords.map((record, index) => (
                            <tr key={index}>
                                <td>{record.voter}</td>
                                <td>{electionData.candidates.find(c => c.id === record.candidateId)?.name}</td>
                                <td>{record.region}</td>
                                <td>{new Date(record.timestamp * 1000).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}; 