import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { id, email, name } = await req.json()

    if (!id || !email) {
      return NextResponse.json(
        { message: "ID and email are required" },
        { status: 400 }
      )
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: { id, name },
      create: { id, email, name }
    })

    return NextResponse.json(
      { message: "User synced successfully", user },
      { status: 200 }
    )
  } catch (error) {
    console.error("Sync user error:", error)
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    )
  }
}
