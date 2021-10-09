import { BigNumber, BigNumberish, constants } from "ethers";
import { provider } from "./ethers";
import { ERC20__factory, MasterChef__factory, UniswapV2Pair__factory } from "./contracts";
import { FROM_BLOCK, MASTER_CHEF, SAK3_ADDRESS, TO_BLOCK } from "./constants";
import { Balances } from "./types";

export const fetchBalancesAndTotalSupply = async (token: string) => {
    const balances: Balances = {};
    let totalSupply = constants.Zero;

    const sake = ERC20__factory.connect(token, provider);
    const start = Date.now();
    const events = await sake.queryFilter(sake.filters.Transfer(null, null, null), FROM_BLOCK, TO_BLOCK);
    console.log(Math.floor(Date.now() - start) / 1000 + "s to load Transfer events");

    events.forEach(event => {
        const { from, to, value } = event.args;
        if (!balances[from]) balances[from] = BigNumber.from(0);
        if (!balances[to]) balances[to] = BigNumber.from(0);
        if (from == constants.AddressZero) totalSupply = totalSupply.add(value);
        else balances[from] = balances[from].sub(value);
        if (to != constants.AddressZero) balances[to] = balances[to].add(value);
    });
    return { balances, totalSupply };
};

export const fetchSak3BalanceInLP = async (lpAddress: string) => {
    const { balances, totalSupply } = await fetchBalancesAndTotalSupply(lpAddress);
    const reserve = await fetchSak3Reserve(lpAddress);

    const result: Balances = {};
    Object.keys(balances).forEach(address => {
        result[address] = reserve.mul(balances[address]).div(totalSupply);
    });
    return result;
};

export const fetchSak3Reserve = async (lpAddress: string) => {
    const lp = UniswapV2Pair__factory.connect(lpAddress, provider);
    const token0 = await lp.token0();

    const start = Date.now();
    const events = await lp.queryFilter(lp.filters.Sync(null, null), FROM_BLOCK, TO_BLOCK);
    console.log(Math.floor(Date.now() - start) / 1000 + "s to load Sync events");

    const event = events[events.length - 1];
    return token0 == SAK3_ADDRESS ? event.args.reserve0 : event.args.reserve1;
};

export const fetchSa3BalanceDeposited = async (pid: BigNumberish) => {
    const masterChef = MasterChef__factory.connect(MASTER_CHEF, provider);

    let start = Date.now();
    const deposits = await masterChef.queryFilter(masterChef.filters.Deposit(null, pid), FROM_BLOCK, TO_BLOCK);
    console.log(Math.floor(Date.now() - start) / 1000 + "s to load Deposit events");
    start = Date.now();
    const withdraws = await masterChef.queryFilter(masterChef.filters.Withdraw(null, pid), FROM_BLOCK, TO_BLOCK);
    console.log(Math.floor(Date.now() - start) / 1000 + "s to load Withdraw events");

    const balances: Balances = {};
    [...deposits, ...withdraws]
        .sort((a, b) => {
            if (a.blockNumber == b.blockNumber)
                if (a.transactionIndex == b.transactionIndex) return a.logIndex - b.logIndex;
                else return a.transactionIndex - b.transactionIndex;
            return a.blockNumber - b.blockNumber;
        })
        .forEach(event => {
            const { user, amount } = event.args;
            if (event.event == "Deposit") {
                if (balances[user]) balances[user] = balances[user].add(amount);
                else balances[user] = amount;
            } else if (event.event == "Withdraw") {
                if (balances[user]) balances[user] = balances[user].sub(amount);
                else throw new Error("Balance underflow");
            }
        });

    const poolInfo = await masterChef.poolInfo(pid);
    const reserve = await fetchSak3Reserve(poolInfo.lpToken);
    const { totalSupply } = await fetchBalancesAndTotalSupply(poolInfo.lpToken);

    const result: Balances = {};
    Object.keys(balances).forEach(address => {
        result[address] = reserve.mul(balances[address]).div(totalSupply);
    });
    return result;
};
