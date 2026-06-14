import OpenAI from 'openai';
import { Client as OllamaClient } from 'ollama-sdk';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { TRIP_TOOLS, executeTool, ToolDef } from './tripTools';

export type AIProvider = 'openai' | 'gemini' | 'ollama';
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const GEMINI_MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash'] as const;
export type GeminiModel = (typeof GEMINI_MODELS)[number];
export const DEFAULT_GEMINI_MODEL: GeminiModel = 'gemini-2.5-flash';
export const OLLAMA_MODELS = ['ollama-model1', 'ollama-model2'] as const;
export type OllamaModel = (typeof OLLAMA_MODELS)[number];
export const DEFAULT_OLLAMA_MODEL: OllamaModel = 'ollama-model1';

export interface ChatRunResult {
  reply: string;
  toolCalls: { name: string; args: any; result: any; error?: string }[];
}

const MAX_ROUNDS = 6;

const SYSTEM_PROMPT = `You are a helpful AI travel assistant embedded in a trip planner.
You can read and modify the user's current trip via tools.
Itinerary "stops" are ordered by stepNumber; legs are transport segments between consecutive stops.
When the user gives instructions, call the relevant tools to execute them, then briefly confirm what you did.
Keep responses concise. Always use tool ids (stepId) returned by list_steps when modifying stops.`;

export async function runChat(
  provider: AIProvider,
  apiKey: string,
  tripId: string,
  messages: ChatMessage[],
  model?: string
): Promise<ChatRunResult> {
  if (provider === 'openai') return runOpenAI(apiKey, tripId, messages);
  if (provider === 'gemini') return runGemini(apiKey, tripId, messages, model);
  if (provider === 'ollama') return runOllama(apiKey, tripId, messages, model);
  throw new Error(`Unsupported AI provider: ${provider}`);
}

// --- OpenAI ---
async function runOpenAI(
  apiKey: string,
  tripId: string,
  messages: ChatMessage[]
): Promise<ChatRunResult> {
  const client = new OpenAI({ apiKey });
  const tools = TRIP_TOOLS.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
  const convo: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
  const toolCalls: ChatRunResult['toolCalls'] = [];
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: convo,
      tools,
      tool_choice: 'auto',
    });
    const msg = resp.choices[0]?.message;
    if (!msg) break;
    convo.push(msg);
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const call of msg.tool_calls) {
        let args: any = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
        } catch {}
        let result: any;
        let error: string | undefined;
        try {
          result = await executeTool(tripId, call.function.name, args);
        } catch (e: any) {
          error = e.message || String(e);
          result = { error };
        }
        toolCalls.push({ name: call.function.name, args, result, error });
        convo.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }
    return { reply: msg.content || '', toolCalls };
  }
  return { reply: '(stopped after maximum tool rounds)', toolCalls };
}

// --- Gemini ---
function toGeminiSchema(p: ToolDef['parameters']): any {
  const mapType = (t: string): any => {
    switch (t) {
      case 'string':
        return SchemaType.STRING;
      case 'number':
        return SchemaType.NUMBER;
      case 'integer':
        return SchemaType.INTEGER;
      case 'boolean':
        return SchemaType.BOOLEAN;
      case 'array':
        return SchemaType.ARRAY;
      case 'object':
        return SchemaType.OBJECT;
      default:
        return SchemaType.STRING;
    }
  };
  const convert = (schema: any): any => {
    if (!schema || typeof schema !== 'object') return undefined;
    const out: any = { type: mapType(schema.type) };
    if (schema.description) out.description = schema.description;
    if (schema.enum) out.enum = schema.enum.map(String);
    if (schema.properties) {
      out.properties = {};
      for (const [k, v] of Object.entries(schema.properties)) {
        out.properties[k] = convert(v);
      }
    }
    if (schema.required) out.required = schema.required;
    if (schema.items) out.items = convert(schema.items);
    return out;
  };
  const root = convert(p);
  if (!root.properties || Object.keys(root.properties).length === 0) {
    // Gemini rejects object schemas with empty properties on some models
    root.properties = { _noop: { type: SchemaType.STRING } };
  }
  return root;
}

async function runGemini(
  apiKey: string,
  tripId: string,
  messages: ChatMessage[],
  modelName?: string
): Promise<ChatRunResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const chosenModel: string =
    modelName && (GEMINI_MODELS as readonly string[]).includes(modelName)
      ? modelName
      : DEFAULT_GEMINI_MODEL;
  const tools = [
    {
      functionDeclarations: TRIP_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: toGeminiSchema(t.parameters),
      })),
    },
  ];
  const model = genAI.getGenerativeModel({
    model: chosenModel,
    systemInstruction: SYSTEM_PROMPT,
    tools: tools as any,
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const last = messages[messages.length - 1];
  const chat = model.startChat({ history });

  const toolCalls: ChatRunResult['toolCalls'] = [];
  let userTurn: any = last.content;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const resp = await chat.sendMessage(userTurn);
    const calls = resp.response.functionCalls();
    if (calls && calls.length > 0) {
      const responses: any[] = [];
      for (const call of calls) {
        let result: any;
        let error: string | undefined;
        try {
          result = await executeTool(tripId, call.name, call.args || {});
        } catch (e: any) {
          error = e.message || String(e);
          result = { error };
        }
        toolCalls.push({
          name: call.name,
          args: call.args,
          result,
          error,
        });
        responses.push({
          functionResponse: {
            name: call.name,
            response: { content: result },
          },
        });
      }
      userTurn = responses;
      continue;
    }
    const text = resp.response.text() || '';
    return { reply: text, toolCalls };
  }
  return { reply: '(stopped after maximum tool rounds)', toolCalls };
async function runOllama(
  apiKey: string,
  tripId: string,
  messages: ChatMessage[],
  modelName?: string
): Promise<ChatRunResult> {
  const chosenModel: string =
    modelName && (OLLAMA_MODELS as readonly string[]).includes(modelName)
      ? modelName
      : DEFAULT_OLLAMA_MODEL;

  const client = new OllamaClient({ apiKey });
  const toolCalls: ChatRunResult['toolCalls'] = [];
  const systemPrompt = SYSTEM_PROMPT;
  const userMessages = messages.map((m) => m.content).join('\n');

  try {
    const response = await client.chat({
      model: chosenModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessages },
      ],
      tools: TRIP_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    });

    if (response.tool_calls && response.tool_calls.length > 0) {
      for (const call of response.tool_calls) {
        let args: any = {};
        try {
          args = JSON.parse(call.arguments || '{}');
        } catch {}
        let result: any;
        let error: string | undefined;
        try {
          result = await executeTool(tripId, call.name, args);
        } catch (e: any) {
          error = e.message || String(e);
          result = { error };
        }
        toolCalls.push({ name: call.name, args, result, error });
      }
    }

    return { reply: response.reply, toolCalls };
  } catch (error) {
    console.error('Error calling Ollama API:', error);
    return { reply: 'Failed to get a response from Ollama', toolCalls };
  }
}

// --- Translate ---
export async function translateText(
  provider: AIProvider,
  apiKey: string,
  text: string,
  sourceLang: string,
  targetLang: string,
  geminiModel?: string
): Promise<string> {
  const prompt = `Translate the following text from ${sourceLang} to ${targetLang}.
Return ONLY the translation, no preamble or quotes.

Text:
${text}`;
  if (provider === 'openai') {
    const client = new OpenAI({ apiKey });
    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });
    return resp.choices[0]?.message?.content?.trim() || '';
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const chosenModel: string =
    geminiModel && (GEMINI_MODELS as readonly string[]).includes(geminiModel)
      ? geminiModel
      : DEFAULT_GEMINI_MODEL;
  const model = genAI.getGenerativeModel({ model: chosenModel });
  const resp = await model.generateContent(prompt);
  return resp.response.text().trim();
}
