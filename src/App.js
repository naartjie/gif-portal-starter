import { useEffect, useState } from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import {
  Program,
  Provider as AnchorProvider,
  web3,
  BN,
} from "@project-serum/anchor";

import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";
import kp from "./keypair.json";

const TWITTER_HANDLE = "_naartjie";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const { SystemProgram } = web3;
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);
const programID = new PublicKey("88pnQED3oR6Vb4ZpDCrzVjsw55nUgvx2Lprv1RkP1Nhy");
const network = clusterApiUrl("devnet");
const opts = { preflightCommitment: "processed" };

const getProvider = () => {
  const connection = new Connection(network, opts.preflightCommitment);
  const provider = new AnchorProvider(
    connection,
    window.solana,
    opts.preflightCommitment
  );

  return provider;
};

const getProgram = async () => {
  console.log(`await Program.fetchIdl(programID, getProvider())`);
  const idl = await Program.fetchIdl(programID, getProvider());
  console.log({ idl, programID, provider: getProvider() });
  const p = getProvider();
  return new Program(idl, programID, p);
};

const ConnectedContainer = ({
  gifList,
  setGifList,
  gifLinkInput,
  setGifLinkInput,
  createGifAccount,
  sendGif,
}) => {
  if (gifList === null) {
    return (
      <div className="connected-container">
        <button
          className="cta-button connect-wallet-button"
          onClick={(ev) => {
            createGifAccount();
          }}
        >
          Create Account
        </button>
      </div>
    );
  }

  return (
    <div className="connected-container">
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          sendGif();
        }}
      >
        <input
          type="text"
          placeholder="GIF link!"
          value={gifLinkInput}
          onChange={(ev) => setGifLinkInput(ev.target.value)}
        />
        <button type="submit" className="cta-button submit-gif-button">
          Add
        </button>
      </form>
      <div className="git-grid">
        {gifList.map((item, index) => (
          <div className="gif-item" key={index}>
            <img src={item.gifLink} alt="cat gif" />
            <span>From</span>
            <a
              className="footer-text"
              href={`https://explorer.solana.com/address/${item.userAddress.toString()}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
            >
              {item.userAddress.toString()}
            </a>
            <span>Votes: {item.votes.toString()}</span>
            <button
              className="cta-button connect-wallet-button"
              onClick={async () => {
                const provider = getProvider();
                const program = await getProgram();

                console.log("ping upvote()");
                await program.rpc.upvote(index, {
                  accounts: {
                    baseAccount: baseAccount.publicKey,
                    user: provider.wallet.publicKey,
                  },
                });

                const account = await program.account.baseAccount.fetch(
                  baseAccount.publicKey
                );
                setGifList(account.gifList);
              }}
            >
              👍 Upvote
            </button>
            <button
              className="cta-button connect-wallet-button"
              onClick={async () => {
                const provider = getProvider();
                const program = await getProgram();

                console.log("ping tip()");
                await program.rpc.sendSol(new BN(5000000), {
                  accounts: {
                    // baseAccount: baseAccount.publicKey,
                    systemProgram: SystemProgram.programId,
                    from: provider.wallet.publicKey,
                    // to: new PublicKey(item.userAddress.toString()),
                    // to: item.userAddress.toString(),
                    to: "DjVtkAZSqEf7ZW6kX5HHjynNRtyuZjQuY4KMVM2pJTrM",
                  },
                });
              }}
            >
              🤑 Tip Contributor
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [gifLinkInput, setGifLinkInput] = useState("");
  const [gifList, setGifList] = useState([]);

  const checkWally = async () => {
    if (window?.solana?.isPhantom) {
      console.log(`haz solana wallet`, window.solana);
      const response = await window.solana.connect({ onlyIfTrusted: true });
      const publicKey = response.publicKey.toString();
      console.log(`connected: Public Key ${publicKey}`);
      setWalletAddress(publicKey);
    } else {
      alert("no wallet extension found");
    }
  };

  const getGifList = async () => {
    try {
      const program = await getProgram();
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );

      console.log("got the base account", account);
      setGifList(account.gifList);
    } catch (error) {
      console.error("Error in getGifList", error);
      setGifList(null);
      // throw error;
    }
  };

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = await getProgram();

      console.log("ping createGifAccount()");
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
      console.log(
        "Created a new BaseAccount w/ address:",
        baseAccount.publicKey.toString()
      );
      await getGifList();
    } catch (error) {
      console.error("error in createGifAccount", error);
      throw error;
    }
  };

  useEffect(() => {
    window.addEventListener("load", checkWally);
    return () => window.removeEventListener("load", checkWally);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      getGifList();
    }
  }, [walletAddress]);

  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      const response = await solana.connect();
      const publicKey = response.publicKey.toString();
      console.log(`Connected: Public Key ${publicKey}`);
      setWalletAddress(publicKey);
    }
  };

  const ConnectButton = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect Wallet
    </button>
  );

  const sendGif = async () => {
    if (gifLinkInput.length === 0) {
      console.log("no gif link given");
      return;
    }

    setGifLinkInput("");
    console.log(`GIF link ${gifLinkInput}`);
    try {
      const provider = getProvider();
      const program = await getProgram();
      await program.rpc.addGif(gifLinkInput, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF sent successfully to solana program", gifLinkInput);

      await getGifList();
    } catch (error) {
      console.error("error sending GIF", error);
    }
  };

  return (
    <div className="App">
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          <p className="header">Wins</p>
          <p className="sub-text">Cats and frenz ✨</p>
          {walletAddress ? (
            <ConnectedContainer
              gifList={gifList}
              gifLinkInput={gifLinkInput}
              setGifLinkInput={setGifLinkInput}
              createGifAccount={createGifAccount}
              sendGif={sendGif}
              setGifList={setGifList}
            />
          ) : (
            <ConnectButton />
          )}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
