import type { AuthSig } from "@lit-protocol/types";

export function getAccessControlConditions(
  contractAddress,
  chain,
  litAdminWalletAddress
) {
  return [
    {
      contractAddress: "",
      standardContractType: "",
      chain,
      method: "",
      parameters: [":userAddress"],
      returnValueTest: {
        comparator: "=",
        value: litAdminWalletAddress,
      },
    },
    { operator: "or" } as any, // this line causes type error even though it is valid
    {
      contractAddress,
      standardContractType: "ERC721",
      chain,
      method: "balanceOf",
      parameters: [":userAddress"],
      returnValueTest: {
        comparator: ">",
        value: "0",
      },
    },
  ];
}
