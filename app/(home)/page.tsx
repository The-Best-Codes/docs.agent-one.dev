import { type Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "AgentOne Documentation",
  description:
    "Learn how to install, set up, and get the most out of AgentOne, the free, open-source AI agent for your desktop.",
};

const sections = [
  {
    href: "/docs/quickstart",
    title: "Quickstart",
    text: "Install AgentOne and send your first message.",
  },
  {
    href: "/docs/agent",
    title: "Agent Capabilities",
    text: "Tools, subagents, computer use, and scheduled agents.",
  },
  {
    href: "/docs/extensions",
    title: "Extensions",
    text: "Connect AgentOne to your apps with MCP.",
  },
  {
    href: "/docs/models",
    title: "Models & Providers",
    text: "AgentOne's model, your own keys, or local models.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center flex-1 px-4 py-16 md:py-24">
      <div className="flex flex-col items-center text-center max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          AgentOne Documentation
        </h1>
        <p className="text-fd-muted-foreground text-lg mb-8">
          Everything you need to install, set up, and get real work done with
          AgentOne, the free, open-source AI agent for your desktop.
        </p>
        <div className="flex flex-row flex-wrap justify-center gap-2">
          <Link href="/docs" className={buttonVariants({ variant: "primary" })}>
            Read the Docs
          </Link>
          <Link
            href="https://www.agent-one.dev/download"
            className={buttonVariants({ variant: "secondary" })}
          >
            Download AgentOne
          </Link>
        </div>
      </div>
      <div className="mt-12 w-full max-w-5xl">
        <img
          src="/images/docs/overview/hero.png"
          alt="The AgentOne desktop app with a chat open."
          className="w-full dark:hidden"
        />
        <img
          src="/images/docs/overview/hero-dark.png"
          alt="The AgentOne desktop app in dark mode with a chat open."
          className="w-full hidden dark:block"
        />
      </div>
      <div className="mt-12 grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-xl border bg-fd-card p-4 text-left transition-colors hover:bg-fd-accent"
          >
            <p className="font-semibold mb-1">{section.title}</p>
            <p className="text-sm text-fd-muted-foreground">{section.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
