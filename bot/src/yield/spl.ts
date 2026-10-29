import bs58 from "bs58";

/**
 * SPL stake-pool account parser (also Sanctum's single/multi-validator forks, same layout). Reads the
 * current pool rate and the rate at the previous epoch boundary, which together give a per-epoch yield
 * from one account read — no archive node needed.
 */

export interface StakePoolState {
  poolMint: string;
  totalLamports: bigint;
  poolTokenSupply: bigint;
  lastUpdateEpoch: bigint;
  lastEpochTotalLamports: bigint;
  lastEpochPoolTokenSupply: bigint;
  epochFee: { numerator: bigint; denominator: bigint };
}

const ACCOUNT_TYPE_STAKE_POOL = 1;

export function parseStakePool(data: Buffer): StakePoolState | null {
  let o = 0;
  const need = (n: number) => {
    if (o + n > data.length) throw new RangeError("short");
  };
  const u8 = () => {
    need(1);
    return data[o++];
  };
  const u64 = () => {
    need(8);
    const v = data.readBigUInt64LE(o);
    o += 8;
    return v;
  };
  const skip = (n: number) => {
    need(n);
    o += n;
  };
  const fee = () => {
    const denominator = u64();
    const numerator = u64();
    return { numerator, denominator };
  };
  const futureFee = () => {
    if (u8() !== 0) fee();
  };
  const optKey = () => {
    if (u8() === 1) skip(32);
  };

  try {
    if (u8() !== ACCOUNT_TYPE_STAKE_POOL) return null;
    skip(32 * 3 + 1 + 32 * 2); // manager, staker, deposit authority, withdraw bump, validator list, reserve
    need(32);
    const poolMint = bs58.encode(data.subarray(o, o + 32));
    skip(32 + 32 * 2); // pool mint, manager fee account, token program
    const totalLamports = u64();
    const poolTokenSupply = u64();
    const lastUpdateEpoch = u64();
    skip(48); // lockup
    const epochFee = fee();
    futureFee(); // next_epoch_fee
    optKey(); // preferred_deposit_validator
    optKey(); // preferred_withdraw_validator
    fee(); // stake_deposit_fee
    fee(); // stake_withdrawal_fee
    futureFee(); // next_stake_withdrawal_fee
    u8(); // stake_referral_fee
    optKey(); // sol_deposit_authority
    fee(); // sol_deposit_fee
    u8(); // sol_referral_fee
    optKey(); // sol_withdraw_authority
    fee(); // sol_withdrawal_fee
    futureFee(); // next_sol_withdrawal_fee
    const lastEpochPoolTokenSupply = u64();
    const lastEpochTotalLamports = u64();
    return { poolMint, totalLamports, poolTokenSupply, lastUpdateEpoch, lastEpochTotalLamports, lastEpochPoolTokenSupply, epochFee };
  } catch {
    return null;
  }
}
