import { SiweMessage } from "siwe";
import { ethers } from "ethers";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { LitAbility, LitActionResource } from "@lit-protocol/auth-helpers";
// import { getAccessControlConditions } from "./helpers";

const accessControlConditions = [
  {
    contractAddress: "",
    standardContractType: "",
    chain: "sepolia",
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
  checkNodeAttestation: true,
  debug: true,
});

class Lit {
  private litNodeClient;

  async connect() {
    await client.connect();
    this.litNodeClient = client;
  }

  async encryptString() {
    if (!this.litNodeClient) {
      await this.connect();
    }

    const nonce = await this.litNodeClient.getLatestBlockhash();

    const authSig = await LitJsSdk.checkAndSignAuthMessage({
      chain: "sepolia",
      nonce,
    });

    const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
      {
        accessControlConditions,
        authSig,
        chain: "sepolia",
        dataToEncrypt: "hello world",
      },
      this.litNodeClient
    );

    return {
      ciphertext,
      dataToEncryptHash,
    };
  }

  async decryptString(ciphertext: string, dataToEncryptHash: string) {
    if (!this.litNodeClient) {
      await this.connect();
    }
    const nonce = await this.litNodeClient.getLatestBlockhash();

    const authSig = await LitJsSdk.checkAndSignAuthMessage({
      chain: "sepolia",
      nonce,
    });
    const decryptedString = LitJsSdk.decryptToString(
      {
        accessControlConditions,
        ciphertext,
        dataToEncryptHash,
        authSig,
        chain: "sepolia",
      },
      this.litNodeClient
    );
    return decryptedString;
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
          uses: "1",
          dAppOwnerWallet: signer,
          capacityTokenId: "959", // replace with your token id
          domain: window.location.host,
        });

      console.log("capacityDelegationAuthSig", capacityDelegationAuthSig);

      const authNeededCallback = async ({ resources, expiration, uri }) => {
        console.log("authneededcallback");

        const litResource = new LitActionResource("*");

        const recapObject =
          await this.litNodeClient!.generateSessionCapabilityObjectWithWildcards(
            [litResource]
          );

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
        console.log("nonce: ", nonce);

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
        capacityDelegationAuthSig,
      });
      console.log("sessionSigs: ", sessionSigs);
      return sessionSigs;
    } catch (err: any) {
      console.error(err);
    }
  }
}

export default new Lit();
