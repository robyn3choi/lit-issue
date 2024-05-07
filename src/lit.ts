import { SiweMessage } from "siwe";
import { ethers } from "ethers";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { LitAbility, LitActionResource } from "@lit-protocol/auth-helpers";
// import { getAccessControlConditions } from "./helpers";

const storedCapacityDelegationAuthSig = {
  sig: "2a1bd9b230647b68c2cdb8845e5476a2d2b1ac3e0c93ff241bc542d6838ffc17549e145ab6abdd7a80ab692a5170a50d0400cf2b60f366cc90cb67cd3e50b7941c",
  derivedVia: "web3.eth.personal.sign",
  signedMessage:
    "localhost:3001 wants you to sign in with your Ethereum account:\n0x2746c12CEA9403148202Ed1a7F362987c17cc249\n\n I further authorize the stated URI to perform the following actions on my behalf: (1) 'Auth': 'Auth' for 'lit-ratelimitincrease://1154'.\n\nURI: lit:capability:delegation\nVersion: 1\nChain ID: 1\nNonce: 0xa84664b15a080790f9d7b2695579d624c13316488054061c3efdbf8232178785\nIssued At: 2024-05-07T19:14:23.442Z\nExpiration Time: 2024-05-07T19:21:22.003Z\nResources:\n- urn:recap:eyJhdHQiOnsibGl0LXJhdGVsaW1pdGluY3JlYXNlOi8vMTE1NCI6eyJBdXRoL0F1dGgiOlt7Im5mdF9pZCI6WyIxMTU0Il0sInVzZXMiOiIxIn1dfX0sInByZiI6W119",
  address: "2746c12cea9403148202ed1a7f362987c17cc249",
  algo: null,
};

const accessControlConditions = [
  {
    contractAddress: "",
    standardContractType: "",
    chain: "ethereum",
    method: "eth_getBalance",
    parameters: [":userAddress", "latest"],
    returnValueTest: {
      comparator: ">=",
      value: "1000000000000", // 0.000001 ETH
    },
  },
];

const client = new LitJsSdk.LitNodeClient({
  litNetwork: "habanero",
  alertWhenUnauthorized: false,
  // checkNodeAttestation: true,
  debug: true,
});

class Lit {
  private litNodeClient;

  async connect() {
    await client.connect();
    this.litNodeClient = client;
  }

  async encrypt(file) {
    if (!this.litNodeClient) {
      await this.connect();
    }

    const nonce = await this.litNodeClient.getLatestBlockhash();

    const authSig = await LitJsSdk.checkAndSignAuthMessage({
      chain: "ethereum",
      nonce,
    });

    console.log(authSig);

    const blob = await LitJsSdk.encryptFileAndZipWithMetadata({
      accessControlConditions,
      authSig,
      chain: "ethereum",
      file,
      litNodeClient: this.litNodeClient,
      readme: "has to be a readme",
    });

    return blob;
  }

  async decrypt(file) {
    if (!this.litNodeClient) {
      await this.connect();
    }
    const nonce = await this.litNodeClient.getLatestBlockhash();

    const authSig = await LitJsSdk.checkAndSignAuthMessage({
      chain: "ethereum",
      nonce,
    });

    // @ts-ignore
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const authNeededCallback = async ({ resources, expiration, uri }) => {
      const litResource = new LitActionResource("*");

      const recapObject =
        await this.litNodeClient!.generateSessionCapabilityObjectWithWildcards([
          litResource,
        ]);

      recapObject.addCapabilityForResource(
        litResource,
        LitAbility.LitActionExecution
      );

      const verified = recapObject.verifyCapabilitiesForResource(
        litResource,
        LitAbility.LitActionExecution
      );

      if (!verified) {
        throw new Error("Failed to verify capabilities for resource");
      }

      const nonce = await this.litNodeClient!.getLatestBlockhash();

      let siweMessage = new SiweMessage({
        domain: window.location.host,
        address: signer.address,
        statement: "Some custom statement.",
        uri,
        version: "1",
        chainId: 1,
        expirationTime: expiration,
        resources,
        nonce,
      });

      siweMessage = recapObject.addToSiweMessage(siweMessage);

      const messageToSign = siweMessage.prepareMessage();
      const signature = await signer.signMessage(messageToSign);

      const authSig = {
        sig: signature,
        derivedVia: "web3.eth.personal.sign",
        signedMessage: messageToSign,
        address: signer.address,
      };
      console.log("authSig: ", authSig);
      return authSig;
    };

    const sessionSigs = await this.litNodeClient.getSessionSigs({
      expiration: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hr
      chain: "ethereum",
      resourceAbilityRequests: [
        {
          resource: new LitActionResource("*"),
          ability: LitAbility.LitActionExecution,
        },
      ],
      authNeededCallback,
      capacityDelegationAuthSig: storedCapacityDelegationAuthSig,
    });

    console.log("sessionSigs: ", sessionSigs);

    const result = LitJsSdk.decryptZipFileWithMetadata({
      sessionSigs,
      // authSig, // if using cayenne, uncomment this and comment out sessionSigs
      file,
      litNodeClient: this.litNodeClient,
    });
    return result;
  }

  async delegateCapacity() {
    try {
      if (!this.litNodeClient) {
        LitJsSdk.disconnectWeb3();
        await this.connect();
      }
      // @ts-ignore
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const { capacityDelegationAuthSig } =
        await this.litNodeClient!.createCapacityDelegationAuthSig({
          uses: "3", // we need this to be effectively infinity. currently waiting on Lit team to see if this is possible
          dAppOwnerWallet: signer,
          capacityTokenId: "1154", // replace with your token id
          domain: window.location.host,
        });

      console.log("capacityDelegationAuthSig", capacityDelegationAuthSig);
    } catch (err: any) {
      console.error(err);
    }
  }
}

export default new Lit();
