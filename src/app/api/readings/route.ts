import { NextResponse } from "next/server";
import { sql } from "kysely";
import { auth } from "@/auth";
import { db } from "@/db/database";
import { PAGE_SIZE, parseDateParam, parsePageParam } from "./params";

export const GET = auth(async (request) => {
  if (!request.auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = parseDateParam(searchParams.get("from"));
  const to = parseDateParam(searchParams.get("to"));
  const page = parsePageParam(searchParams.get("page"));

  if (from === null) {
    return NextResponse.json({ error: "Invalid 'from' date" }, { status: 400 });
  }
  if (to === null) {
    return NextResponse.json({ error: "Invalid 'to' date" }, { status: 400 });
  }
  if (page === null) {
    return NextResponse.json({ error: "Invalid 'page' number" }, { status: 400 });
  }

  let baseQuery = db.selectFrom("readings").where("user_id", "=", request.auth.user.id);

  if (from) baseQuery = baseQuery.where("recorded_at", ">=", from);
  if (to) baseQuery = baseQuery.where("recorded_at", "<=", to);

  const [{ total }, readings] = await Promise.all([
    baseQuery.select(sql<number>`count(*)`.as("total")).executeTakeFirstOrThrow(),
    baseQuery
      .select(["recorded_at", "value"])
      .orderBy("recorded_at", "desc")
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE)
      .execute(),
  ]);

  return NextResponse.json({
    data: readings.map((r) => ({ recordedAt: r.recorded_at, value: r.value })),
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / PAGE_SIZE),
    },
  });
});
