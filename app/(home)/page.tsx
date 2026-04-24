import { type Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AgentOne Documentation",
  description: "View the documentation for AgentOne.",
};

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center text-center flex-1">
      <h1 className="text-2xl font-bold mb-4">
        Welcome to the AgentOne Documentation!
      </h1>
      <p>
        If you're looking for the main website, visit{" "}
        <Link
          href="https://www.agent-one.dev"
          className="font-medium underline"
        >
          www.agent-one.dev
        </Link>
        . Otherwise,
        <Link href="/docs" className="font-medium underline">
          click here to read the main documentation
        </Link>
        .
      </p>
    </div>
  );
}
