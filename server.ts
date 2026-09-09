import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Prevent 404 for favicon requests
app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
});

// Lazy-safe Gemini initialization
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Resilient Gemini generator with fallback to gemini-3.1-flash-lite during temporary demand spikes
async function generateWithGemini(ai: any, params: { contents: any; config?: any }) {
  try {
    return await ai.models.generateContent({
      model: "gemini-3.8-flash",
      ...params,
    });
  } catch (err: any) {
    const isDemandSpike =
      err.message?.includes("503") ||
      err.message?.includes("high demand") ||
      err.message?.includes("UNAVAILABLE") ||
      err.status === 503;
    if (isDemandSpike) {
      console.warn("Retrying with gemini-3.1-flash-lite due to temporary demand spike...");
      return await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        ...params,
      });
    }
    throw err;
  }
}

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "FlowOS API",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// 2. AI Reply Assistant for WhatsApp Inbox
app.post("/api/ai/reply-suggestions", async (req, res) => {
  try {
    const {
      business,
      message,
      history = [],
      customer,
      knowledgeBase,
      products = [],
      actionType = "generate_reply",
    } = req.body;

    const ai = getAI();

    const bizName = business?.name || knowledgeBase?.businessName || "the store";
    const ownerName = business?.ownerName || "the store owner";
    const currency = business?.currency || "₦";
    const bizLocation = business?.location || knowledgeBase?.location || "Nigeria";
    const bizDescription =
      business?.description ||
      knowledgeBase?.businessDescription ||
      "Retail and customer commerce.";
    const deliveryPolicy =
      knowledgeBase?.deliveryPolicy ||
      "Standard dispatch and nationwide delivery available.";
    const paymentMethods =
      knowledgeBase?.paymentMethods ||
      "Direct bank transfer or secure checkout link.";
    const returnPolicy =
      knowledgeBase?.returnPolicy ||
      "Returns accepted within standard return period for undamaged items.";
    const brandVoice =
      knowledgeBase?.brandVoice || "Warm, polite, helpful, and professional.";

    // Fallback if Gemini key is not configured
    if (!ai) {
      const fallback = getFallbackReply(actionType, message, customer, products, business, knowledgeBase);
      const stageInfo = detectStageFromMessageAndReply(message, fallback, customer?.leadStage);
      return res.json({
        suggestion: fallback,
        suggestedStage: stageInfo.suggestedStage,
        intent: stageInfo.intent,
        confidence: "medium",
        source: "local-rules",
      });
    }

    const productCatalogText =
      Array.isArray(products) && products.length > 0
        ? products
            .slice(0, 15)
            .map(
              (p: any) =>
                `• ${p.name}: ${currency}${Number(p.price || 0).toLocaleString()} | SKU: ${p.sku || "N/A"}${p.sizes?.length ? ` | Sizes: ${p.sizes.join(", ")}` : ""}${p.colours?.length ? ` | Colors: ${p.colours.join(", ")}` : ""}${p.description ? ` | Info: ${p.description}` : ""}`
            )
            .join("\n")
        : "No products currently listed in the catalog. The store catalog is currently empty or custom orders are accepted upon request.";

    const systemPrompt = `You are the AI Sales Assistant inside FlowOS for "${bizName}", based in ${bizLocation}.
Owner: ${ownerName}. Currency: ${currency}.
Business Description: ${bizDescription}

BRAND KNOWLEDGE BASE & POLICIES:
Description: ${bizDescription}
Location: ${bizLocation}
Delivery Policy: ${deliveryPolicy}
Payment Methods: ${paymentMethods}
Return Policy: ${returnPolicy}
Brand Tone & Voice: ${brandVoice}

PRODUCTS CATALOG:
${productCatalogText}

RULES:
1. Ground answers strictly in the knowledge base, policies, and product catalog above. Never invent prices, discounts, or fake products.
2. If the product catalog is empty (0 products listed), do NOT fabricate items, prices, or false availability. Politely ask what the customer is looking for, or describe the business offerings based on: "${bizDescription}".
3. If customer asks something outside the catalog or knowledge base, politely acknowledge and offer to check with ${ownerName}.
4. Keep replies concise, conversational, and natural for WhatsApp messaging. Follow the brand voice: "${brandVoice}".
5. Action requested: ${actionType} (options: generate_reply, shorten, friendlier, professional, followup, suggest_response).
`;

    const userPrompt = `
Customer Name: ${customer?.name || "Customer"}
Customer Location: ${customer?.location || "Not specified"}
Customer Current Lead Stage: ${customer?.leadStage || "NEW_LEAD"}

Recent conversation snippet:
${history
  .slice(-4)
  .map((m: any) => `${m.sender === "customer" ? "Customer" : "Business"}: ${m.content}`)
  .join("\n")}

Latest incoming message: "${message || ""}"

Instruction:
1. Write a single WhatsApp response suitable for this customer based on action "${actionType}".
2. Detect the customer's sales stage and intent based on the conversation and your proposed response:
   - "AWAITING_PAYMENT": If the conversation signals purchase intent (customer asking for account/bank details, how to pay, invoice, sending transfer confirmation, or ready to purchase).
   - "PRODUCT_SELECTED": If the customer has selected or confirmed a specific item, size, color, or reservation.
   - "INTERESTED": If the customer asks about product availability, prices, delivery, catalog, or expresses interest.
   - "NEW_LEAD": If it is an initial greeting or general inquiry without specific product interest.

Return ONLY a valid JSON object matching this schema:
{
  "suggestion": "string containing the WhatsApp reply text",
  "suggestedStage": "NEW_LEAD" | "INTERESTED" | "PRODUCT_SELECTED" | "AWAITING_PAYMENT",
  "intent": "interest" | "purchase" | "general"
}`;

    let replyText = "";
    let suggestedStage = "NEW_LEAD";
    let intent = "general";

    try {
      const response = await generateWithGemini(ai, {
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      replyText = parsed.suggestion || "";
      suggestedStage = parsed.suggestedStage || "NEW_LEAD";
      intent = parsed.intent || "general";
    } catch {
      // If JSON parsing or model generation fails, attempt standard text generation
      try {
        const fallbackAi = await generateWithGemini(ai, {
          contents: `Write a single WhatsApp response suitable for this customer based on action "${actionType}": "${message}". Customer: ${customer?.name || "Customer"}. Return ONLY the reply text.`,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
          },
        });
        replyText = fallbackAi.text ? fallbackAi.text.trim() : "";
      } catch {
        replyText = "";
      }
    }

    if (!replyText) {
      replyText = getFallbackReply(actionType, message, customer, products, business, knowledgeBase);
    }

    // Reinforce / cross-validate stage detection using our deterministic intent engine
    const detected = detectStageFromMessageAndReply(message, replyText, customer?.leadStage);
    if (detected.suggestedStage !== "NEW_LEAD" && (suggestedStage === "NEW_LEAD" || detected.intent === "purchase")) {
      suggestedStage = detected.suggestedStage;
      intent = detected.intent;
    }

    res.json({
      suggestion: replyText,
      suggestedStage,
      intent,
      confidence: "high",
      source: "gemini",
    });
  } catch (error: any) {
    console.error("AI Reply error:", error);
    // Graceful fallback so UI remains functional
    const fallback = getFallbackReply(
      req.body.actionType,
      req.body.message,
      req.body.customer,
      req.body.products,
      req.body.business,
      req.body.knowledgeBase
    );
    const stageInfo = detectStageFromMessageAndReply(req.body.message, fallback, req.body.customer?.leadStage);
    res.json({
      suggestion: fallback,
      suggestedStage: stageInfo.suggestedStage,
      intent: stageInfo.intent,
      confidence: "medium",
      source: "fallback",
      error: error.message,
    });
  }
});

// 3. AI Customer Summary & Recommended Action
app.post("/api/ai/summarize-customer", async (req, res) => {
  try {
    const { messages = [], customerName = "Customer", business } = req.body;
    const ai = getAI();
    const bizName = business?.name || "our store";

    if (!ai || messages.length === 0) {
      return res.json({
        summary: `Customer ${customerName} inquired about product details and order availability at ${bizName}. High purchase intent indicated.`,
        recommendedAction: "Send WhatsApp invoice link and confirm delivery details.",
      });
    }

    const conversationText = messages
      .slice(-10)
      .map((m: any) => `${m.sender}: ${m.content}`)
      .join("\n");

    const prompt = `Analyze this WhatsApp sales conversation for customer ${customerName} interacting with ${bizName}:
${conversationText}

Provide a JSON object with:
"summary": a concise 1-2 sentence overview of what the customer wants, their objections or preferences.
"recommendedAction": a specific, actionable next step for the sales rep (e.g., "Follow up within 2 hours with invoice").`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    res.json({
      summary: result.summary || `Customer ${customerName} is considering a purchase from ${bizName}.`,
      recommendedAction: result.recommendedAction || "Follow up today via WhatsApp.",
    });
  } catch (error: any) {
    const bizName = req.body?.business?.name || "our store";
    res.json({
      summary: `Customer ${req.body?.customerName || "Customer"} inquired about product availability and ordering from ${bizName}.`,
      recommendedAction: "Send product details and payment link via WhatsApp.",
    });
  }
});

// 4. AI Business Analytics Insights
app.post("/api/ai/analytics-insights", async (req, res) => {
  try {
    const { metrics, pipelineStats, topProducts, business } = req.body;
    const ai = getAI();

    const bizName = business?.name || "your store";
    const ownerName = business?.ownerName || "the business owner";
    const currency = business?.currency || "₦";
    const location = business?.location || "Nigeria";
    const category = business?.category || "commerce";

    const topProductName =
      Array.isArray(topProducts) && topProducts.length > 0 && topProducts[0]?.name
        ? topProducts[0].name
        : null;

    const isBrandNew =
      (!metrics?.totalOrders || Number(metrics.totalOrders) === 0) &&
      (!metrics?.revenueThisMonth || Number(metrics.revenueThisMonth) === 0) &&
      (!topProducts || topProducts.length === 0);

    const buildFallbackInsights = () => {
      if (isBrandNew) {
        return [
          `Welcome to FlowOS! ${bizName} is set up and ready to capture its first WhatsApp inquiries.`,
          `Add your core products and prices to the catalog so customers can view your inventory immediately.`,
          `Share your WhatsApp store link across your social channels to start building an inbound sales pipeline.`,
          `Responding to incoming WhatsApp leads within 15 minutes increases first-time order conversion by up to 50%.`,
        ];
      }
      return [
        `Your biggest sales opportunity is closing pending payments: ${currency}${Number(
          metrics?.recoverableRevenue || metrics?.outstandingPayments || 0
        ).toLocaleString()} in recoverable revenue across customer follow-ups.`,
        topProductName
          ? `"${topProductName}" is currently leading catalog demand and conversion volume for ${bizName}.`
          : `Expanding your active WhatsApp product catalog will help drive higher engagement for ${bizName}.`,
        `Your current conversion rate is ${
          metrics?.conversionRate || "18%"
        }. Fast WhatsApp follow-ups within 2 hours increase payment completion rates by up to 35%.`,
        `${metrics?.totalOrders || 0} total orders recorded to date for ${bizName}. Focus on repeat customer retention for consistent monthly revenue.`,
      ];
    };

    if (!ai) {
      return res.json({
        insights: buildFallbackInsights(),
      });
    }

    const prompt = `Analyze the performance metrics for ${category} business "${bizName}" located in ${location}:
Owner: ${ownerName}
Currency: ${currency}
Revenue Today: ${currency}${Number(metrics?.revenueToday || 0).toLocaleString()}
Revenue This Month: ${currency}${Number(metrics?.revenueThisMonth || 0).toLocaleString()}
Total Orders: ${metrics?.totalOrders || 0}
Conversion Rate: ${metrics?.conversionRate || "0%"}
Outstanding Payments: ${currency}${Number(metrics?.outstandingPayments || 0).toLocaleString()}
Recoverable Follow-up Revenue: ${currency}${Number(metrics?.recoverableRevenue || 0).toLocaleString()}
Top Products: ${JSON.stringify(topProducts || [])}
Pipeline: ${JSON.stringify(pipelineStats || [])}

IMPORTANT RULES:
1. If the business is brand new with 0 orders and an empty product catalog, do NOT mention "closing pending payments of ${currency}0" or complain about 0 orders. Instead, provide 4 encouraging, actionable launch and growth insights (e.g. setting up catalog products, sharing WhatsApp links, fast response times, and initial customer outreach).
2. Ground all numbers strictly in the figures above. Never invent fake orders or products.
3. Return a JSON array of 4 concise bullet strings.`;

    const response = await generateWithGemini(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "[]");
    res.json({
      insights: Array.isArray(parsed) && parsed.length > 0 ? parsed : buildFallbackInsights(),
    });
  } catch (error: any) {
    const bizName = req.body?.business?.name || "your store";
    const currency = req.body?.business?.currency || "₦";
    const metrics = req.body?.metrics || {};
    const topProducts = req.body?.topProducts || [];
    const topProductName =
      Array.isArray(topProducts) && topProducts.length > 0 && topProducts[0]?.name
        ? topProducts[0].name
        : null;
    const isBrandNew =
      (!metrics?.totalOrders || Number(metrics.totalOrders) === 0) &&
      (!metrics?.revenueThisMonth || Number(metrics.revenueThisMonth) === 0) &&
      (!topProducts || topProducts.length === 0);

    res.json({
      insights: isBrandNew
        ? [
            `Welcome to FlowOS! ${bizName} is set up and ready to capture its first WhatsApp inquiries.`,
            `Add your core products and prices to the catalog so customers can view your inventory.`,
            `Share your WhatsApp store link to start building your initial customer pipeline.`,
            `Fast WhatsApp responses within 15 minutes significantly boost initial order completions.`,
          ]
        : [
            `Your biggest sales opportunity is closing pending payments: ${currency}${Number(
              metrics?.recoverableRevenue || metrics?.outstandingPayments || 0
            ).toLocaleString()} in recoverable revenue.`,
            topProductName
              ? `"${topProductName}" is currently your highest-converting product in ${bizName}.`
              : `Prioritizing payment follow-ups today will help capture pending revenue for ${bizName}.`,
            `Conversion rate is ${metrics?.conversionRate || "18%"}. Consistent customer check-ins drive repeat sales.`,
          ],
    });
  }
});

// 5. Dedicated AI Business Assistant Copilot
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { query, workspaceContext } = req.body;
    const ai = getAI();

    const biz = workspaceContext?.business || {};
    const kb = workspaceContext?.knowledgeBase || {};
    const bizName = biz.name || "your business";
    const ownerName = biz.ownerName || "the store owner";
    const currency = biz.currency || "₦";
    const location = biz.location || kb.location || "Nigeria";
    const category = biz.category || "Commerce";

    if (!ai) {
      return res.json({
        answer: getFallbackAssistantAnswer(query, workspaceContext),
        source: "local-data-engine",
      });
    }

    const systemPrompt = `You are the AI Business Intelligence Assistant inside FlowOS for "${bizName}", owned by ${ownerName} in ${location}.
The user is asking a natural-language question about their business performance, customers, leads, products, orders, knowledge-base policies, or follow-ups.

CURRENT REAL WORKSPACE DATA:
- Business: ${bizName} (Owner: ${ownerName}, Category: ${category}, Location: ${location})
- Currency: ${currency}
- Revenue Today: ${currency}${Number(workspaceContext?.metrics?.revenueToday || 0).toLocaleString()}
- Revenue This Month: ${currency}${Number(workspaceContext?.metrics?.revenueThisMonth || 0).toLocaleString()}
- Total Orders: ${workspaceContext?.metrics?.totalOrders || 0}
- Conversion Rate: ${workspaceContext?.metrics?.conversionRate || "0%"}
- Outstanding Unpaid Payments: ${currency}${Number(workspaceContext?.metrics?.outstandingPayments || 0).toLocaleString()}
- Follow-ups Due: ${workspaceContext?.metrics?.followUpsDue || 0}
- Recoverable Revenue: ${currency}${Number(workspaceContext?.metrics?.recoverableRevenue || 0).toLocaleString()}

BRAND POLICIES & KNOWLEDGE BASE:
- Description: ${kb.businessDescription || biz.description || "Retail & customer commerce."}
- Delivery Policy: ${kb.deliveryPolicy || "Standard delivery available."}
- Payment Methods: ${kb.paymentMethods || "Direct bank transfer and online payment link."}
- Return Policy: ${kb.returnPolicy || "Standard return policy."}
- Brand Voice: ${kb.brandVoice || "Warm, polite, and professional."}
- Opening Hours: ${kb.openingHours || "Standard business hours."}

ACTIVE LEADS & PIPELINE:
${JSON.stringify(workspaceContext?.leads?.slice(0, 10) || [])}

TOP FOLLOW-UPS DUE:
${JSON.stringify(workspaceContext?.followUps?.slice(0, 8) || [])}

PRODUCTS IN CATALOG:
${JSON.stringify(workspaceContext?.products?.slice(0, 15) || [])}

RECENT ORDERS:
${JSON.stringify(workspaceContext?.orders?.slice(0, 8) || [])}

CRITICAL RULES:
1. Answer directly and factually using ONLY the workspace figures and business data above.
2. NEVER fabricate financial numbers or make up customers or products not in the data.
3. If specific information is unavailable in the data, state clearly that it is not recorded in ${bizName}'s records.
4. If the business is brand new (0 products, 0 orders, 0 customers), warmly acknowledge that the workspace is newly set up and ready for initial activity. Provide clear, encouraging guidance on next steps (such as adding products to the catalog, sharing WhatsApp store links, and recording incoming inquiries) instead of treating empty metrics as poor performance.
5. Keep the tone professional, helpful, concise, and business-focused. Format all currency figures using ${currency}.
`;

    const response = await generateWithGemini(ai, {
      contents: query,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.5,
      },
    });

    res.json({
      answer: response.text ? response.text.trim() : "I was unable to analyze that query.",
      source: "gemini",
    });
  } catch (error: any) {
    console.error("AI Assistant error:", error);
    res.json({
      answer: getFallbackAssistantAnswer(req.body.query, req.body.workspaceContext),
      source: "fallback",
    });
  }
});

// Helper to detect lead stage and customer intent from conversation & proposed reply
function detectStageFromMessageAndReply(
  message: string = "",
  reply: string = "",
  currentStage: string = "NEW_LEAD"
): { suggestedStage: string; intent: string; reason: string } {
  const combined = `${message} ${reply}`.toLowerCase();

  // 1. Purchase signals (account details requested/sent, payment method, invoice, checkout, ready to pay)
  if (
    combined.includes("account detail") ||
    combined.includes("account number") ||
    combined.includes("bank detail") ||
    combined.includes("send account") ||
    combined.includes("make payment") ||
    combined.includes("how to pay") ||
    combined.includes("ready to pay") ||
    combined.includes("ready to order") ||
    combined.includes("transfer receipt") ||
    combined.includes("payment methods") ||
    combined.includes("send invoice") ||
    combined.includes("checkout link") ||
    combined.includes("payment link") ||
    combined.includes("send your transfer") ||
    combined.includes("i just paid") ||
    combined.includes("sent the payment")
  ) {
    return {
      suggestedStage: "AWAITING_PAYMENT",
      intent: "purchase",
      reason: "Payment details or purchase confirmation detected.",
    };
  }

  // 2. Specific product/sizing selected
  if (
    combined.includes("size ") ||
    combined.includes("size m") ||
    combined.includes("size l") ||
    combined.includes("size s") ||
    combined.includes("size 16") ||
    combined.includes("size 1") ||
    combined.includes("reserve") ||
    combined.includes("hold this") ||
    combined.includes("order this") ||
    combined.includes("wrap dress") ||
    combined.includes("midi dress") ||
    combined.includes("linen shirt")
  ) {
    return {
      suggestedStage: "PRODUCT_SELECTED",
      intent: "interest",
      reason: "Specific product sizing, reservation, or item selected.",
    };
  }

  // 3. Interest signals (price inquiries, stock/availability checks, delivery inquiries)
  if (
    combined.includes("available") ||
    combined.includes("price") ||
    combined.includes("how much") ||
    combined.includes("cost") ||
    combined.includes("in stock") ||
    combined.includes("deliver") ||
    combined.includes("shipping") ||
    combined.includes("do you have")
  ) {
    return {
      suggestedStage: "INTERESTED",
      intent: "interest",
      reason: "Customer inquired about catalog item availability or pricing.",
    };
  }

  return {
    suggestedStage: currentStage || "NEW_LEAD",
    intent: "general_inquiry",
    reason: "General customer inquiry.",
  };
}

// Helper Fallback Reply Generator
function getFallbackReply(
  actionType: string,
  message: string = "",
  customer: any,
  products: any[] = [],
  business?: any,
  knowledgeBase?: any
): string {
  const name = customer?.name ? customer.name.split(" ")[0] : "there";
  const bizName = business?.name || "our store";
  const currency = business?.currency || "₦";
  const featuredProduct = Array.isArray(products) && products.length > 0 ? products[0] : null;
  const productPrice = featuredProduct
    ? `${currency}${Number(featuredProduct.price || 0).toLocaleString()}`
    : "";
  const productName = featuredProduct ? featuredProduct.name : "this item";
  const deliveryPolicy = knowledgeBase?.deliveryPolicy || "Express delivery is available";
  const paymentMethods =
    knowledgeBase?.paymentMethods || "Direct bank transfer or secure checkout link";

  switch (actionType) {
    case "shorten":
      return featuredProduct
        ? `Yes ${name}! ${productName} is available for ${productPrice}. Delivery is available!`
        : `Hello ${name}! Thank you for contacting ${bizName}. How can we assist you with your order today?`;
    case "friendlier":
      return featuredProduct
        ? `Hello ${name}! ✨ Yes absolutely, our ${productName} is in stock for ${productPrice}. We can deliver straight to your doorstep. Would you like me to reserve it for you?`
        : `Hello ${name}! ✨ Thank you for reaching out to ${bizName}! We'd love to help you find what you need. What are you looking for today?`;
    case "professional":
      return featuredProduct
        ? `Good day ${name}. Thank you for contacting ${bizName}. ${productName} is currently available at ${productPrice}. Please let us know if you require an invoice or payment details.`
        : `Good day ${name}. Thank you for contacting ${bizName}. We are glad to assist you. Please let us know what products or services you are inquiring about.`;
    case "followup":
      return featuredProduct
        ? `Hi ${name}, just checking in to see if you'd like us to hold ${productName} for you today? Let us know if you have any questions!`
        : `Hi ${name}, just following up from ${bizName} to see if you have any questions or need assistance with your order!`;
    case "suggest_response":
    case "generate_reply":
    default:
      if (message.toLowerCase().includes("deliver")) {
        return `Hello ${name}! Yes, ${deliveryPolicy}. Orders confirmed today dispatch promptly!`;
      }
      if (message.toLowerCase().includes("how much") || message.toLowerCase().includes("price")) {
        return featuredProduct
          ? `Hello ${name}! ${productName} is ${productPrice}. All our products are guaranteed quality.`
          : `Hello ${name}! Thank you for reaching out to ${bizName}. Please let us know which item or service you're interested in and we'll provide the exact price right away!`;
      }
      return `Hello ${name}! Thank you for reaching out to ${bizName}. How can we assist you today? Would you like our payment options (${paymentMethods}) or delivery confirmation?`;
  }
}

function getFallbackAssistantAnswer(query: string = "", context: any): string {
  const q = query.toLowerCase();
  const biz = context?.business || {};
  const metrics = context?.metrics || {};
  const products = context?.products || [];
  const followUps = context?.followUps || [];
  const orders = context?.orders || [];
  const kb = context?.knowledgeBase || {};
  const leads = context?.leads || [];

  const bizName = biz.name || "your business";
  const currency = biz.currency || "₦";
  const revMonth = `${currency}${Number(metrics.revenueThisMonth || 0).toLocaleString()}`;
  const revToday = `${currency}${Number(metrics.revenueToday || 0).toLocaleString()}`;
  const totalOrders = metrics.totalOrders || 0;
  const outstanding = `${currency}${Number(metrics.outstandingPayments || 0).toLocaleString()}`;
  const recoverable = `${currency}${Number(metrics.recoverableRevenue || 0).toLocaleString()}`;

  const isBrandNew = totalOrders === 0 && Number(metrics.revenueThisMonth || 0) === 0 && products.length === 0;

  if (isBrandNew) {
    if (
      q.includes("best-selling") ||
      q.includes("product") ||
      q.includes("catalog") ||
      q.includes("item")
    ) {
      return `${bizName} does not have any products loaded in the catalog yet. Add your core products in the Products tab so you can share pricing and items directly in WhatsApp!`;
    }

    if (
      q.includes("uncompleted") ||
      q.includes("unpaid") ||
      q.includes("pending") ||
      q.includes("lead") ||
      q.includes("customer")
    ) {
      return `There are currently no pending payments or customer follow-ups for ${bizName}. As new customers message you on WhatsApp, FlowOS will automatically organize them into your sales pipeline.`;
    }

    if (
      q.includes("make") ||
      q.includes("revenue") ||
      q.includes("sales") ||
      q.includes("month") ||
      q.includes("today") ||
      q.includes("how is my business") ||
      q.includes("overview")
    ) {
      return `${bizName} is brand new and ready for its first orders! You currently have 0 orders and ${currency}0 in recorded revenue. Connect your WhatsApp business account and add your first products to start capturing sales.`;
    }
  }

  if (
    q.includes("make") ||
    q.includes("revenue") ||
    q.includes("sales") ||
    q.includes("month") ||
    q.includes("today")
  ) {
    return `For this month, ${bizName} has generated ${revMonth} in total sales, with ${revToday} recorded today across ${totalOrders} orders. Outstanding payments currently stand at ${outstanding}.`;
  }

  if (
    q.includes("uncompleted") ||
    q.includes("haven't completed") ||
    q.includes("unpaid") ||
    q.includes("pending")
  ) {
    const unpaidFollowups = followUps
      .filter((f: any) => f.category === "payment" || Number(f.potentialValue) > 0)
      .slice(0, 4);
    if (unpaidFollowups.length > 0) {
      const list = unpaidFollowups
        .map(
          (f: any, i: number) =>
            `${i + 1}. ${f.customerName} (${currency}${Number(
              f.potentialValue || 0
            ).toLocaleString()} - ${f.reason || "Pending payment"})`
        )
        .join("\n");
      return `You have ${unpaidFollowups.length} priority customers with pending payments:\n${list}\nTotal recoverable revenue is ${recoverable}.`;
    }
    return `${bizName} currently has ${outstanding} in outstanding payments and ${recoverable} in potential recoverable revenue across your customer pipeline.`;
  }

  if (
    q.includes("best-selling") ||
    q.includes("product") ||
    q.includes("catalog") ||
    q.includes("item")
  ) {
    if (products.length > 0) {
      const topList = products
        .slice(0, 4)
        .map(
          (p: any, i: number) =>
            `${i + 1}. ${p.name} (${currency}${Number(p.price || 0).toLocaleString()})${
              p.stock !== undefined ? ` - ${p.stock} in stock` : ""
            }`
        )
        .join("\n");
      return `Here are top products from ${bizName}'s catalog:\n${topList}`;
    }
    return `${bizName} does not have any active products loaded in the catalog yet.`;
  }

  if (
    q.includes("follow up") ||
    q.includes("lead") ||
    q.includes("nudge") ||
    q.includes("today")
  ) {
    if (followUps.length > 0) {
      const topList = followUps
        .slice(0, 3)
        .map(
          (f: any) =>
            `• ${f.customerName} (${currency}${Number(
              f.potentialValue || 0
            ).toLocaleString()} potential value) — ${
              f.reason || f.recommendedAction || "Follow-up pending"
            }`
        )
        .join("\n");
      return `Top follow-ups due for ${bizName}:\n${topList}`;
    }
    return `You have ${metrics.followUpsDue || 0} follow-ups due. All current WhatsApp leads are up to date!`;
  }

  if (
    q.includes("policy") ||
    q.includes("deliver") ||
    q.includes("return") ||
    q.includes("hour")
  ) {
    return `${bizName} Operational Policies:\n• Delivery: ${
      kb.deliveryPolicy || "Standard delivery available"
    }\n• Returns: ${kb.returnPolicy || "Standard return policy"}\n• Payment: ${
      kb.paymentMethods || "Direct bank transfer / card"
    }\n• Opening Hours: ${kb.openingHours || "Standard business hours"}`;
  }

  return `Based on ${bizName}'s current workspace data:
• Revenue this month: ${revMonth} (${totalOrders} orders, ${
    metrics.conversionRate || "0%"
  } conversion rate)
• Outstanding payments: ${outstanding}
• Recoverable follow-up revenue: ${recoverable} across ${
    metrics.followUpsDue || followUps.length
  } pending leads.
All figures reflect your active WhatsApp customer pipeline.`;
}

// Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FlowOS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
