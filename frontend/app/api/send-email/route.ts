import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const body = await request.json()
  const { to, subject, html, text } = body

  if (!to || !subject || (!html && !text)) {
    return NextResponse.json(
      { error: 'Missing required fields: to, subject, and html or text' },
      { status: 400 }
    )
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Email service not configured' },
      { status: 501 }
    )
  }

  try {
    const data = await resend.emails.send({
      from: 'Bridgelet <onboarding@resend.dev>',
      to,
      subject,
      html,
      text
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Failed to send email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
