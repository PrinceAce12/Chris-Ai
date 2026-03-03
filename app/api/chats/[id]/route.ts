import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id: chatId } = await params

    // Ensure the chat belongs to the user
    const chat = await prisma.chat.findUnique({
      where: { id: chatId }
    })

    if (!chat || chat.userId !== user.id) {
      return NextResponse.json({ message: "Chat not found" }, { status: 404 })
    }

    await prisma.chat.delete({
      where: { id: chatId }
    })

    return NextResponse.json({ message: "Chat deleted" })
  } catch (error) {
    console.error("Delete chat error:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
