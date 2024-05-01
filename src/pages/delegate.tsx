import lit from "@/lit";

export default function Delegate() {
  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between p-24`}
    >
      <button className="border p-4" onClick={() => lit.delegateCapacity()}>
        Delegate capacity
      </button>
    </main>
  );
}
