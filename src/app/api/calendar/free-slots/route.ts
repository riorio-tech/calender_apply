import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { accessToken, start, end, maxCount } = await req.json();
    if (!accessToken || !start || !end) {
      return NextResponse.json({ error: "accessToken, start, endは必須です" }, { status: 400 });
    }
    const count = maxCount || 3;
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
    const events = (eventsRes.data.items || []).filter(ev => {
      // 手動で入れた予定（eventType: 'default'）または終日予定（dateのみ）を除外対象とする
      return (ev.eventType === "default" || ev.start?.date) && !ev.transparency;
    });
    // 指定範囲内で空いている1時間枠を抽出
    const slots: { start: string; end: string }[] = [];
    let current = new Date(start);
    const endTime = new Date(end);
    while (slots.length < count && current < endTime) {
      const slotEnd = new Date(current.getTime() + 60 * 60 * 1000);
      if (slotEnd > endTime) break;
      const overlap = events.some(ev => {
        // 終日予定や手動予定と重なる場合は除外
        const evStart = new Date(ev.start?.dateTime || ev.start?.date || "");
        const evEnd = new Date(ev.end?.dateTime || ev.end?.date || "");
        return current < evEnd && slotEnd > evStart;
      });
      if (!overlap && current > new Date()) {
        slots.push({ start: current.toISOString(), end: slotEnd.toISOString() });
      }
      current = new Date(current.getTime() + 60 * 60 * 1000);
    }
    return NextResponse.json({ slots });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "サーバーエラー" }, { status: 500 });
  }
} 