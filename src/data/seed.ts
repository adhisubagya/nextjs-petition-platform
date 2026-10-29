import type { Comment, Petition } from "@/lib/types";

export const seedPetition: Omit<Petition, "id"> = {
  title: "Campaign Title",
  description:
    "A short summary of what this campaign asks for, who it affects and why it matters. Replace this text with your own petition copy.",
  goal: 10000,
  signatureCount: 8452,
};

// [name, message, hours ago, pinned]
const rows: [string, string, number, boolean][] = [
  ["Campaign Team", "Thank you for every signature. We deliver the petition when we reach the goal.", 2, true],
  ["Maya R.", "Signed and shared with my family. This affects all of us.", 1, false],
  ["Daniel K.", "Long overdue. Glad someone finally organised this.", 3, false],
  ["Priya S.", "I've followed this issue for years. Count me in.", 5, false],
  ["Tom H.", "Sent this to my whole team at work.", 7, false],
  ["Lina M.", "Small changes like this make a real difference locally.", 9, false],
  ["Jonas W.", "Adding my name. Hope the decision makers are listening.", 12, false],
  ["Aisha B.", "This is exactly the kind of action our community needs.", 15, false],
  ["Marco D.", "Signed. Please keep us updated on the next steps.", 20, false],
  ["Sofia L.", "My neighbours and I all signed this morning.", 26, false],
  ["Ethan P.", "Clear ask, reasonable goal. Happy to support.", 31, false],
  ["Nadia F.", "Shared it in three group chats already.", 38, false],
  ["Kenji T.", "Hoping we get past ten thousand this week.", 44, false],
  ["Grace O.", "Thank you to the organisers for the clear updates.", 52, false],
  ["Lucas V.", "Signed on behalf of my parents too (they asked me to).", 60, false],
  ["Hana Y.", "This should have happened a long time ago.", 71, false],
  ["Omar A.", "Proud to add my voice.", 85, false],
  ["Elena G.", "Let's get this over the line!", 96, false],
];

export function seedComments(now = Date.now()): Omit<Comment, "id">[] {
  return rows.map(([name, message, hoursAgo, pinned]) => ({
    name,
    message,
    avatarUrl: null,
    pinned,
    createdAt: new Date(now - hoursAgo * 3_600_000).toISOString(),
  }));
}
