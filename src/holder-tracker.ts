import fs from "fs";
import { BigNumber, utils, constants } from "ethers";
import { provider } from "./ethers";
import { ERC20__factory } from "./contracts";
import { BLACKLIST, FROM_BLOCK, SAK3_ADDRESS, TO_BLOCK } from "./constants";
import { Entry } from "./types";

const balances: { [address: string]: BigNumber } = {};

export const trackHolders = async () => {
    const sake = ERC20__factory.connect(SAK3_ADDRESS, provider);
    const start = Date.now();
    const events = await sake.queryFilter(sake.filters.Transfer(null, null, null), FROM_BLOCK, TO_BLOCK);
    console.log(Math.floor(Date.now() - start) / 1000 + "s to load events");

    events.forEach(event => {
        const { from, to, value } = event.args;
        if (!balances[from]) balances[from] = BigNumber.from(0);
        if (!balances[to]) balances[to] = BigNumber.from(0);
        if (from != constants.AddressZero) balances[from] = balances[from].sub(value);
        if (to != constants.AddressZero) balances[to] = balances[to].add(value);
    });

    const rank: Entry[] = [];
    Object.keys(balances).forEach(address => {
        rank.push({ address, balance: balances[address] });
    });
    const content = rank
        .filter(entry => !BLACKLIST.includes(entry.address))
        .filter(entry => entry.balance.gte(BigNumber.from(10).pow(17)))
        .sort((a, b) => (b.balance.eq(a.balance) ? 0 : b.balance.lt(a.balance) ? -1 : 1))
        .map(entry => entry.address + "," + utils.formatEther(entry.balance))
        .join("\n");
    fs.writeFileSync("holders.csv", "address,balance\n" + content);
};
