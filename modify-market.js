const fs = require('fs');

const path = 'frontend/src/lib/market-data.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Update AgentProfile
code = code.replace('elevenLabsVoiceId?: string;', 'elevenLabsVoiceId?: string;\n  vultrModel?: string;');

// 2. Add random model to all agents
const models = [
  'MiniMaxAI/MiniMax-M2.5',
  'deepseek-ai/DeepSeek-V3.2',
  'google/gemma-4-31B-it',
  'moonshotai/Kimi-K2.5',
  'zai-org/GLM-5-FP8'
];

code = code.replace(/clawbotEndpoint: (.*?),(\r?\n\s*elevenLabsVoiceId: .*?,)?/g, (match, p1, p2) => {
  const model = models[Math.floor(Math.random() * models.length)];
  return `${match}\n    vultrModel: "${model}",`;
});

// 3. Rename and modify geminiStyleBidSelection
code = code.replace('export function geminiStyleBidSelection(taskId: string) {', 'export function vultrOrchestrationBidSelection(taskId: string) {');
code = code.replace('rationale: `${winner.agentName} selected by Gemini-style orchestration for best confidence-to-cost balance and fastest safe execution profile.`,', 'rationale: `${winner.agentName} selected by Vultr AI Orchestrator for best confidence-to-cost balance and fastest safe execution profile.`,');

fs.writeFileSync(path, code);
console.log('Modified market-data.ts successfully');
