import lit from "@/lit";
import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<any>();
  const [encryptedBlob, setEncryptedBlob] = useState<any>();
  const [decrypted, setDecrypted] = useState<any>();

  async function handleEncrypt() {
    const _encryptedBlob = await lit.encrypt(file);
    console.log("encrypted: ", _encryptedBlob);
    setEncryptedBlob(_encryptedBlob);
  }

  async function handleDecrypt() {
    const _decrypted = await lit.decrypt(encryptedBlob);
    console.log("decrypted: ", _decrypted);
    setDecrypted(_decrypted);
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <input type="file" onChange={(e) => setFile(e.target.files?.[0])} />
      <button onClick={handleEncrypt}>Encrypt</button>
      {encryptedBlob && JSON.stringify(encryptedBlob)}
      {encryptedBlob && <button onClick={handleDecrypt}>Decrypt</button>}
      {decrypted && JSON.stringify(decrypted)}
    </div>
  );
}
