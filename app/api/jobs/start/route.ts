import { kv } from "@vercel/kv"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversations, isAccumulative, totalConversations } = body

    if (!conversations) {
      return NextResponse.json({ error: "Conversations are required" }, { status: 400 })
    }

    // Generar un jobId único
    const jobId = crypto.randomUUID()

    // Guardar la conversación completa en Vercel KV
    await kv.set(`job:data:${jobId}`, {
      conversations,
      isAccumulative,
      totalConversations,
      createdAt: new Date().toISOString(),
    })

    // Crear registro de estado del trabajo
    await kv.set(`job:status:${jobId}`, {
      status: "pending",
      createdAt: new Date().toISOString(),
    })

    // Añadir el trabajo a la cola de trabajos pendientes
    const pendingJobs = ((await kv.get("pending_jobs")) as string[]) || []
    pendingJobs.push(jobId)
    await kv.set("pending_jobs", pendingJobs)

    // Responder inmediatamente al cliente
    return NextResponse.json({ jobId })
  } catch (error) {
    console.error("Error starting job:", error)
    return NextResponse.json({ error: "Failed to start job" }, { status: 500 })
  }
}
