
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/components/LogChat.tsx');
const content = fs.readFileSync(filePath, 'utf-8');

const regex1 = /summary: `\[Medical Analyze\] Batch \$\{nextBatch\} \(Continue\)`,([\s\S]*?)else { resData = await response\.json\(\); }/g;
const regex2 = /summary: `\[Medical Analyze\] Processing Step: \$\{step\}`,([\s\S]*?)else { resData = await response\.json\(\); }/g;

const replacement = `                  summary: \`[Medical Analyze] Batch \${nextBatch} (Continue)\`,
                  logs: logsData.logs
               });
            }
         }
      } catch (e) {
        console.warn("Could not save agent request logs", e);
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(\`Server returned \${response.status}: \${errText}\`);
      }

      const contentType = response.headers.get("content-type"); let resData: any = {}; if (contentType && contentType.includes("text/event-stream")) { const reader = response.body?.getReader(); if (!reader) throw new Error("No stream reader available"); const decoder = new TextDecoder(); let accumulatedText = ""; let accumulatedByStage: { scout: string, dietitian: string } = { scout: "", dietitian: "" }; while (true) { const { done, value } = await reader.read(); if (done) break; const chunkStr = decoder.decode(value, { stream: true }); const events = chunkStr.split("\\n\\n"); for (const ev of events) { if (ev.startsWith("data: ")) { try { const data = JSON.parse(ev.slice(6)); if (data.chunk) { accumulatedText += data.chunk; const stage: string = data.stage === 'scout' ? 'scout' : 'dietitian'; accumulatedByStage[stage as keyof typeof accumulatedByStage] += data.chunk; const scoutMatch = accumulatedByStage.scout.match(/\\"scoutScratchpad\\"\\s*:\\s*\\"([^]*?)(\\"|$)/) || accumulatedText.match(/\\"scoutScratchpad\\"\\s*:\\s*\\"([^]*?)(\\"|$)/); const dietMatch = accumulatedByStage.dietitian.match(/\\"dietitianScratchpad\\"\\s*:\\s*\\"([^]*?)(\\"|$)/) || accumulatedText.match(/\\"dietitianScratchpad\\"\\s*:\\s*\\"([^]*?)(\\"|$)/); setMessages(prev => { const newMsgs = [...prev]; const lastMsg = newMsgs[newMsgs.length - 1]; if (lastMsg && lastMsg.role === "assistant" && lastMsg.isLive) { const updatedData = lastMsg.data ? { ...lastMsg.data } : {}; const updatedAgentResult = updatedData.agentResult ? { ...updatedData.agentResult } : {}; let hasChanges = false; if (scoutMatch) { updatedAgentResult.scoutScratchpad = scoutMatch[1].replace(/\\\\n/g, "\\n").replace(/\\\\\\"/g, "\\""); hasChanges = true; } if (dietMatch) { updatedAgentResult.dietitianScratchpad = dietMatch[1].replace(/\\\\n/g, "\\n").replace(/\\\\\\"/g, "\\""); hasChanges = true; } if (hasChanges) { return [ ...newMsgs.slice(0, newMsgs.length - 1), { ...lastMsg, data: { ...updatedData, agentResult: updatedAgentResult } } ]; } } return prev; }); } else if (data.final) { resData = data.result; } } catch (e) {} } } } } else { resData = await response.json(); }`;

const newContent = content.replace(regex1, replacement).replace(regex2, replacement.replace("Batch ${nextBatch} (Continue)", "Processing Step: ${step}"));

fs.writeFileSync(filePath, newContent);
console.log("File updated");
