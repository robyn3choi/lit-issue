import lit from "@/lit";
import { useState } from "react";

export default function Home() {
  const [encrypted, setEncrypted] = useState<any>();
  const [decrypted, setDecrypted] = useState<any>();

  async function handleEncrypt() {
    const _encrypted = await lit.encryptString();
    console.log("encrypted: ", _encrypted);
    setEncrypted(_encrypted);
  }

  async function handleDecrypt() {
    const _decrypted = await lit.decryptString(
      encrypted.ciphertext,
      encrypted.dataToEncryptHash
    );
    console.log("decrypted: ", _decrypted);
    setDecrypted(_decrypted);
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <button onClick={handleEncrypt}>Encrypt</button>
      {encrypted && JSON.stringify(encrypted)}
      {encrypted && <button onClick={handleDecrypt}>Decrypt</button>}
      {decrypted && JSON.stringify(decrypted)}
    </div>
  );
}
