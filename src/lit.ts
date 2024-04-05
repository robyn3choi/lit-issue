import { SiweMessage } from "siwe";
import { ethers } from "ethers";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { LitAbility, LitActionResource } from "@lit-protocol/auth-helpers";

const client = new LitJsSdk.LitNodeClient({
  litNetwork: "habanero",
  alertWhenUnauthorized: false,
  checkNodeAttestation: true,
});

class Lit {
  private litNodeClient;

  async connect() {
    await client.connect();
    this.litNodeClient = client;
  }

  async delegateCapacity() {
    try {
      if (!this.litNodeClient) {
        await this.connect();
      }
      // @ts-ignore
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      // MetaMask requires requesting permission to connect users accounts
      await provider.send("eth_requestAccounts", []);

      // The MetaMask plugin also allows signing transactions to
      // send ether and pay to change state within the blockchain.
      // For this, you need the account signer...
      const signer = provider.getSigner();

      const address = await signer.getAddress();

      const { capacityDelegationAuthSig } =
        await this.litNodeClient!.createCapacityDelegationAuthSig({
          uses: "1",
          dAppOwnerWallet: signer,
          capacityTokenId: "725", // replace with your token id
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

        let siweMessage = new SiweMessage({
          domain: window.location.host,
          address: address,
          statement: "Some custom statement.",
          uri,
          version: "1",
          chainId: 1,
          expirationTime: expiration,
          resources,
        });

        siweMessage = recapObject.addToSiweMessage(siweMessage);

        const messageToSign = siweMessage.prepareMessage();
        const signature = await signer.signMessage(messageToSign);

        const authSig = {
          sig: signature.replace("0x", ""),
          derivedVia: "web3.eth.personal.sign",
          signedMessage: messageToSign,
          address: address,
        };

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
      return sessionSigs;
    } catch (err: any) {
      console.error(err);
    }
  }
}

const l = {
  sig: "618264d05f0189ede6e273aaea31506d5e93066b38c7c3c4d1952f7ad3c2a279396698ee7e5803f5518de5ad1052e7031653646442db1d2b894ee17b25c48d4c1b",
  derivedVia: "web3.eth.personal.sign",
  signedMessage:
    "localhost:3000 wants you to sign in with your Ethereum account:\n0x2746c12CEA9403148202Ed1a7F362987c17cc249\n\nSome custom statement. I further authorize the stated URI to perform the following actions on my behalf: (1) 'Threshold': 'Execution' for 'lit-litaction://*'.\n\nURI: lit:session:a430283f1eddda1032c5b00f4b97f859d296c75b64c5016b40d96eae35713a0d\nVersion: 1\nChain ID: 1\nNonce: Ur0JmKH9Z7PCJABt0\nIssued At: 2024-04-05T19:00:38.967Z\nExpiration Time: 2024-04-05T20:00:38.950Z\nResources:\n- urn:recap:eyJhdHQiOnt9LCJwcmYiOltdfQ\n- urn:recap:eyJhdHQiOnsibGl0LWxpdGFjdGlvbjovLyoiOnsiVGhyZXNob2xkL0V4ZWN1dGlvbiI6W3t9XX19LCJwcmYiOltdfQ",
  address: "0x2746c12CEA9403148202Ed1a7F362987c17cc249",
};

export default new Lit();
