// Demo content shared by the app screenshots: a believable chat history for "Alex".
import { DAY, HOUR, NOW, assistant, user } from "./scene.mjs";

export const AGENT_ONE_MODEL = "agent-one-agent-one-auto";

export const usage = (inputTokens, outputTokens) => ({
  metadata: {
    modelId: AGENT_ONE_MODEL,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
  },
});

let toolCounter = 0;
export const tool = (name, input, output, state = "output-available") => ({
  type: `tool-${name}`,
  toolCallId: `call_${++toolCounter}`,
  state,
  input,
  ...(state === "output-available" ? { output } : {}),
  ...(state === "approval-requested"
    ? { approval: { id: `approval_${toolCounter}` } }
    : {}),
});

export const multi = (role, parts, extra = {}) => ({
  id: `msg-${role}-${++toolCounter}`,
  role,
  parts,
  ...extra,
});

export const LISBON_ANSWER = `Here's a relaxed two-day plan for Lisbon, built around the neighborhoods that are easiest to explore on foot.

| Time | Saturday | Sunday |
| --- | --- | --- |
| Morning | Belém and the Jerónimos Monastery | Tram 28 up to Graça |
| Afternoon | Lunch at LX Factory | Alfama and São Jorge Castle |
| Evening | Sunset at Santa Catarina | Fado dinner in Alfama |

> [!TIP]
> Get a **Viva Viagem** card at any metro station. It works on trams, buses, and the Santa Justa lift, and saves you a lot over single tickets.

I also saved a packing list to \`~/Desktop/lisbon-packing-list.md\` with comfortable shoes at the top, since Lisbon is famously hilly.`;

export const lisbonChat = {
  id: "chat-lisbon",
  title: "Weekend in Lisbon itinerary",
  modelId: AGENT_ONE_MODEL,
  createdAt: NOW - 25 * 60 * 1000,
  updatedAt: NOW - 20 * 60 * 1000,
  messages: [
    user(
      "I'm going to Lisbon next weekend. Can you put together a 2-day itinerary and save a packing list to my desktop?",
    ),
    multi(
      "assistant",
      [
        { type: "step-start" },
        tool(
          "webSearch",
          { query: "Lisbon weekend itinerary must see 2026", maxResults: 8 },
          {
            query: "Lisbon weekend itinerary must see 2026",
            total_results: 8,
            search_url: "https://duckduckgo.com/?q=Lisbon+weekend+itinerary",
            results: [
              {
                title: "48 Hours in Lisbon: The Perfect Weekend Itinerary",
                url: "https://www.visitlisboa.com/en/weekend",
                display_url: "visitlisboa.com",
                snippet:
                  "From Belém's monuments to Alfama's winding streets, here's how to spend two days in Lisbon.",
              },
              {
                title: "Tram 28 Guide: Route, Tips and Best Stops",
                url: "https://www.lisbonlux.com/lisbon/tram-28.html",
                display_url: "lisbonlux.com",
                snippet:
                  "Lisbon's most famous tram winds through Graça, Alfama, Baixa and Estrela.",
              },
            ],
          },
        ),
        { type: "step-start" },
        tool(
          "createFile",
          {
            filePath: "~/Desktop/lisbon-packing-list.md",
            content:
              "# Lisbon packing list\n\n- Comfortable walking shoes\n- Light rain jacket\n- Sunglasses and sunscreen\n- Reusable water bottle\n- Power adapter (Type F)\n",
          },
          { overwritten: false },
        ),
        { type: "step-start" },
        { type: "text", text: LISBON_ANSWER, state: "done" },
      ],
      usage(96000, 1180),
    ),
    user("Is there a good day trip if the weather is nice on Sunday?"),
    assistant(
      "Yes! **Sintra** is the classic choice. It's about 40 minutes by train from Rossio station, and the Pena Palace and Quinta da Regaleira are both worth the trip. If you'd rather stay by the sea, **Cascais** is a relaxed beach town on the same coast.",
      usage(118000, 240),
    ),
  ],
};

const filler = [
  ["Plan the Postgres migration", 6 * DAY + 3 * HOUR],
  ["Summarize Q3 sales report", 2 * HOUR],
  ["Draft reply to the landlord", 5 * HOUR],
  ["Fix flaky CI test in checkout flow", 9 * HOUR],
  ["Compare standing desks under $500", 1 * DAY + 3 * HOUR],
  ["Meal plan for the week", 1 * DAY + 7 * HOUR],
  ["Explain Rust lifetimes simply", 2 * DAY + 2 * HOUR],
  ["Rename vacation photos by date", 3 * DAY],
  ["Birthday gift ideas for Sam", 4 * DAY + 5 * HOUR],
  [
    "Daily briefing",
    6 * DAY,
    { scheduledAgentId: "sa-briefing", scheduledAgentTitle: "Daily briefing" },
  ],
  ["Spanish practice: ordering food", 9 * DAY],
  ["Clean up Downloads folder", 12 * DAY],
  ["Translate menu from Japanese", 16 * DAY],
  ["Resume bullet points for PM role", 24 * DAY],
  ["Set up home Wi-Fi mesh", 33 * DAY],
];

export const fillerChats = filler.map(([title, age, extra], index) => ({
  id:
    title === "Plan the Postgres migration"
      ? "chat-postgres"
      : `chat-filler-${index}`,
  title,
  modelId: AGENT_ONE_MODEL,
  createdAt: NOW - age,
  updatedAt: NOW - age + 15 * 60 * 1000,
  messages: [
    user(title),
    assistant(`Sure! Here's a quick take on "${title.toLowerCase()}".`),
  ],
  ...extra,
}));

export const allChats = [lisbonChat, ...fillerChats];

// ---- Feature chats -------------------------------------------------------

const MERMAID =
  "```mermaid\nflowchart LR\n  A[New order] --> B{In stock?}\n  B -- Yes --> C[Pack and ship]\n  B -- No --> D[Backorder]\n  D --> E[Email customer]\n  C --> F[Send tracking link]\n```";

export const richChat = {
  id: "chat-rich",
  title: "Order flow diagram",
  modelId: AGENT_ONE_MODEL,
  createdAt: NOW - 50 * 60 * 1000,
  messages: [
    user(
      "Can you sketch how our order fulfillment flow works as a diagram, and give me a script to count today's orders?",
    ),
    multi(
      "assistant",
      [
        { type: "step-start" },
        {
          type: "reasoning",
          text: "The user wants a diagram of a typical order flow plus a small script. A Mermaid flowchart fits the diagram, and a short Python snippet with the csv module will count rows for today's date.",
          state: "done",
        },
        {
          type: "text",
          state: "done",
          text: `Here's the flow as a diagram:\n\n${MERMAID}\n\nAnd a quick script that counts today's orders from your export:\n\n\`\`\`python\nimport csv\nfrom datetime import date\n\ntoday = date.today().isoformat()\nwith open("orders.csv") as f:\n    count = sum(row["date"] == today for row in csv.DictReader(f))\n\nprint(f"Orders today: {count}")\n\`\`\`\n\n> [!WARNING]\n> The script expects a date column in year-month-day format, like 2026-11-03.`,
        },
      ],
      usage(3200, 640),
    ),
  ],
};

export const approvalChat = {
  id: "chat-approval",
  title: "Organize screenshots folder",
  modelId: AGENT_ONE_MODEL,
  createdAt: NOW - 8 * 60 * 1000,
  messages: [
    user(
      "Move all the screenshots on my Desktop into a new Screenshots folder.",
    ),
    multi("assistant", [
      { type: "step-start" },
      tool(
        "executeCommand",
        {
          command:
            "mkdir -p ~/Desktop/Screenshots && mv ~/Desktop/Screenshot*.png ~/Desktop/Screenshots/",
          timeout: 120000,
        },
        undefined,
        "approval-requested",
      ),
    ]),
  ],
};

const SUMMARY = `## Goals\n- Plan a product launch for the new **Field Notes** app on November 18.\n- Draft the announcement email and three social posts.\n\n## Decisions so far\n- Launch on a Tuesday at 9am Pacific.\n- Keep the email under 150 words, friendly tone.\n\n## Next steps\n- Finalize the announcement email.\n- Write the social posts (X, LinkedIn, Bluesky).`;

export const compactedChat = {
  id: "chat-compacted",
  title: "Field Notes launch plan",
  modelId: AGENT_ONE_MODEL,
  createdAt: NOW - 3 * HOUR,
  messages: [
    user("Let's plan the Field Notes launch. It goes live November 18."),
    assistant(
      "Great, let's start with the timeline and the announcement email.",
      usage(90000, 900),
    ),
    user("Draft the announcement email first."),
    multi(
      "assistant",
      [
        {
          type: "text",
          state: "done",
          text: "Here's a first draft of the announcement email, kept under 150 words.",
        },
        {
          type: "data-compaction",
          id: "compaction-1",
          data: { status: "done", summary: SUMMARY, modelId: AGENT_ONE_MODEL },
        },
      ],
      usage(118000, 600),
    ),
    user("Now write the three social posts."),
    assistant(
      "**X:** Field Notes is live! Capture ideas the moment they hit, synced everywhere. 📝\n\n**LinkedIn:** Today we're launching Field Notes, a fast, private notebook for people who think on the go...\n\n**Bluesky:** New app day! Field Notes is out now.",
      usage(4200, 380),
    ),
  ],
};

export const branchedChat = {
  id: "chat-branch",
  title: "Weekend in Lisbon itinerary",
  modelId: AGENT_ONE_MODEL,
  branchOf: "chat-lisbon",
  createdAt: NOW - 10 * 60 * 1000,
  messages: lisbonChat.messages.slice(0, 2),
};

export const subagentChat = {
  id: "chat-subagent",
  title: "Compare three note-taking apps",
  modelId: AGENT_ONE_MODEL,
  createdAt: NOW - 40 * 60 * 1000,
  messages: [
    user(
      "Compare Obsidian, Notion, and Apple Notes for a small team. Research each one in parallel.",
    ),
    multi(
      "assistant",
      [
        { type: "step-start" },
        ...["Obsidian", "Notion", "Apple Notes"].map((app) =>
          tool(
            "subAgent",
            {
              task: `Research ${app} for a 5-person team`,
            },
            {
              kind: "complete",
              message: {
                id: `sub-${app}`,
                role: "assistant",
                parts: [
                  {
                    type: "text",
                    text: `${app}: summary of pricing, collaboration, offline support and export options.`,
                  },
                ],
              },
            },
          ),
        ),
        {
          type: "text",
          state: "done",
          text: "| | Obsidian | Notion | Apple Notes |\n| --- | --- | --- | --- |\n| Team price | $50/user/yr (Sync) | $10/user/mo | Free |\n| Real-time collaboration | Limited | Yes | Shared notes |\n| Works offline | Yes | Partial | Yes |\n\nFor a small team that collaborates a lot, **Notion** is the easiest fit.",
        },
      ],
      usage(22000, 900),
    ),
  ],
};

export const historyChat = {
  id: "chat-history",
  title: "Pick up the Postgres migration",
  modelId: AGENT_ONE_MODEL,
  createdAt: NOW - 15 * 60 * 1000,
  messages: [
    user("What did we decide about the Postgres migration last week?"),
    multi("assistant", [
      { type: "step-start" },
      tool(
        "searchChats",
        { query: "Postgres migration", limit: 10 },
        {
          results: [
            {
              chatId: "chat-postgres",
              title: "Plan the Postgres migration",
              snippet: "...move to Postgres 17 over the weekend...",
            },
          ],
        },
      ),
      { type: "step-start" },
      tool(
        "readChat",
        { chatId: "chat-postgres" },
        {
          chatId: "chat-postgres",
          title: "Plan the Postgres migration",
          isCurrent: false,
          start: 0,
          end: 8400,
          transcriptChars: 8400,
        },
      ),
      { type: "step-start" },
      {
        type: "text",
        state: "done",
        text: "Last week you decided to move to **Postgres 17** over the weekend of the 15th, using logical replication so the old database stays live until you switch over. You were still deciding whether to keep the read replica.",
      },
    ]),
  ],
};

export const computerUseChat = {
  id: "chat-computer-use",
  title: "Turn on Do Not Disturb",
  modelId: AGENT_ONE_MODEL,
  createdAt: NOW - 5 * 60 * 1000,
  messages: [
    user("Open System Settings and turn on Do Not Disturb until 5pm."),
    multi("assistant", [
      { type: "step-start" },
      tool(
        "computerUseObserve",
        { view: "runningApps" },
        {
          kind: "running",
          apps: [
            { name: "Finder", pid: 512, windows: ["Downloads"] },
            { name: "Safari", pid: 733, windows: ["AgentOne Docs"] },
          ],
        },
      ),
      { type: "step-start" },
      tool(
        "computerUseAct",
        {
          app: "System Settings",
          summary: "Open System Settings",
          action: { type: "openApp" },
        },
        { message: "Opened System Settings" },
      ),
      { type: "step-start" },
      tool(
        "computerUseAct",
        {
          app: "System Settings",
          summary: "Click Focus in the sidebar",
          action: { type: "click", element: "Focus" },
        },
        undefined,
        "approval-requested",
      ),
    ]),
  ],
};

/** One short exchange, for close-ups of a single message. */
export const shortChat = {
  id: "chat-short",
  title: "Day trip from Lisbon",
  modelId: AGENT_ONE_MODEL,
  createdAt: NOW - 30 * 60 * 1000,
  messages: [
    user("Is there a good day trip from Lisbon if the weather is nice?"),
    assistant(
      "Yes! **Sintra** is the classic choice. It's about 40 minutes by train from Rossio station, and the Pena Palace and Quinta da Regaleira are both worth the trip.",
      usage(2100, 120),
    ),
  ],
};

/** Older chats, so the sidebar's time groups have something in every section. */
export const olderChats = [
  ["Pick a new laptop for school", 36 * DAY],
  ["Halloween costume ideas", 40 * DAY],
].map(([title, age], index) => ({
  id: `chat-older-${index}`,
  title,
  modelId: AGENT_ONE_MODEL,
  createdAt: NOW - age,
  updatedAt: NOW - age + 15 * 60 * 1000,
  messages: [
    user(title),
    assistant(`Here are a few ideas for "${title.toLowerCase()}".`),
  ],
}));

// ---- Projects, auto mode, and skills (1.2.0) ------------------------------

export const PROJECT_FOLDER = "/Users/alex/Code/field-notes";

export const projects = [
  {
    id: "project-field-notes",
    name: "Field Notes app",
    folder: PROJECT_FOLDER,
    instructions:
      "This is a React Native app. Use TypeScript and run the tests before saying something is done.",
    separateMemory: true,
    memory: ["Releases go out on Tuesdays"],
  },
  {
    id: "project-kitchen",
    name: "Kitchen remodel",
    instructions:
      "Our kitchen is 3.2 m by 4 m. Keep the budget under $18,000 and prefer local suppliers.",
  },
];

const projectChat = (id, title, projectId, hoursAgo) => ({
  id,
  title,
  projectId,
  modelId: AGENT_ONE_MODEL,
  createdAt: NOW - hoursAgo * HOUR,
  messages: [user(title), assistant("Sure, let's get started.")],
});

export const projectChats = [
  projectChat(
    "chat-fn-onboarding",
    "Fix onboarding crash on Android",
    "project-field-notes",
    2,
  ),
  projectChat(
    "chat-fn-release",
    "Draft 2.4 release notes",
    "project-field-notes",
    26,
  ),
  projectChat(
    "chat-kitchen-cabinets",
    "Compare cabinet quotes",
    "project-kitchen",
    5,
  ),
  projectChat(
    "chat-kitchen-layout",
    "Island or peninsula?",
    "project-kitchen",
    50,
  ),
];

export const autoModeChat = {
  id: "chat-auto-mode",
  title: "Fix the date parsing bug",
  projectId: "project-field-notes",
  modelId: AGENT_ONE_MODEL,
  createdAt: NOW - 30 * 60 * 1000,
  messages: [
    user(
      "The due dates in Field Notes show up a day early. Can you fix it and commit the change?",
    ),
    multi("assistant", [
      { type: "step-start" },
      tool(
        "viewFile",
        { filePath: `${PROJECT_FOLDER}/src/utils/dates.ts` },
        {
          content:
            "export function parseDueDate(value: string) {\n  return new Date(value);\n}\n",
          totalLines: 3,
          totalChars: 66,
          truncated: false,
          startLine: 1,
          endLine: 3,
        },
      ),
      { type: "step-start" },
      {
        type: "tool-executeCommand",
        toolCallId: "call_auto_blocked",
        state: "output-denied",
        input: {
          command: "git push --force origin main",
          timeout: 120000,
        },
        approval: {
          id: "approval_auto_blocked",
          approved: false,
          isAutomatic: true,
          reason:
            "Auto mode blocked this action: You asked for a commit, not a force push to main, which would overwrite the shared history.",
        },
      },
      { type: "step-start" },
      {
        type: "text",
        state: "done",
        text: "I fixed `parseDueDate` so it reads dates in your local time zone and committed the change. Auto mode stopped me from force-pushing to `main`, so the commit is only on your computer for now. Want me to push it to a new branch instead?",
      },
    ]),
  ],
};

export const skillsChat = {
  id: "chat-skills",
  title: "Q3 sales slide deck",
  modelId: AGENT_ONE_MODEL,
  createdAt: NOW - 40 * 60 * 1000,
  messages: [
    user(
      "Turn the Q3 sales numbers in ~/Documents/q3-sales.csv into a short slide deck.",
    ),
    multi("assistant", [
      { type: "step-start" },
      tool(
        "listSkills",
        {},
        {
          skills: [
            {
              name: "brand-guidelines",
              description:
                "Colors, fonts, and logo rules for company documents.",
              folder: "/Users/alex/.agents/skills/brand-guidelines",
              file: "/Users/alex/.agents/skills/brand-guidelines/SKILL.md",
            },
            {
              name: "pptx",
              description: "Create and edit PowerPoint slide decks.",
              folder: "/Users/alex/.claude/skills/pptx",
              file: "/Users/alex/.claude/skills/pptx/SKILL.md",
            },
          ],
        },
      ),
      { type: "step-start" },
      tool(
        "viewFile",
        { filePath: "/Users/alex/.claude/skills/pptx/SKILL.md" },
        {
          content:
            "---\nname: pptx\ndescription: Create and edit PowerPoint slide decks.\n---\n",
          totalLines: 4,
          totalChars: 70,
          truncated: false,
          startLine: 1,
          endLine: 4,
        },
      ),
      { type: "step-start" },
      {
        type: "text",
        state: "done",
        text: "I followed your **pptx** and **brand-guidelines** skills and saved a five-slide deck to `~/Documents/q3-sales.pptx`, with revenue by region, the top ten products, and month-over-month growth.",
      },
    ]),
  ],
};
