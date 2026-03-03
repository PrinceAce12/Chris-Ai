import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const chats = await prisma.chat.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" }
        }
      }
    })

    return NextResponse.json(chats)
  } catch (error) {
    console.error("Fetch chats error:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { title, messages } = await req.json()

    const chat = await prisma.chat.create({
      data: {
        title: title || "New Chat",
        userId: user.id,
        messages: {
          create: messages.map((msg: any) => ({
            role: msg.role,
            content: msg.text
          }))
        }
      },
      include: {
        messages: true
      }
    })

    return NextResponse.json(chat)
  } catch (error) {
    console.error("Create chat error:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
