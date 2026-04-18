const { GoogleGenerativeAI } = require('@google/generative-ai');

let model = null;

function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  if (!model) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
  return model;
}

function safeParseJson(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

async function scoreNeedReport(report) {
  const prompt = `
You are an expert at evaluating community welfare need reports for NGOs.

Given the following need report, assign an urgency score from 1 to 10 (10 = most urgent)
and provide a one-sentence reason.

Report:
- Category: ${report.category}
- Description: ${report.description}
- Self-reported severity: ${report.severity_self_reported || 'Not specified'}
- Estimated people affected: ${report.affected_count || 'Not specified'}

Respond ONLY in this exact JSON format:
{
  "urgency_score": <number 1-10>,
  "urgency_reason": "<one sentence>"
}
`.trim();

  const result = await getModel().generateContent(prompt);
  const text = result.response.text().trim();
  return safeParseJson(text);
}

async function matchVolunteers(task, volunteers) {
  const prompt = `
You are an expert volunteer coordinator for an NGO.

Task Details:
- Title: ${task.title}
- Description: ${task.description}
- Location: ${task.location}
- Category: ${task.category}
- Required Skills: ${(task.required_skills || []).join(', ')}
- Deadline: ${task.deadline || 'Not specified'}

Available Volunteers (JSON array):
${JSON.stringify(volunteers, null, 2)}

Each volunteer object has: id, display_name, skills (array), availability (array), location_preference, bio.

Select the top 3 most suitable volunteers for this task.
For each, explain in one sentence why they are a good match.

Respond ONLY in this exact JSON format:
{
  "matches": [
    {
      "volunteer_id": "<id>",
      "match_score": <number 1-100>,
      "reason": "<one sentence>"
    }
  ]
}
`.trim();

  const result = await getModel().generateContent(prompt);
  const text = result.response.text().trim();
  return safeParseJson(text);
}

module.exports = {
  scoreNeedReport,
  matchVolunteers,
};
