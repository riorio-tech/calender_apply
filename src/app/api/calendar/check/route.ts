import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { accessToken, start, end } = await req.json();
    if (!accessToken || !start || !end) {
      return NextResponse.json({ error: "accessToken, start, endは必須です" }, { status: 400 });
    }
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const eventsRes = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date(start).toISOString(),
      timeMax: new Date(end).toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });
    const events = eventsRes.data.items || [];
    // 予定が1件もなければ空いている
    const ok = events.length === 0;
    return NextResponse.json({ ok });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "サーバーエラー" }, { status: 500 });
  }
} 