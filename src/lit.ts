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
    LitJsSdk.disconnectWeb3();

    await client.connect();
    this.litNodeClient = client;
  }

  async delegateCapacity() {
    try {
      if (!this.litNodeClient) {
        await this.connect();
      }
      // @ts-ignore
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

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
          address: signer.address,
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
          address: signer.address,
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

export default new Lit();
