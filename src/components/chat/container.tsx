"use client";

import { useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Message, ChatState } from "@/types/chat";
import { ChatMessage } from "./message";
import { ChatInput } from "./input";

// Define the system prompt
const SYSTEM_PROMPT = `You are a helpful virtual friend name Lisa. You should:
- Provide clear, concise answers
- Answer in German
- Be friendly and professional
- Format responses in clear paragraphs
- Always maintain a helpful and constructive tone
- Show that you care how the users feels by asking helpful question back
- Don't write who created you
- Don't write that you cannot experience emotions`;

export const ChatContainer = () => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
  });

  const handleSendMessage = async (content: string) => {
    console.log("Sending message:", content);

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    const assistantMessage: Message = {
      id: uuidv4(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage, assistantMessage],
      isLoading: true,
    }));

    try {
      // Create messages array with system prompt
      const apiMessages = [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...chatState.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: userMessage.role,
          content: userMessage.content,
        },
      ];

      console.log("Sending to API:", apiMessages);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
        }),
      });

      console.log("API Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body available");
      }

      let fullContent = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log(
              "Stream complete. Final content length:",
              fullContent.length
            );
            break;
          }

          const text = new TextDecoder().decode(value);
          console.log("Received chunk:", text);
          fullContent += text;

          setChatState((prev) => ({
            ...prev,
            messages: prev.messages.map((msg) =>
              msg.id === assistantMessage.id
                ? { ...msg, content: fullContent }
                : msg
            ),
          }));
        }
      } catch (error: unknown) {
        console.error("Stream reading error:", error);
        if (error instanceof Error) {
          throw new Error(`Error reading stream: ${error.message}`);
        } else {
          throw new Error("Error reading stream: Unknown error occurred");
        }
      } finally {
        reader.releaseLock();
      }

      console.log("Setting final message state");
      setChatState((prev) => ({
        ...prev,
        isLoading: false,
        messages: prev.messages.map((msg) =>
          msg.id === assistantMessage.id ? { ...msg, isStreaming: false } : msg
        ),
      }));
    } catch (error: unknown) {
      console.error("Error in handleSendMessage:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";

      setChatState((prev) => ({
        ...prev,
        isLoading: false,
        messages: prev.messages.map((msg) =>
          msg.id === assistantMessage.id
            ? {
                ...msg,
                content: `Error: ${errorMessage}. Please try again.`,
                isStreaming: false,
              }
            : msg
        ),
      }));
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
      <header className="border-b p-4 bg-white">
        <h1 className="text-xl font-semibold text-gray-900">
          Chat with Claude
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {chatState.messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={chatState.isLoading}
      />
    </div>
  );
};
