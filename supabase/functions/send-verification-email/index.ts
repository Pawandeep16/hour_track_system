import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  email: string;
  code: string;
  name: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, code, name }: EmailRequest = await req.json();

    if (!email || !code || !name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Option 1: Using Resend API (Recommended)
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (RESEND_API_KEY) {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Hour Tracker <noreply@yourdomain.com>",
          to: [email],
          subject: "Your Verification Code",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Email Verification</h1>
                </div>
                <div class="content">
                  <h2>Hello, ${name}!</h2>
                  <p>Thank you for registering with Hour Tracker. To complete your registration, please use the verification code below:</p>
                  <div class="code">${code}</div>
                  <p>This code will expire in 15 minutes.</p>
                  <p>If you didn't request this code, please ignore this email.</p>
                </div>
                <div class="footer">
                  <p>This is an automated message from Hour Tracker. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        }),
      });

      const resendData = await resendResponse.json();

      if (resendResponse.ok) {
        return new Response(
          JSON.stringify({ success: true, messageId: resendData.id }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        throw new Error(`Resend API error: ${JSON.stringify(resendData)}`);
      }
    }

    // Option 2: Using SendGrid (Alternative)
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

    if (SENDGRID_API_KEY) {
      const sendgridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: "noreply@yourdomain.com", name: "Hour Tracker" },
          subject: "Your Verification Code",
          content: [{
            type: "text/html",
            value: `
              <h2>Hello, ${name}!</h2>
              <p>Your verification code is: <strong style="font-size: 24px; color: #667eea;">${code}</strong></p>
              <p>This code will expire in 15 minutes.</p>
            `,
          }],
        }),
      });

      if (sendgridResponse.ok) {
        return new Response(
          JSON.stringify({ success: true }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        const errorData = await sendgridResponse.text();
        throw new Error(`SendGrid API error: ${errorData}`);
      }
    }

    // No email service configured
    return new Response(
      JSON.stringify({
        error: "No email service configured. Please set RESEND_API_KEY or SENDGRID_API_KEY.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
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