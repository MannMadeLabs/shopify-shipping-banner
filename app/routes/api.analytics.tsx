import type { ActionFunctionArgs } from "react-router";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  try {
    const body = await request.json();
    const { shop, eventType, cartValue, amountRemaining, productId, sessionId } = body;
    
    if (!shop || !eventType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Create analytics event
    await prisma.analyticsEvent.create({
      data: {
        shop,
        eventType,
        cartValue: cartValue ? parseFloat(cartValue) : null,
        amountRemaining: amountRemaining ? parseFloat(amountRemaining) : null,
        productId: productId || null,
        sessionId: sessionId || null,
      },
    });
    
    // Increment order counter when threshold is met (counts as potential order)
    if (eventType === "threshold_met") {
      await prisma.appSettings.updateMany({
        where: { shop },
        data: {
          ordersThisMonth: { increment: 1 },
        },
      });
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return new Response(JSON.stringify({ error: "Failed to log event" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

