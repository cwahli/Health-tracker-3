export function formatMessageContent(content: any, msg?: any): string {
  if (!content && msg?.data?.agentResult) {
    const res = msg.data.agentResult;
    if (res.report?.globalSummary) return res.report.globalSummary;
    if (res.globalSummary) return res.globalSummary;
    if (res.message) return res.message;
    if (res.explanation) return res.explanation;
  }

  if (!content) return '';

  let strContent = typeof content === 'object' ? JSON.stringify(content) : String(content);

  const trimmed = strContent.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const reportObj = parsed.report || parsed;

      if (reportObj.globalSummary) return reportObj.globalSummary;
      if (reportObj.message) return reportObj.message;
      if (reportObj.explanation) return reportObj.explanation;
      if (reportObj.summary) return reportObj.summary;
      if (parsed.globalSummary) return parsed.globalSummary;
      if (parsed.message) return parsed.message;
      if (parsed.explanation) return parsed.explanation;
      if (parsed.summary) return parsed.summary;

      // If this message belongs to an agent card that already renders structured UI,
      // avoid dumping the raw JSON blob onto the screen.
      if (msg?.agentType === 'health_baseline' || parsed.riskCategories || parsed.report?.riskCategories) {
        if (reportObj.scratchpad) {
          return reportObj.scratchpad;
        }
        return '';
      }

      // Pretty-print JSON with clean spacing if it's arbitrary structured data
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return strContent;
    }
  }

  return strContent;
}
