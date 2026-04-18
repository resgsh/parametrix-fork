import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data/pools.json");

function read() {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function write(data: any[]) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export async function GET() {
    return NextResponse.json(read());
}

export async function POST(req: Request) {
    const body = await req.json();
    const data = read();

    data.push(body);

    write(data);
    return NextResponse.json({ ok: true });
}