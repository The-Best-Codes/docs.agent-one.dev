import { type Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AgentOne Documentation",
  description: "View the documentation for AgentOne.",
};

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center items-center text-center flex-1">
      <h1 className="text-2xl font-bold mb-4">
        Welcome to the AgentOne Documentation!
      </h1>
      <div className="flex flex-row gap-2">
        <Link
          href="/docs"
          className="px-2.5 py-1 bg-white rounded-md border border-gray-300 text-gray-900"
        >
          Read Documentation
        </Link>
        <Link
          href="https://www.agent-one.dev"
          className="px-2.5 py-1 bg-black text-white rounded-md border border-gray-900"
        >
          Visit Website
        </Link>
      </div>
    </div>
  );
}
