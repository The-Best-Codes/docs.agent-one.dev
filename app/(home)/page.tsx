import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center text-center flex-1">
      <h1 className="text-2xl font-bold mb-4">AgentOne Documentation</h1>
      <p>
        Click to view the{" "}
        <Link href="/docs" className="font-medium underline">
          documentation
        </Link>
        . Don't know how you wound up here?{" "}
        <Link href="https://agent-one.dev" className="font-medium underline">
          View the main website
        </Link>
        .
      </p>
    </div>
  );
}
