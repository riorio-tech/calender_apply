import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { accessToken, days } = await req.json();
    if (!accessToken || !days) {
      return NextResponse.json({ error: "accessTokenとdaysは必須です" }, { status: 400 });
    }

    // OAuth2Clientを作成し、アクセストークンをセット
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    // 予定を取得
    const eventsRes = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });
    const events = eventsRes.data.items || [];

    // 空き時間候補を計算
    const slots: { start: string; end: string }[] = [];
    let current = new Date(now.setHours(9, 0, 0, 0));
    const endOfPeriod = new Date(new Date(timeMax).setHours(18, 0, 0, 0));
    let intervalDays = 0;
    if (days >= 90) {
      intervalDays = 14; // 3ヶ月以内は2週間ごと
    } else if (days >= 30) {
      intervalDays = 7; // 1ヶ月以内は1週間ごと
    } else {
      intervalDays = 0; // 1週間以内は毎日
    }

    while (slots.length < 5 && current < endOfPeriod) {
      const slotEnd = new Date(current.getTime() + 60 * 60 * 1000);
      // 予定と重複しないか判定
      const overlap = events.some(ev => {
        const evStart = new Date(ev.start?.dateTime || ev.start?.date || "");
        const evEnd = new Date(ev.end?.dateTime || ev.end?.date || "");
        return current < evEnd && slotEnd > evStart;
      });
      if (!overlap && current > new Date()) {
        slots.push({ start: current.toISOString(), end: slotEnd.toISOString() });
        // インターバル分スキップ
        if (intervalDays > 0) {
          current.setDate(current.getDate() + intervalDays);
          current.setHours(9, 0, 0, 0);
          continue;
        }
      }
      current = new Date(current.getTime() + 60 * 60 * 1000);
      if (current.getHours() >= 18) {
        // 次の日の9時に進める
        current.setDate(current.getDate() + 1);
        current.setHours(9, 0, 0, 0);
      }
    }

    return NextResponse.json({ slots });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "サーバーエラー" }, { status: 500 });
  }
} 