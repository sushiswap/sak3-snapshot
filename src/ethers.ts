import { providers } from "ethers";
import { config } from "dotenv";
config();

export const provider = new providers.InfuraProvider("homestead", process.env.INFURA_API_KEY);
