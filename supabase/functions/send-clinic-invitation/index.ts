import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InvitationRequest {
  invitation_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { invitation_id }: InvitationRequest = await req.json();

    if (!invitation_id) {
      return new Response(
        JSON.stringify({ error: "invitation_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: invitation, error: invError } = await supabase
      .from("clinic_provider_invitations")
      .select(
        `
        *,
        clinics!clinic_provider_invitations_clinic_id_fkey(name, email, phone, city, province)
      `
      )
      .eq("id", invitation_id)
      .maybeSingle();

    if (invError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invitation not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const clinicName = invitation.clinics?.name || "A healthcare clinic";
    const clinicCity = invitation.clinics?.city || "";
    const clinicProvince = invitation.clinics?.province || "";
    const locationStr =
      clinicCity && clinicProvince
        ? ` in ${clinicCity}, ${clinicProvince}`
        : "";
    const providerName = `${invitation.first_name} ${invitation.last_name}`;
    const roleLabel = (invitation.role_at_clinic || "attending_physician")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

    const siteUrl = Deno.env.get("SITE_URL") || supabaseUrl.replace(".supabase.co", ".vercel.app");

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="background:#1e40af;padding:32px 40px;">
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">DoktoChain</h1>
        <p style="color:#93c5fd;margin:8px 0 0;font-size:14px;">Healthcare Platform</p>
      </div>
      <div style="padding:40px;">
        <h2 style="color:#1e293b;margin:0 0 16px;font-size:20px;">You've Been Invited!</h2>
        <p style="color:#475569;line-height:1.6;margin:0 0 16px;">
          Hello Dr. ${providerName},
        </p>
        <p style="color:#475569;line-height:1.6;margin:0 0 24px;">
          <strong>${clinicName}</strong>${locationStr} has invited you to join their clinic as a <strong>${roleLabel}</strong> on DoktoChain.
        </p>
        ${
          invitation.message
            ? `<div style="background:#f0f9ff;border-left:4px solid #3b82f6;padding:16px;border-radius:0 8px 8px 0;margin:0 0 24px;">
            <p style="color:#1e40af;margin:0;font-size:14px;font-style:italic;">"${invitation.message}"</p>
          </div>`
            : ""
        }
        <div style="text-align:center;margin:32px 0;">
          <a href="${siteUrl}/provider-invitation?token=${invitation.token}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
            Accept Invitation
          </a>
        </div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:24px 0 0;">
          This invitation expires on ${new Date(invitation.expires_at).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}. If you did not expect this invitation, you can safely ignore this email.
        </p>
      </div>
      <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">
          DoktoChain - Connecting Patients with Healthcare Providers
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "DoktoChain <noreply@doktochain.com>",
          to: [invitation.email],
          subject: `${clinicName} has invited you to join their clinic on DoktoChain`,
          html: emailHtml,
        }),
      });

      if (!emailRes.ok) {
        const errBody = await emailRes.text();
        console.error("Resend API error:", errBody);
        return new Response(
          JSON.stringify({ error: "Failed to send email", details: errBody }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      console.log("RESEND_API_KEY not set. Email would be sent to:", invitation.email);
      console.log("Subject:", `${clinicName} has invited you to join their clinic`);
      console.log("Invitation token:", invitation.token);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: resendApiKey
          ? "Invitation email sent successfully"
          : "Invitation created (email service not configured)",
        email: invitation.email,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Failed to send invitation",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
