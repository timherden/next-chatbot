import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    console.log('API route: Received request');
    const { messages } = await request.json();
    console.log('API route: Parsed messages:', messages);

    // Transform messages array to Claude 3 format
    const transformedMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    // If first message is a system prompt, add it to the config
    let systemPrompt = undefined;
    if (transformedMessages.length > 0 && messages[0].role === 'system') {
      systemPrompt = messages[0].content;
      transformedMessages.shift(); // Remove system message from messages array
    }

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      messages: transformedMessages,
      system: systemPrompt, // Add system prompt if it exists
    };

    console.log('API route: Sending payload:', payload);

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
      body: JSON.stringify(payload),
      contentType: "application/json",
      accept: "application/json",
    });

    const response = await bedrockClient.send(command);
    const responseBody = response.body;

    if (!responseBody) {
      console.error('API route: No response body from Bedrock');
      return Response.json({ error: 'No response body from model' }, { status: 500 });
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('API route: Starting stream');
          for await (const chunk of responseBody) {
            if (chunk.chunk?.bytes) {
              const parsed = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes));
              console.log('API route: Received chunk:', parsed);
              
              // Handle different chunk types
              if (parsed.type === 'content_block_delta' && parsed.delta.type === 'text_delta') {
                const text = parsed.delta.text;
                if (text) {
                  console.log('API route: Sending text chunk:', text);
                  controller.enqueue(encoder.encode(text));
                }
              }
            }
          }
          console.log('API route: Stream complete');
          controller.close();
        } catch (error: unknown) {
          console.error('API route: Stream error:', error);
          controller.error(error instanceof Error ? error : new Error('Unknown streaming error'));
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: unknown) {
    console.error('API route error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}