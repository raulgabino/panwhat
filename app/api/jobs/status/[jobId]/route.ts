import { kv } from "@vercel/kv"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const { jobId } = params

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    // Leer el estado del trabajo desde Vercel KV
    const jobStatus = await kv.get(`job:status:${jobId}`)

    if (!jobStatus) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    return NextResponse.json(jobStatus)
  } catch (error) {
    console.error("Error getting job status:", error)
    return NextResponse.json({ error: "Failed to get job status" }, { status: 500 })
  }
}
