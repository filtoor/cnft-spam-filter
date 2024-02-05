import ClassifyClient from "./ClassifyClient";

export default function Home() {
  return (
    <div className="w-full flex flex-col items-center gap-4">
      <h1 className="text-4xl font-bold">cnft-spam-filter</h1>
      <span>running completely clientside</span>
      <ClassifyClient />
    </div>
  );
}
