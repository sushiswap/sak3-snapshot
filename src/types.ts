import { TypedEvent } from "@typechain/ethers-v5/static/common";
import { BigNumber } from "ethers";

export interface Entry {
    address: string;
    balance: BigNumber;
}
export type Balances = { [address: string]: BigNumber };
export type Transfer = TypedEvent<[string, string, BigNumber] & { from: string; to: string; value: BigNumber }>;
export type Mint = TypedEvent<
    [string, BigNumber, BigNumber] & { sender: string; amount0: BigNumber; amount1: BigNumber }
>;
export type Burn = TypedEvent<
    [string, BigNumber, BigNumber, string] & { sender: string; amount0: BigNumber; amount1: BigNumber; to: string }
>;
