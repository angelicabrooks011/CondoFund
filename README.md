# 🏢 CondoFund: Blockchain-Powered Condo Maintenance Management

Welcome to CondoFund, a decentralized solution for managing collaborative maintenance funds in condominiums! Using the Stacks blockchain and Clarity smart contracts, this project ensures transparent, fair, and automated handling of shared funds for repairs, upkeep, and improvements. Say goodbye to disputes over fund misuse or opaque accounting—everything is on-chain and verifiable.

## ✨ Features

🔒 Secure contributions from condo owners via automated deposits  
🗳️ Democratic voting on fund expenditures and proposals  
💰 Transparent tracking of fund balances and transactions  
📊 Automated reporting and audits for all participants  
🚧 Escrow releases for verified vendor payments  
👥 Owner registry with ownership proofs (e.g., via NFTs)  
⚖️ Dispute resolution through on-chain arbitration  
🔄 Emergency fund access with multisig approvals  
📈 Tokenized shares for proportional voting power  
✅ Immutable records to prevent fraud or tampering  

## 🛠 How It Works

CondoFund leverages 8 smart contracts written in Clarity to create a robust, decentralized system. Here's a high-level overview:

### Core Smart Contracts
1. **OwnerRegistry.clar**: Manages registration of condo owners, linking their STX addresses to unit ownership proofs (e.g., NFTs representing deeds). Handles onboarding and transfers.
2. **FundToken.clar**: Issues fungible tokens representing shares in the maintenance fund. Owners receive tokens proportional to their unit size or contributions.
3. **ContributionManager.clar**: Automates monthly/periodic contributions from owners. Enforces penalties for late payments and distributes tokens upon deposit.
4. **ProposalSystem.clar**: Allows owners to submit proposals for fund usage (e.g., roof repairs). Includes details like cost estimates and vendor info.
5. **VotingMechanism.clar**: Handles governance voting on proposals. Uses token-weighted voting with quorum requirements to approve or reject.
6. **FundEscrow.clar**: Locks approved funds in escrow until work is verified (e.g., via oracle or multisig confirmation). Releases payments to vendors automatically.
7. **AuditTrail.clar**: Logs all transactions, votes, and changes immutably. Provides query functions for generating reports on fund history.
8. **EmergencyMultisig.clar**: A fallback contract for urgent access to a portion of funds, requiring signatures from a predefined set of trusted owners or admins.

### For Condo Owners
- Register your ownership in the OwnerRegistry contract with proof of unit deed (e.g., an NFT ID).
- Deposit STX or tokens into the ContributionManager to receive your FundTokens.
- Submit a proposal via ProposalSystem with details like "Repair elevator: 5000 STX to VendorX."
- Vote on active proposals using your token balance in VotingMechanism.
- Track everything transparently via AuditTrail queries.

### For Administrators (e.g., HOA Board)
- Oversee registrations and resolve disputes using on-chain data.
- Confirm completed work to trigger Escrow releases.
- Use EmergencyMultisig for critical situations, like immediate flood repairs, with multi-owner approval.

### For Verifiers or Auditors
- Query AuditTrail for full transaction history and balances.
- Verify ownership and votes through public contract reads.
- Check proposal outcomes and escrow statuses instantly.

This setup solves real-world issues like fund mismanagement, lack of transparency, and slow decision-making in condo associations. By decentralizing control, it empowers owners while ensuring funds are used efficiently. Deploy on Stacks for Bitcoin-secured immutability!