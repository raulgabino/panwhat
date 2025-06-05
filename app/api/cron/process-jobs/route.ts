import { kv } from "@vercel/kv"
import { type NextRequest, NextResponse } from "next/server"

// Importar la función de análisis existente
async function analyzeConversations(conversations: string, isAccumulative = false, totalConversations = 1) {
  // Esta es la misma función que teníamos en app/api/analyze-whatsapp/route.ts
  // La copiamos aquí para evitar dependencias circulares

  const prompt = `Analiza las siguientes conversaciones de WhatsApp de la panadería "Quilantán" y extrae información detallada sobre clientes, pedidos y productos.

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, comentarios o explicaciones.

Conversaciones:
${conversations}

Estructura del JSON de respuesta:
{
  "totalClients": número,
  "totalOrders": número,
  "totalSpecificOrders": número,
  "totalGeneralOrders": número,
  "totalSpecificPieces": número,
  "totalGeneralPieces": número,
  "clientsData": [
    {
      "Nombre Cliente": "string",
      "Total Gastado": número,
      "Total Pedidos": número,
      "Frecuencia Semanal": número,
      "Último Pedido": "YYYY-MM-DD",
      "Valor Promedio Pedido": número,
      "Puntuación Satisfacción": número (-2 a 2),
      "Puntuación Dificultad": número (0 a 10),
      "Problemas Pago": número,
      "Tiempo Respuesta (hrs)": número,
      "Nivel de Riesgo": "low|medium|high",
      "Productos Detallados": [{"product": "string", "count": número, "percentage": número}]
    }
  ],
  "productsData": [
    {
      "Producto": "string",
      "Total Pedidos": número,
      "Popularidad": "Muy Alta|Alta|Media|Baja"
    }
  ],
  "ordersData": [
    {
      "Fecha": "YYYY-MM-DD",
      "Cliente": "string",
      "Productos": "string",
      "Total Piezas": número,
      "Valor Estimado": número,
      "Categoría Pedido": "Específico|General"
    }
  ],
  "trendsData": [
    {
      "Tipo": "Hora|Día Semana",
      "Periodo": "string",
      "Actividad": número
    }
  ]
}`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Eres un experto analista de datos de negocios especializado en panaderías. Analiza conversaciones de WhatsApp y extrae insights detallados sobre clientes, pedidos y productos. Responde ÚNICAMENTE con JSON válido.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error("No content received from OpenAI")
    }

    // Limpiar el contenido para asegurar que sea JSON válido
    const cleanedContent = content.replace(/```json\n?|\n?```/g, "").trim()

    try {
      const analysisResult = JSON.parse(cleanedContent)
      return analysisResult
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError)
      console.error("Content received:", cleanedContent)
      throw new Error("Invalid JSON received from OpenAI")
    }
  } catch (error) {
    console.error("Error in analyzeConversations:", error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("Cron job started: Processing pending jobs...")

    // Buscar trabajos pendientes
    const pendingJobs = ((await kv.get("pending_jobs")) as string[]) || []

    if (pendingJobs.length === 0) {
      console.log("No pending jobs found")
      return NextResponse.json({ message: "No pending jobs" })
    }

    // Tomar el primer trabajo pendiente
    const jobId = pendingJobs[0]
    console.log(`Processing job: ${jobId}`)

    // Actualizar estado a 'processing'
    await kv.set(`job:status:${jobId}`, {
      status: "processing",
      startedAt: new Date().toISOString(),
    })

    // Remover el trabajo de la cola de pendientes
    const updatedPendingJobs = pendingJobs.slice(1)
    await kv.set("pending_jobs", updatedPendingJobs)

    try {
      // Obtener los datos de la conversación
      const jobData = (await kv.get(`job:data:${jobId}`)) as any

      if (!jobData) {
        throw new Error("Job data not found")
      }

      console.log(`Analyzing conversations for job ${jobId}...`)

      // Ejecutar el análisis
      const analysisResult = await analyzeConversations(
        jobData.conversations,
        jobData.isAccumulative,
        jobData.totalConversations,
      )

      console.log(`Analysis completed for job ${jobId}`)

      // Guardar el resultado completo
      await kv.set(`job:result:${jobId}`, analysisResult)

      // Actualizar estado a 'completed'
      await kv.set(`job:status:${jobId}`, {
        status: "completed",
        completedAt: new Date().toISOString(),
      })

      // Eliminar los datos originales para ahorrar espacio
      await kv.del(`job:data:${jobId}`)

      console.log(`Job ${jobId} completed successfully`)

      return NextResponse.json({
        message: "Job processed successfully",
        jobId,
        status: "completed",
      })
    } catch (analysisError) {
      console.error(`Error processing job ${jobId}:`, analysisError)

      // Actualizar estado a 'failed'
      await kv.set(`job:status:${jobId}`, {
        status: "failed",
        error: analysisError instanceof Error ? analysisError.message : "Unknown error",
        failedAt: new Date().toISOString(),
      })

      // Limpiar datos
      await kv.del(`job:data:${jobId}`)

      return NextResponse.json(
        {
          message: "Job failed",
          jobId,
          status: "failed",
          error: analysisError instanceof Error ? analysisError.message : "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in cron job:", error)
    return NextResponse.json(
      {
        error: "Cron job failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
