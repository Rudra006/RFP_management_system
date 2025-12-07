import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateRfpFromText(nl) {
  const sys = `You convert procurement needs into a JSON RFP. Return strictly JSON with fields: title, description, budget (number), delivery_timeline, items [ { name, quantity, specs } ], payment_terms, warranty.`;
  const user = `Convert to JSON RFP: ${nl}`;
  const res = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [ { role: 'system', content: sys }, { role: 'user', content: user } ],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });
  const text = res.choices[0].message.content;
  return JSON.parse(text);
}

export async function parseVendorEmail(rfp, emailText) {
  const sys = `You extract proposal data for a given RFP. Return JSON with: pricingItems [ { itemName, unitPrice, quantity, total } ], totalPrice, terms, delivery, warranty, paymentTerms, aiSummary.`;
  const user = `RFP: ${JSON.stringify(rfp)}\n\nVENDOR EMAIL:\n${emailText}`;
  const res = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [ { role: 'system', content: sys }, { role: 'user', content: user } ],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });
  const text = res.choices[0].message.content;
  return JSON.parse(text);
}

export async function compareProposals(rfp, proposals) {
  const sys = `You compare vendor proposals for an RFP. Return JSON with: ranked [ { vendorName, totalPrice, score, summary } ], recommendation.`;
  const user = `RFP: ${JSON.stringify(rfp)}\n\nPROPOSALS: ${JSON.stringify(proposals)}`;
  const res = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [ { role: 'system', content: sys }, { role: 'user', content: user } ],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });
  const text = res.choices[0].message.content;
  return JSON.parse(text);
}
