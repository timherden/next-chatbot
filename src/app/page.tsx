// src/app/page.tsx

import { ChatContainer } from "@/components/chat/container";

export default function Home() {
  // Add this console log
  console.log("Environment test:", {
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });

  return (
    <main className="min-h-screen bg-white">
      <ChatContainer />
    </main>
  );
}
