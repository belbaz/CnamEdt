// ---- src/app/api/fetch-ics/route.js ----
import {NextResponse} from "next/server";
import ical from "node-ical";

export async function GET() {
    try {
        const icsUrl = process.env.ICS_URL; // mettre ton lien .ics dans .env.local
        const res = await fetch(icsUrl);
        if (!res.ok) throw new Error("Erreur de téléchargement ICS");


        const text = await res.text();
        const parsed = ical.sync.parseICS(text);


        const events = Object.values(parsed)
            .filter((e) => e.type === "VEVENT")
            .map((e) => ({
                summary: e.summary,
                start: e.start,
                description: e.description,
                end: e.end,
                location: e.location,
            }));


        return NextResponse.json(events);
    } catch (err) {
        return NextResponse.json({error: err.message}, {status: 500});
    }
}