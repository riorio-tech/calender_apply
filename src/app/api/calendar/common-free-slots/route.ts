import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

async function getFilteredEvents(token: string, start: string, end: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const eventsRes = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date(start).toISOString(),
    timeMax: new Date(end).toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });
  // 手動で入れた予定や終日予定のみを残す
  return (eventsRes.data.items || []).filter(ev => {
    return (ev.eventType === "default" || ev.start?.date) && !ev.transparency;
  });
}

export async function POST(req: NextRequest) {
  try {
    const { myToken, otherToken, start, end, maxCount } = await req.json();
    if (!myToken || !otherToken || !start || !end) {
      return NextResponse.json({ error: "myToken, otherToken, start, endは必須です" }, { status: 400 });
    }
    const count = maxCount || 3;
    // 2人分の予定を取得
    const [myEvents, otherEvents] = await Promise.all([
      getFilteredEvents(myToken, start, end),
      getFilteredEvents(otherToken, start, end),
    ]);
    // 指定範囲内で両者とも空いている1時間枠を抽出
    const slots: { start: string; end: string }[] = [];
    let current = new Date(start);
    const endTime = new Date(end);
    while (slots.length < count && current < endTime) {
      const slotEnd = new Date(current.getTime() + 60 * 60 * 1000);
      if (slotEnd > endTime) break;
      const overlapMy = myEvents.some(ev => {
        const evStart = new Date(ev.start?.dateTime || ev.start?.date || "");
        const evEnd = new Date(ev.end?.dateTime || ev.end?.date || "");
        return current < evEnd && slotEnd > evStart;
      });
      const overlapOther = otherEvents.some(ev => {
        const evStart = new Date(ev.start?.dateTime || ev.start?.date || "");
        const evEnd = new Date(ev.end?.dateTime || ev.end?.date || "");
        return current < evEnd && slotEnd > evStart;
      });
      if (!overlapMy && !overlapOther && current > new Date()) {
        slots.push({ start: current.toISOString(), end: slotEnd.toISOString() });
      }
      current = new Date(current.getTime() + 60 * 60 * 1000);
    }
    return NextResponse.json({ slots });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "サーバーエラー" }, { status: 500 });
  }
} 