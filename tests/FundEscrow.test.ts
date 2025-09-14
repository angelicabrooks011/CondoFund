import { describe, it, expect, beforeEach } from "vitest";
import { uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_PROPOSAL_ID = 101;
const ERR_INVALID_AMOUNT = 102;
const ERR_INVALID_VENDOR = 103;
const ERR_ESCROW_ALREADY_EXISTS = 104;
const ERR_ESCROW_NOT_FOUND = 105;
const ERR_INVALID_TIMESTAMP = 106;
const ERR_FUNDS_LOCKED = 107;
const ERR_FUNDS_RELEASED = 108;
const ERR_VERIFICATION_FAILED = 109;
const ERR_INVALID_VERIFIER = 110;
const ERR_INSUFFICIENT_BALANCE = 111;
const ERR_TRANSFER_FAILED = 112;
const ERR_INVALID_STATUS = 113;
const ERR_EXPIRED_ESCROW = 114;
const ERR_INVALID_QUORUM = 115;
const ERR_INVALID_DEADLINE = 116;
const ERR_INVALID_DESCRIPTION = 117;
const ERR_MAX_ESCROWS_EXCEEDED = 118;
const ERR_INVALID_UPDATE_PARAM = 119;
const ERR_UPDATE_NOT_ALLOWED = 120;
const ERR_INVALID_REFUND_REASON = 121;
const ERR_INVALID_VERIFICATION_METHOD = 122;
const ERR_INVALID_MULTISIG_COUNT = 123;
const ERR_INVALID_ORACLE = 124;

interface Escrow {
  proposalId: number;
  amount: number;
  vendor: string;
  lockedAt: number;
  deadline: number;
  status: string;
  verifier: string | null;
  quorum: number;
  description: string;
  verificationMethod: string;
  multisigCount: number;
  oracle: string | null;
  refundReason: string | null;
}

interface EscrowUpdate {
  updateAmount: number;
  updateDeadline: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class FundEscrowMock {
  state: {
    nextEscrowId: number;
    maxEscrows: number;
    escrowFee: number;
    adminPrincipal: string;
    escrows: Map<number, Escrow>;
    escrowUpdates: Map<number, EscrowUpdate>;
  } = {
    nextEscrowId: 0,
    maxEscrows: 1000,
    escrowFee: 500,
    adminPrincipal: "ST1ADMIN",
    escrows: new Map(),
    escrowUpdates: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxBalances: Map<string, number> = new Map([["contract", 1000000]]);
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextEscrowId: 0,
      maxEscrows: 1000,
      escrowFee: 500,
      adminPrincipal: "ST1ADMIN",
      escrows: new Map(),
      escrowUpdates: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxBalances = new Map([["contract", 1000000]]);
    this.stxTransfers = [];
  }

  setAdminPrincipal(newAdmin: string): Result<boolean> {
    if (this.caller !== this.state.adminPrincipal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.adminPrincipal = newAdmin;
    return { ok: true, value: true };
  }

  setMaxEscrows(newMax: number): Result<boolean> {
    if (this.caller !== this.state.adminPrincipal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newMax <= 0) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    this.state.maxEscrows = newMax;
    return { ok: true, value: true };
  }

  setEscrowFee(newFee: number): Result<boolean> {
    if (this.caller !== this.state.adminPrincipal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newFee < 0) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    this.state.escrowFee = newFee;
    return { ok: true, value: true };
  }

  createEscrow(
    proposalId: number,
    amount: number,
    vendor: string,
    deadline: number,
    quorum: number,
    description: string,
    verificationMethod: string,
    multisigCount: number,
    oracle: string
  ): Result<number> {
    if (this.state.nextEscrowId >= this.state.maxEscrows) return { ok: false, value: ERR_MAX_ESCROWS_EXCEEDED };
    if (proposalId <= 0) return { ok: false, value: ERR_INVALID_PROPOSAL_ID };
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (vendor === this.caller) return { ok: false, value: ERR_INVALID_VENDOR };
    if (deadline <= this.blockHeight) return { ok: false, value: ERR_INVALID_DEADLINE };
    if (quorum <= 0 || quorum > 100) return { ok: false, value: ERR_INVALID_QUORUM };
    if (!description || description.length > 200) return { ok: false, value: ERR_INVALID_DESCRIPTION };
    if (!["oracle", "multisig", "vote"].includes(verificationMethod)) return { ok: false, value: ERR_INVALID_VERIFICATION_METHOD };
    if (multisigCount <= 1 || multisigCount > 10) return { ok: false, value: ERR_INVALID_MULTISIG_COUNT };
    if (oracle === this.caller) return { ok: false, value: ERR_INVALID_ORACLE };

    this.stxTransfers.push({ amount: this.state.escrowFee, from: this.caller, to: this.state.adminPrincipal });
    this.stxTransfers.push({ amount: amount, from: this.caller, to: "contract" });

    const id = this.state.nextEscrowId;
    const escrow: Escrow = {
      proposalId,
      amount,
      vendor,
      lockedAt: this.blockHeight,
      deadline,
      status: "locked",
      verifier: null,
      quorum,
      description,
      verificationMethod,
      multisigCount,
      oracle,
      refundReason: null,
    };
    this.state.escrows.set(id, escrow);
    this.state.nextEscrowId++;
    return { ok: true, value: id };
  }

  getEscrow(id: number): Escrow | undefined {
    return this.state.escrows.get(id);
  }

  updateEscrow(id: number, updateAmount: number, updateDeadline: number): Result<boolean> {
    const escrow = this.state.escrows.get(id);
    if (!escrow) return { ok: false, value: ERR_ESCROW_NOT_FOUND };
    if (this.caller !== this.state.adminPrincipal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (updateAmount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (updateDeadline <= this.blockHeight) return { ok: false, value: ERR_INVALID_DEADLINE };
    if (escrow.status !== "locked") return { ok: false, value: ERR_UPDATE_NOT_ALLOWED };

    const updated: Escrow = {
      ...escrow,
      amount: updateAmount,
      deadline: updateDeadline,
    };
    this.state.escrows.set(id, updated);
    this.state.escrowUpdates.set(id, {
      updateAmount,
      updateDeadline,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  verifyAndRelease(id: number, verified: boolean): Result<boolean> {
    const escrow = this.state.escrows.get(id);
    if (!escrow) return { ok: false, value: ERR_ESCROW_NOT_FOUND };
    if (escrow.status !== "locked") return { ok: false, value: ERR_FUNDS_RELEASED };
    if (this.blockHeight >= escrow.deadline) return { ok: false, value: ERR_EXPIRED_ESCROW };
    if (!verified) return { ok: false, value: ERR_VERIFICATION_FAILED };

    this.stxTransfers.push({ amount: escrow.amount, from: "contract", to: escrow.vendor });
    const updated: Escrow = { ...escrow, status: "released" };
    this.state.escrows.set(id, updated);
    return { ok: true, value: true };
  }

  refundEscrow(id: number, reason: string): Result<boolean> {
    const escrow = this.state.escrows.get(id);
    if (!escrow) return { ok: false, value: ERR_ESCROW_NOT_FOUND };
    if (this.caller !== this.state.adminPrincipal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (escrow.status !== "locked") return { ok: false, value: ERR_FUNDS_RELEASED };
    if (!reason || reason.length > 100) return { ok: false, value: ERR_INVALID_REFUND_REASON };

    this.stxTransfers.push({ amount: escrow.amount, from: "contract", to: "contribution-manager" });
    const updated: Escrow = { ...escrow, status: "refunded", refundReason: reason };
    this.state.escrows.set(id, updated);
    return { ok: true, value: true };
  }

  getEscrowCount(): Result<number> {
    return { ok: true, value: this.state.nextEscrowId };
  }
}

describe("FundEscrow", () => {
  let contract: FundEscrowMock;

  beforeEach(() => {
    contract = new FundEscrowMock();
    contract.reset();
  });

  it("creates an escrow successfully", () => {
    const result = contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const escrow = contract.getEscrow(0);
    expect(escrow?.proposalId).toBe(1);
    expect(escrow?.amount).toBe(1000);
    expect(escrow?.vendor).toBe("ST2VENDOR");
    expect(escrow?.deadline).toBe(100);
    expect(escrow?.quorum).toBe(50);
    expect(escrow?.description).toBe("Roof repair");
    expect(escrow?.verificationMethod).toBe("multisig");
    expect(escrow?.multisigCount).toBe(3);
    expect(escrow?.oracle).toBe("ST3ORACLE");
    expect(escrow?.status).toBe("locked");
    expect(contract.stxTransfers).toEqual([
      { amount: 500, from: "ST1TEST", to: "ST1ADMIN" },
      { amount: 1000, from: "ST1TEST", to: "contract" },
    ]);
  });

  it("rejects invalid proposal id", () => {
    const result = contract.createEscrow(
      0,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PROPOSAL_ID);
  });

  it("rejects invalid amount", () => {
    const result = contract.createEscrow(
      1,
      0,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_AMOUNT);
  });

  it("rejects invalid vendor", () => {
    const result = contract.createEscrow(
      1,
      1000,
      "ST1TEST",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_VENDOR);
  });

  it("rejects expired deadline", () => {
    contract.blockHeight = 100;
    const result = contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      99,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DEADLINE);
  });

  it("rejects invalid quorum", () => {
    const result = contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      101,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_QUORUM);
  });

  it("rejects invalid description", () => {
    const result = contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "",
      "multisig",
      3,
      "ST3ORACLE"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DESCRIPTION);
  });

  it("rejects invalid verification method", () => {
    const result = contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "invalid",
      3,
      "ST3ORACLE"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_VERIFICATION_METHOD);
  });

  it("rejects invalid multisig count", () => {
    const result = contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      11,
      "ST3ORACLE"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_MULTISIG_COUNT);
  });

  it("rejects invalid oracle", () => {
    const result = contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST1TEST"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_ORACLE);
  });

  it("updates escrow successfully", () => {
    contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    contract.caller = "ST1ADMIN";
    const result = contract.updateEscrow(0, 1500, 150);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const escrow = contract.getEscrow(0);
    expect(escrow?.amount).toBe(1500);
    expect(escrow?.deadline).toBe(150);
    const update = contract.state.escrowUpdates.get(0);
    expect(update?.updateAmount).toBe(1500);
    expect(update?.updateDeadline).toBe(150);
    expect(update?.updater).toBe("ST1ADMIN");
  });

  it("rejects update for non-admin", () => {
    contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    const result = contract.updateEscrow(0, 1500, 150);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects update for non-existent escrow", () => {
    contract.caller = "ST1ADMIN";
    const result = contract.updateEscrow(99, 1500, 150);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ESCROW_NOT_FOUND);
  });

  it("verifies and releases funds successfully", () => {
    contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    contract.blockHeight = 50;
    const result = contract.verifyAndRelease(0, true);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const escrow = contract.getEscrow(0);
    expect(escrow?.status).toBe("released");
    expect(contract.stxTransfers).toContainEqual({ amount: 1000, from: "contract", to: "ST2VENDOR" });
  });

  it("rejects release if not locked", () => {
    contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    contract.verifyAndRelease(0, true);
    const result = contract.verifyAndRelease(0, true);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_FUNDS_RELEASED);
  });

  it("rejects release if expired", () => {
    contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    contract.blockHeight = 101;
    const result = contract.verifyAndRelease(0, true);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_EXPIRED_ESCROW);
  });

  it("rejects release if not verified", () => {
    contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    const result = contract.verifyAndRelease(0, false);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_VERIFICATION_FAILED);
  });

  it("refunds escrow successfully", () => {
    contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    contract.caller = "ST1ADMIN";
    const result = contract.refundEscrow(0, "Work not completed");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const escrow = contract.getEscrow(0);
    expect(escrow?.status).toBe("refunded");
    expect(escrow?.refundReason).toBe("Work not completed");
    expect(contract.stxTransfers).toContainEqual({ amount: 1000, from: "contract", to: "contribution-manager" });
  });

  it("rejects refund for non-admin", () => {
    contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    const result = contract.refundEscrow(0, "Work not completed");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects refund if not locked", () => {
    contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    contract.verifyAndRelease(0, true);
    contract.caller = "ST1ADMIN";
    const result = contract.refundEscrow(0, "Work not completed");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_FUNDS_RELEASED);
  });

  it("rejects invalid refund reason", () => {
    contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    contract.caller = "ST1ADMIN";
    const result = contract.refundEscrow(0, "");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_REFUND_REASON);
  });

  it("returns correct escrow count", () => {
    contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    contract.createEscrow(
      2,
      2000,
      "ST4VENDOR",
      200,
      60,
      "Elevator fix",
      "oracle",
      2,
      "ST5ORACLE"
    );
    const result = contract.getEscrowCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("sets escrow fee successfully", () => {
    contract.caller = "ST1ADMIN";
    const result = contract.setEscrowFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.escrowFee).toBe(1000);
    contract.caller = "ST1TEST";
    contract.createEscrow(
      1,
      1000,
      "ST2VENDOR",
      100,
      50,
      "Roof repair",
      "multisig",
      3,
      "ST3ORACLE"
    );
    expect(contract.stxTransfers[0]).toEqual({ amount: 1000, from: "ST1TEST", to: "ST1ADMIN" });
  });

  it("parses escrow parameters with Clarity types", () => {
    const proposalId = uintCV(1);
    const amount = uintCV(1000);
    expect(proposalId.value).toEqual(BigInt(1));
    expect(amount.value).toEqual(BigInt(1000));
  });
});