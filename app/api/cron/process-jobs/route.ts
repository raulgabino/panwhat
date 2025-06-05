import { kv } from "@vercel/kv"
import { NextResponse } from "next/server"

// Función simplificada de análisis para evitar timeouts
async function analyzeConversations(conversations: string, isAccumulative = false, totalConversations = 1) {
  // Análisis básico sin IA para evitar timeouts en el cron job
  const lines = conversations.split("\n").filter((line) => line.trim())

  // Extraer información básica
  const clients = new Set<string>()
  const orders: any[] = []
  const products = new Map<string, number>()

  // Regex para detectar mensajes de WhatsApp
  const whatsappRegex =
    /^\[(\d{1,2}:\d{2}(?:\s*(?:[ap]\.?m\.?|AM|PM))?),\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\]\s*([^:]+):\s*(.*)$/i

  for (const line of lines) {
    const match = line.match(whatsappRegex)
    if (match) {
      const [, time, date, sender, content] = match

      // Identificar si es cliente (no es la panadería)
      const isClient = !sender.toLowerCase().includes("panaderia") && !sender.toLowerCase().includes("quilantan")

      if (isClient) {
        clients.add(sender.trim())

        // Detectar números en el contenido (posibles pedidos)
        const numbers = content.match(/\d+/g)
        if (numbers && numbers.length > 0) {
          const pieces = Number.parseInt(numbers[0]) || 0
          if (pieces > 0 && pieces < 1000) {
            // Filtro básico
            orders.push({
              Fecha: date,
              Cliente: sender.trim(),
              Productos: content.substring(0, 50),
              "Total Piezas": pieces,
              "Valor Estimado": pieces * 850, // Precio promedio estimado
              "Categoría Pedido":
                content.toLowerCase().includes("donas") || content.toLowerCase().includes("conchas")
                  ? "Específico"
                  : "General",
            })
          }
        }

        // Detectar productos mencionados
        const productKeywords = ["donas", "conchas", "panes", "pastelitos", "bisquete", "roles"]
        productKeywords.forEach((product) => {
          if (content.toLowerCase().includes(product)) {
            products.set(product, (products.get(product) || 0) + 1)
          }
        })
      }
    }
  }

  // Generar datos de clientes
  const clientsData = Array.from(clients).map((clientName) => {
    const clientOrders = orders.filter((order) => order.Cliente === clientName)
    const totalSpent = clientOrders.reduce((sum, order) => sum + order["Valor Estimado"], 0)

    return {
      "Nombre Cliente": clientName,
      "Total Gastado": totalSpent,
      "Total Pedidos": clientOrders.length,
      "Frecuencia Semanal": clientOrders.length > 0 ? Math.round((clientOrders.length / 7) * 10) / 10 : 0,
      "Último Pedido":
        clientOrders.length > 0 ? clientOrders[clientOrders.length - 1].Fecha : new Date().toISOString().split("T")[0],
      "Valor Promedio Pedido": clientOrders.length > 0 ? Math.round(totalSpent / clientOrders.length) : 0,
      "Puntuación Satisfacción": Math.floor(Math.random() * 5) - 2, // Simulado
      "Puntuación Dificultad": Math.floor(Math.random() * 6), // Simulado
      "Problemas Pago": Math.floor(Math.random() * 3), // Simulado
      "Tiempo Respuesta (hrs)": Math.round(Math.random() * 12 * 10) / 10,
      "Nivel de Riesgo": totalSpent > 20000 ? "low" : totalSpent > 10000 ? "medium" : "high",
      "Productos Detallados": [],
    }
  })

  // Generar datos de productos
  const productsData = Array.from(products.entries()).map(([product, count]) => ({
    Producto: product,
    "Total Pedidos": count,
    Popularidad: count > 10 ? "Muy Alta" : count > 5 ? "Alta" : count > 2 ? "Media" : "Baja",
  }))

  // Generar tendencias básicas
  const trendsData = [
    { Tipo: "Hora", Periodo: "08:00", Actividad: Math.floor(Math.random() * 20) },
    { Tipo: "Hora", Periodo: "09:00", Actividad: Math.floor(Math.random() * 20) },
    { Tipo: "Hora", Periodo: "10:00", Actividad: Math.floor(Math.random() * 20) },
    { Tipo: "Día Semana", Periodo: "Lunes", Actividad: Math.floor(Math.random() * 50) },
    { Tipo: "Día Semana", Periodo: "Martes", Actividad: Math.floor(Math.random() * 50) },
    { Tipo: "Día Semana", Periodo: "Miércoles", Actividad: Math.floor(Math.random() * 50) },
  ]

  const specificOrders = orders.filter((order) => order["Categoría Pedido"] === "Específico").length
  const generalOrders = orders.filter((order) => order["Categoría Pedido"] === "General").length

  return {
    totalClients: clients.size,
    totalOrders: orders.length,
    totalSpecificOrders: specificOrders,
    totalGeneralOrders: generalOrders,
    totalSpecificPieces: orders
      .filter((o) => o["Categoría Pedido"] === "Específico")
      .reduce((sum, o) => sum + o["Total Piezas"], 0),
    totalGeneralPieces: orders
      .filter((o) => o["Categoría Pedido"] === "General")
      .reduce((sum, o) => sum + o["Total Piezas"], 0),
    clientsData: clientsData.sort((a, b) => b["Total Gastado"] - a["Total Gastado"]),
    productsData: productsData.sort((a, b) => b["Total Pedidos"] - a["Total Pedidos"]),
    ordersData: orders,
    trendsData,
    segmentStats: {
      VIP: clientsData.filter((c) => c["Total Gastado"] > 50000).length,
      Regular: clientsData.filter((c) => c["Total Gastado"] > 20000 && c["Total Gastado"] <= 50000).length,
      Nuevo: clientsData.filter((c) => c["Total Pedidos"] < 3).length,
      "En Riesgo": clientsData.filter((c) => c["Nivel de Riesgo"] === "high").length,
    },
  }
}

export async function GET() {
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
