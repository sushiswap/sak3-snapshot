import fs from "fs";
import { utils } from "ethers";
import { BLACKLIST, SAK3_ADDRESS, USDC_SAK3, WETH_SAK3, SUSHI_SAK3, ZERO_DOT_ONE } from "./constants";
import { fetchBalancesAndTotalSupply, fetchSa3BalanceDeposited, fetchSak3BalanceInLP } from "./fetchers";
import { Balances, Entry } from "./types";

const main = async () => {
    const { balances } = await fetchBalancesAndTotalSupply(SAK3_ADDRESS);
    writeBalances(balances, "sak3.csv");
    const balancesLP0 = await fetchSak3BalanceInLP(USDC_SAK3);
    writeBalances(balancesLP0, "usdc-sak3.csv");
    const balancesLP1 = await fetchSak3BalanceInLP(WETH_SAK3);
    writeBalances(balancesLP1, "weth-sak3.csv");
    const balancesLP2 = await fetchSak3BalanceInLP(SUSHI_SAK3);
    writeBalances(balancesLP2, "sushi-sak3.csv");
    const deposited = await fetchSa3BalanceDeposited(272); // USDC-SAK3 pool
    writeBalances(deposited, "deposits.csv");

    const totalBalances = mergeBalances(balances, balancesLP0, balancesLP1, balancesLP2, deposited);
    const entries = flattenBalances(totalBalances)
        .filter(entry => entry.balance.gte(ZERO_DOT_ONE))
        .filter(entry => !BLACKLIST.includes(entry.address));
    writeEntries(entries, "winners.csv");
};

const mergeBalances = (...balancesList: Balances[]) => {
    const balances: Balances = {};
    for (const data of balancesList) {
        for (const address of Object.keys(data)) {
            if (balances[address]) {
                balances[address] = balances[address].add(data[address]);
            } else {
                balances[address] = data[address];
            }
        }
    }
    return balances;
};

const writeBalances = (balances: Balances, filename: string) => {
    writeEntries(flattenBalances(balances), filename);
};

const flattenBalances = (balances: Balances) => {
    const entries: Entry[] = [];
    Object.keys(balances).forEach(address => {
        const balance = balances[address];
        if (!balance.isZero()) entries.push({ address, balance });
    });
    return entries;
};

const writeEntries = (entries: Entry[], filename: string) => {
    const content = entries
        .sort((a, b) => (b.balance.eq(a.balance) ? 0 : b.balance.lt(a.balance) ? -1 : 1))
        .map(entry => entry.address + "," + utils.formatEther(entry.balance))
        .join("\n");
    fs.writeFileSync(filename, "address,balance\n" + content);
};

main().catch(console.error);
