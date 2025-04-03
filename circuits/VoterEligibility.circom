template IsEqual() {
    signal input in[2];
    signal output out;
    
    signal diff;
    diff <== in[1] - in[0];
    out <== 1 - (diff * diff);
}

template VoterEligibility() {
    // Public inputs
    signal input regionHash;
    signal input electionId;
    
    // Private inputs
    signal private input voterAddress;
    signal private input region;
    signal private input isRegistered;
    signal private input isEligible;
    
    // Outputs
    signal output valid;
    signal output commitment;
    
    // Simple test computation
    component regCheck = IsEqual();  // This must be declared after IsEqual is defined
    regCheck.in[0] <== isRegistered;
    regCheck.in[1] <== 1;
    
    component eligCheck = IsEqual();
    eligCheck.in[0] <== isEligible;
    eligCheck.in[1] <== 1;
    
    valid <== regCheck.out * eligCheck.out;
    commitment <== voterAddress;
}

// Instantiate the component
component main = VoterEligibility();
