import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export type Model = "openai" | "anthropic" | "deepseek";

export type OpenAIMessage =
    | OpenAI.ChatCompletionUserMessageParam
    | OpenAI.ChatCompletionAssistantMessageParam
    | OpenAI.ChatCompletionSystemMessageParam;

interface AIResponse {
    message?: string;
    tool_calls?: Array<{
        function: {
            name: string;
            arguments: string;
        };
    }> | null;
}

export class AIWrapper {
    private readonly client: OpenAI | Anthropic;
    private readonly clientType: Model;

    constructor(model: Model, apiKey: string) {
        this.clientType = model;

        switch (model) {
            case "openai":
                this.client = new OpenAI({ apiKey });
                break;
            case "anthropic":
                this.client = new Anthropic({ apiKey });
                break;
            case "deepseek":
                this.client = new OpenAI({
                    baseURL: "https://api.deepseek.com",
                    apiKey,
                });
                break;
            default:
                throw new Error(`Unsupported model type: ${model}`);
        }
    }

    async query(
        messages: OpenAIMessage[],
        tools?: OpenAI.ChatCompletionTool[],
    ): Promise<AIResponse | null> {
        switch (this.clientType) {
            case "openai":
            case "deepseek":
                return this.handleOpenAIQuery(messages, tools);
            case "anthropic":
                return this.handleAnthropicQuery(messages, tools);
            default:
                throw new Error(`Unsupported model type: ${this.clientType}`);
        }
    }

    private async handleOpenAIQuery(
        messages: OpenAIMessage[],
        tools?: OpenAI.ChatCompletionTool[],
    ): Promise<AIResponse | null> {
        if (!(this.client instanceof OpenAI)) {
            throw new Error("OpenAI client not initialized");
        }

        const response = await this.client.chat.completions.create({
            messages,
            tools,
            model: this.clientType === "openai" ? "gpt-4" : "deepseek-chat",
        });

        const choice = response.choices[0]?.message;
        if (!choice) return null;

        return {
            tool_calls: choice.tool_calls ?? null,
            message: choice.content ?? undefined,
        };
    }

    private async handleAnthropicQuery(
        messages: OpenAIMessage[],
        tools?: OpenAI.ChatCompletionTool[],
    ): Promise<AIResponse | null> {
        if (!(this.client instanceof Anthropic)) {
            throw new Error("Anthropic client not initialized");
        }

        const systemMessages = messages.filter((msg) => msg.role === "system");
        const contextMessages = systemMessages.filter(
            (msg) =>
                typeof msg.content === "string" &&
                msg.content.startsWith("## Context"),
        );

        const systemMessage = [
            systemMessages[0]?.content,
            contextMessages[contextMessages.length - 1]?.content,
        ]
            .filter(Boolean)
            .join("\n\n");

        const anthropicMessages = messages.filter(
            (msg) => msg.role !== "system",
        ) as Anthropic.Message[];
        const anthropicTools = tools?.map((tool) => ({
            name: tool.function.name,
            description: tool.function.description,
            input_schema: tool.function.parameters ?? {},
        }));

        const response = await this.client.messages.create({
            messages: anthropicMessages,
            model: "claude-3-sonnet-20240229",
            system: systemMessage,
            max_tokens: 1024,
            tools: anthropicTools as Anthropic.Tool[],
        });

        const textContent = response.content.find(
            (entry) => entry.type === "text",
        )?.text;
        const toolCalls = response.content
            .filter((entry) => entry.type === "tool_use")
            .map((entry) => ({
                function: {
                    name: entry.name,
                    arguments: JSON.stringify(entry.input),
                },
            }));

        return {
            message: textContent,
            tool_calls: toolCalls.length > 0 ? toolCalls : null,
        };
    }
}
