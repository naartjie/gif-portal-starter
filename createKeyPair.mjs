import { writeFileSync } from "fs";
import { web3 } from "@project-serum/anchor";

const account = web3.Keypair.generate();
writeFileSync("./src/keypair.json", JSON.stringify(account));
