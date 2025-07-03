'use client';
import { Button } from "@/components/ui/button";
import { signIn, useSession, SessionProvider } from "next-auth/react";
import { useState, useEffect } from "react";

function formatSlot(slot: { start: string; end: string }) {
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  return `${start.toLocaleDateString()} ${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')} ~ ${end.getHours()}:${end.getMinutes().toString().padStart(2, '0')}`;
}

async function fetchSlotsAPI(accessToken: string, days: number) {
  const res = await fetch("/api/calendar/available", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, days }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "取得に失敗しました");
  return data.slots as { start: string; end: string }[];
}

function AvailableSlots({ accessToken }: { accessToken: string }) {
  const [days, setDays] = useState(7);
  const [slots, setSlots] = useState<{ start: string; end: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSlots = async (d: number) => {
    setLoading(true);
    setError("");
    setSlots(null);
    try {
      const slots = await fetchSlotsAPI(accessToken, d);
      setSlots(slots);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-2 justify-center">
        <Button variant={days === 7 ? "default" : "outline"} onClick={() => { setDays(7); fetchSlots(7); }}>1週間内</Button>
        <Button variant={days === 30 ? "default" : "outline"} onClick={() => { setDays(30); fetchSlots(30); }}>1ヶ月内</Button>
        <Button variant={days === 90 ? "default" : "outline"} onClick={() => { setDays(90); fetchSlots(90); }}>3ヶ月内</Button>
      </div>
      <div>
        {loading && <p>取得中...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {slots && (
          <ul className="space-y-2">
            {slots.length === 0 && <li>空き候補が見つかりませんでした</li>}
            {slots.map((slot, i) => (
              <li key={i} className="border rounded p-2 bg-white shadow-sm">
                {formatSlot(slot)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CommonSlots({ myToken, otherToken }: { myToken: string; otherToken: string }) {
  const [days, setDays] = useState(7);
  const [common, setCommon] = useState<{ start: string; end: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCommon = async (d: number) => {
    setLoading(true);
    setError("");
    setCommon(null);
    try {
      const [slots1, slots2] = await Promise.all([
        fetchSlotsAPI(myToken, d),
        fetchSlotsAPI(otherToken, d),
      ]);
      const commons = slots1.filter(s1 => slots2.some(s2 => s1.start === s2.start && s1.end === s2.end));
      setCommon(commons.slice(0, 3));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-2 justify-center">
        <Button variant={days === 7 ? "default" : "outline"} onClick={() => { setDays(7); fetchCommon(7); }}>1週間内</Button>
        <Button variant={days === 30 ? "default" : "outline"} onClick={() => { setDays(30); fetchCommon(30); }}>1ヶ月内</Button>
        <Button variant={days === 90 ? "default" : "outline"} onClick={() => { setDays(90); fetchCommon(90); }}>3ヶ月内</Button>
      </div>
      <div>
        {loading && <p>取得中...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {common && (
          <ul className="space-y-2">
            {common.length === 0 && <li>共通の空き候補が見つかりませんでした</li>}
            {common.map((slot, i) => (
              <li key={i} className="border rounded p-2 bg-white shadow-sm">
                {formatSlot(slot)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function InviteForm({ myEmail }: { myEmail: string }) {
  const [inviteUrl, setInviteUrl] = useState("");
  const handleInvite = () => {
    if (myEmail) {
      setInviteUrl(`${window.location.origin}/?invite=${encodeURIComponent(myEmail)}`);
    }
  };
  return (
    <div className="space-y-2 w-full">
      <label className="block text-sm font-medium">招待リンクを発行（メールアドレス入力不要）</label>
      <div className="flex gap-2">
        <Button onClick={handleInvite} disabled={!myEmail}>招待リンク生成</Button>
      </div>
      {inviteUrl && (
        <div className="text-xs text-gray-600 break-all">招待リンク: <a href={inviteUrl} className="underline" target="_blank" rel="noopener noreferrer">{inviteUrl}</a></div>
      )}
    </div>
  );
}

function CheckSlotForm({ accessToken, otherToken, otherEmail }: { accessToken: string; otherToken?: string | null; otherEmail?: string }) {
  const [startDate, setStartDate] = useState("");
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endDate, setEndDate] = useState("");
  const [endHour, setEndHour] = useState("10");
  const [endMinute, setEndMinute] = useState("00");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggested, setSuggested] = useState<{ start: string; end: string }[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState("");

  const makeDateTime = (date: string, hour: string, minute: string) => {
    if (!date) return "";
    return `${date}T${hour}:${minute}`;
  };

  const checkSlot = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const start = makeDateTime(startDate, startHour, startMinute);
      const end = makeDateTime(endDate, endHour, endMinute);
      const res = await fetch("/api/calendar/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, start, end }),
      });
      const data = await res.json();
      if (res.ok) setResult(data.ok ? "空いています！" : "予定が入っています");
      else setError(data.error || "確認に失敗しました");
    } catch (e) {
      setError("通信エラー");
    } finally {
      setLoading(false);
    }
  };

  const suggestSlots = async () => {
    setSuggestLoading(true);
    setSuggestError("");
    setSuggested(null);
    try {
      const start = makeDateTime(startDate, startHour, startMinute);
      const end = makeDateTime(endDate, endHour, endMinute);
      let res, data;
      if (otherToken) {
        res = await fetch("/api/calendar/common-free-slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ myToken: accessToken, otherToken, start, end, maxCount: 3 }),
        });
        data = await res.json();
      } else {
        res = await fetch("/api/calendar/free-slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, start, end, maxCount: 3 }),
        });
        data = await res.json();
      }
      if (res.ok) setSuggested(data.slots);
      else setSuggestError(data.error || "取得に失敗しました");
    } catch (e) {
      setSuggestError("通信エラー");
    } finally {
      setSuggestLoading(false);
    }
  };

  const minuteOptions = ["00", "15", "45"];
  const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

  return (
    <div className="space-y-2 w-full border rounded p-4 mt-6">
      {otherEmail && (
        <div className="text-sm text-blue-700 mb-2">あなたは <span className="font-bold">{otherEmail}</span> とカレンダーを連携しています。</div>
      )}
      <div className="font-semibold mb-2">相手が提案した時間帯で空き確認</div>
      <div className="flex flex-col gap-2 sm:flex-row items-center">
        <input
          type="date"
          className="border rounded px-2 py-1"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
        />
        <select value={startHour} onChange={e => setStartHour(e.target.value)} className="border rounded px-2 py-1">
          {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        :
        <select value={startMinute} onChange={e => setStartMinute(e.target.value)} className="border rounded px-2 py-1">
          {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="self-center">〜</span>
        <input
          type="date"
          className="border rounded px-2 py-1"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
        />
        <select value={endHour} onChange={e => setEndHour(e.target.value)} className="border rounded px-2 py-1">
          {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        :
        <select value={endMinute} onChange={e => setEndMinute(e.target.value)} className="border rounded px-2 py-1">
          {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <Button onClick={checkSlot} disabled={!startDate || !endDate || loading}>空き確認</Button>
        <Button onClick={suggestSlots} disabled={!startDate || !endDate || suggestLoading}>空き時間を自動提案</Button>
      </div>
      {loading && <p>確認中...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {result && <p className="font-bold text-green-600">{result}</p>}
      {suggestLoading && <p>提案中...</p>}
      {suggestError && <p className="text-red-500">{suggestError}</p>}
      {suggested && (
        <ul className="space-y-2 mt-2">
          {suggested.length === 0 && <li>空き候補が見つかりませんでした</li>}
          {suggested.map((slot, i) => (
            <li key={i} className="border rounded p-2 bg-white shadow-sm">
              {formatSlot(slot)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CalendarTable({ myToken, otherToken }: { myToken: string; otherToken: string }) {
  const [events, setEvents] = useState<{ date: string; my: string[]; other: string[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError("");
      try {
        // 直近1週間分の日付リスト（useEffect内で生成）
        const today = new Date();
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          return d;
        });
        const fetchEventsFor = async (token: string) => {
          const res = await fetch("/api/calendar/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: token, start: days[0].toISOString(), end: days[6].toISOString() }),
          });
          const data = await res.json();
          return data.events || [];
        };
        const [myEvents, otherEvents] = await Promise.all([
          fetchEventsFor(myToken),
          fetchEventsFor(otherToken),
        ]);
        // 日付ごとにまとめる（toISOString().slice(0,10)で統一）
        const byDate: { [date: string]: { my: string[]; other: string[] } } = {};
        days.forEach(d => {
          const dateStr = d.toISOString().slice(0, 10);
          byDate[dateStr] = { my: [], other: [] };
        });
        myEvents.forEach((ev: any) => {
          const dateStr = new Date(ev.start?.dateTime || ev.start?.date).toISOString().slice(0, 10);
          byDate[dateStr]?.my.push(ev.summary || "予定");
        });
        otherEvents.forEach((ev: any) => {
          const dateStr = new Date(ev.start?.dateTime || ev.start?.date).toISOString().slice(0, 10);
          byDate[dateStr]?.other.push(ev.summary || "予定");
        });
        setEvents(Object.entries(byDate).map(([date, v]) => ({ date, ...v })));
      } catch (e: any) {
        setError(e.message || "取得失敗");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [myToken, otherToken]);

  return (
    <div className="w-full mt-6">
      <div className="font-semibold mb-2">2人分の予定（直近1週間）</div>
      {loading && <p>取得中...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th className="border px-2 py-1">日付</th>
            <th className="border px-2 py-1 bg-green-100">自分の予定</th>
            <th className="border px-2 py-1 bg-blue-100">相手の予定</th>
          </tr>
        </thead>
        <tbody>
          {events.map(ev => (
            <tr key={ev.date}>
              <td className="border px-2 py-1 font-bold">{ev.date}</td>
              <td className="border px-2 py-1 bg-green-50">{ev.my.length ? ev.my.join(", ") : "なし"}</td>
              <td className="border px-2 py-1 bg-blue-50">{ev.other.length ? ev.other.join(", ") : "なし"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MainHome() {
  const { data: session } = useSession();
  const isAuthed = !!(session as any)?.accessToken;
  const myEmail = (session as any)?.user?.email || "";
  const [otherToken, setOtherToken] = useState<string | null>(null);
  const [otherEmail, setOtherEmail] = useState<string | undefined>(undefined);
  const [isInvited, setIsInvited] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const invite = params.get("invite");
      setIsInvited(!!invite);
      if (invite) setOtherEmail(invite);

      // 自分が招待リンクからアクセスした場合、localStorageに「自分のトークン」を「token_for_相手のメールアドレス」として保存
      if (isAuthed && invite && myEmail !== invite) {
        localStorage.setItem(`token_for_${invite}`, (session as any).accessToken);
      }
      // 自分が発行者（myEmail === invite）の場合は、相手のトークンを取得
      if (isAuthed && invite && myEmail === invite) {
        const token = localStorage.getItem(`token_for_${myEmail}`);
        if (token) setOtherToken(token);
      }
    }
  }, [isAuthed, session, myEmail]);

  const bothLinked = isAuthed && otherToken;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-xl w-full space-y-8">
        <h1 className="text-3xl font-bold text-center">スケジュール調整AI</h1>
        <p className="text-center text-gray-600">
          Googleカレンダーと連携し、最適な日程候補を自動で提案します。<br />
          {isInvited && <span className="text-blue-600 font-semibold">このページは招待リンクからアクセスされています。Googleカレンダー連携後、あなたと相手の両方の空き日程が自動で表示されます。</span>}
        </p>
        {isAuthed && myEmail && <InviteForm myEmail={myEmail} />}
        {!isAuthed ? (
          <div className="flex justify-center">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white w-full max-w-xs"
              onClick={() => signIn("google")}
            >
              Googleカレンダーと連携
            </Button>
          </div>
        ) : bothLinked ? (
          <div className="flex flex-col items-center space-y-4 border-4 border-blue-400 rounded-lg p-4 bg-blue-50 shadow-lg">
            <p className="text-green-600 font-semibold text-lg">2人分のGoogleカレンダー連携済み！</p>
            <div className="text-center text-blue-700 font-bold">あなたと相手の両方の空き日程候補（最大5件）</div>
            <CommonSlots myToken={(session as any).accessToken} otherToken={otherToken} />
            <CalendarTable myToken={(session as any).accessToken} otherToken={otherToken} />
            <CheckSlotForm accessToken={(session as any).accessToken} otherToken={otherToken} otherEmail={otherEmail ?? undefined} />
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <p className="text-yellow-600 font-semibold">相手がまだGoogleカレンダー連携していません。<br />相手にもこの招待リンクでGoogle認証してもらってください。</p>
            <AvailableSlots accessToken={(session as any).accessToken} />
            <CheckSlotForm accessToken={(session as any).accessToken} />
          </div>
        )}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <SessionProvider>
      <MainHome />
    </SessionProvider>
  );
}
