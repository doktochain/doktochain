import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DailyRoomRequest {
  appointmentId: string;
  patientId: string;
  providerId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { appointmentId, patientId, providerId }: DailyRoomRequest = await req.json();

    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    if (!dailyApiKey) {
      throw new Error("Daily.co API key not configured");
    }

    const roomName = `doktochain-${appointmentId}-${Date.now()}`;

    const dailyResponse = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${dailyApiKey}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          enable_chat: true,
          enable_screenshare: true,
          enable_recording: "cloud",
          max_participants: 2,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 2),
        },
      }),
    });

    if (!dailyResponse.ok) {
      const error = await dailyResponse.text();
      throw new Error(`Daily.co API error: ${error}`);
    }

    const roomData = await dailyResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        roomUrl: roomData.url,
        roomName: roomData.name,
        expiresAt: roomData.config.exp,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating Daily.co room:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create video room",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
