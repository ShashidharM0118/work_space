import type { NextApiRequest, NextApiResponse } from 'next';

interface InvitationRequest {
  office_id: string;
  room_id: string;
  inviter_name: string;
  inviter_email: string;
  invitee_email: string;
  message?: string;
  invitation_link: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      office_id,
      room_id,
      inviter_name,
      inviter_email,
      invitee_email,
      message,
      invitation_link
    }: InvitationRequest = req.body;

    // Validate required fields
    if (!office_id || !room_id || !inviter_name || !inviter_email || !invitee_email || !invitation_link) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Email template
    const emailSubject = `${inviter_name} invited you to join their virtual office`;
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Join Virtual Office</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; }
        .button { display: inline-block; background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; border-radius: 0 0 10px 10px; }
        .logo { font-size: 48px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏢</div>
            <h1 style="margin: 0; font-size: 28px;">You're Invited!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Join ${inviter_name}'s virtual office</p>
        </div>
        
        <div class="content">
            <h2>Hi there! 👋</h2>
            
            <p><strong>${inviter_name}</strong> has invited you to join their virtual office space for real-time collaboration.</p>
            
            ${message ? `<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #0052CC; margin: 20px 0;">
                <strong>Personal message:</strong><br>
                "${message}"
            </div>` : ''}
            
            <p>Click the button below to join the meeting:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${invitation_link}" class="button" style="color: white;">
                    🚀 Join Virtual Office
                </a>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #0052CC;">✨ What you can do:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>📹 High-quality video conferencing</li>
                    <li>🖥️ Screen sharing and collaboration</li>
                    <li>💬 Real-time chat messaging</li>
                    <li>🎨 Interactive whiteboard</li>
                </ul>
            </div>
            
            <p style="font-size: 14px; color: #666;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${invitation_link}" style="color: #0052CC; word-break: break-all;">${invitation_link}</a>
            </p>
        </div>
        
        <div class="footer">
            <p><strong>Enterprise Virtual Office Platform</strong></p>
            <p>Premium collaboration workspace for modern teams</p>
            <p style="font-size: 12px; margin-top: 15px;">
                This invitation was sent by ${inviter_name} (${inviter_email}).
                If you didn't expect this invitation, you can safely ignore this email.
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();

    // Here you would integrate with your preferred email service
    // For now, we'll simulate sending and return success
    
    console.log('📧 Email invitation prepared:');
    console.log('To:', invitee_email);
    console.log('From:', inviter_email);
    console.log('Subject:', emailSubject);
    console.log('Link:', invitation_link);

    // TODO: Integrate with actual email service
    // Examples:
    // - SendGrid: https://sendgrid.com/
    // - Nodemailer with SMTP
    // - AWS SES
    // - Mailgun
    
    /*
    // Example with SendGrid:
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: invitee_email,
      from: process.env.FROM_EMAIL || 'noreply@yourapp.com',
      subject: emailSubject,
      html: emailBody,
    };
    
    await sgMail.send(msg);
    */

    // For now, return success with the invitation details
    res.status(200).json({
      success: true,
      message: 'Invitation prepared successfully',
      details: {
        to: invitee_email,
        from: inviter_email,
        subject: emailSubject,
        invitation_link,
        office_id,
        room_id
      }
    });

  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ 
      error: 'Failed to send invitation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 