import { type NextRequest, NextResponse } from "next/server"

interface Message {
  timestamp: Date
  sender: string
  content: string
  isClient: boolean
}

interface ProductCount {
  [key: string]: number
}

interface ClientAnalysis {
  name: string
  totalOrders: number
  totalPieces: number
  avgPiecesPerOrder: number
  messagesPerOrder: number
  responseTimeHours: number
  difficultyScore: number
  lastOrderDate: Date
  preferredProducts: Array<{ product: string; count: number; percentage: number }>
  orderPatterns: string[]
  paymentIssues: number
  noResponseDays: number
  orderFrequency: number
  totalSpent: number
  avgOrderValue: number
  satisfactionScore: number
  complaints: number
  compliments: number
}

interface OrderData {
  date: string
  client: string
  products: string
  totalPieces: number
  orderType: string
  responseTime: number
  estimatedValue: number
  dayOfWeek: string
  hour: number
}

interface GPTAnalysis {
  insights: string[]
  recommendations: string[]
  riskLevel: "low" | "medium" | "high"
  behaviorProfile: string
  communicationStyle: string
  businessValue: string
  predictedActions: string[]
  satisfactionAnalysis: string
}

async function analyzeWithGPT(
  clientData: ClientAnalysis,
  messages: string[],
  orderHistory: OrderData[],
): Promise<GPTAnalysis> {
  try {
    // Preparar contexto optimizado para GPT
    const context = {
      clientName: clientData.name,
      totalOrders: clientData.totalOrders,
      totalSpent: clientData.totalSpent,
      avgOrderValue: clientData.avgOrderValue,
      responseTime: clientData.responseTimeHours,
      paymentIssues: clientData.paymentIssues,
      complaints: clientData.complaints,
      compliments: clientData.compliments,
      orderFrequency: clientData.orderFrequency,
      preferredProducts: clientData.preferredProducts.slice(0, 3), // Solo top 3 para eficiencia
      recentMessages: messages.slice(-5), // Solo últimos 5 mensajes
      orderTrends: orderHistory.slice(-3), // Solo últimos 3 pedidos
    }

    const prompt = `
Analiza este cliente de panadería y proporciona insights accionables:

CLIENTE: ${context.clientName}
MÉTRICAS CLAVE:
- Pedidos: ${context.totalOrders} | Gastado: $${context.totalSpent?.toLocaleString()} | Promedio: $${context.avgOrderValue?.toLocaleString()}
- Frecuencia: ${context.orderFrequency}/semana | Respuesta: ${context.responseTime}h
- Problemas pago: ${context.paymentIssues} | Quejas: ${context.complaints} | Elogios: ${context.compliments}
- Top productos: ${context.preferredProducts.map((p) => `${p.product}(${p.percentage}%)`).join(", ")}

MENSAJES RECIENTES: ${context.recentMessages.join(" | ")}

PEDIDOS RECIENTES: ${context.orderTrends.map((o) => `${o.date}:${o.products}(${o.totalPieces}pzs,$${o.estimatedValue})`).join(" | ")}

Responde en JSON:
{
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["recomendación1", "recomendación2"],
  "riskLevel": "low|medium|high",
  "behaviorProfile": "perfil en 1 línea",
  "communicationStyle": "estilo en 1 línea",
  "businessValue": "valor en 1 línea",
  "predictedActions": ["predicción1", "predicción2"],
  "satisfactionAnalysis": "análisis en 1 línea"
}

ENFOQUE:
1. Riesgos específicos para la panadería
2. Oportunidades de crecimiento
3. Recomendaciones de productos
4. Estrategias de retención
5. Optimización de comunicación
`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Modelo más eficiente
        messages: [
          {
            role: "system",
            content:
              "Eres un consultor experto en análisis de clientes para panaderías. Proporciona análisis concisos, prácticos y accionables en español. Responde SOLO en formato JSON válido.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1, // Más determinístico
        max_tokens: 800, // Reducido para eficiencia
      }),
    })

    if (!response.ok) {
      console.warn(`GPT API error: ${response.status}`)
      return createFallbackAnalysis(clientData)
    }

    const data = await response.json()
    const gptResponse = data.choices[0]?.message?.content

    if (!gptResponse) {
      console.warn("No response from GPT")
      return createFallbackAnalysis(clientData)
    }

    // Intentar parsear la respuesta JSON
    try {
      // Limpiar respuesta para asegurar JSON válido
      const cleanResponse = gptResponse.replace(/```json|```/g, "").trim()
      const analysis = JSON.parse(cleanResponse)

      // Validar estructura
      if (!analysis.insights || !analysis.recommendations || !analysis.riskLevel) {
        throw new Error("Invalid GPT response structure")
      }

      return analysis
    } catch (parseError) {
      console.warn("GPT response was not valid JSON:", parseError)
      return createFallbackAnalysis(clientData)
    }
  } catch (error) {
    console.error("Error with GPT analysis:", error)
    return createFallbackAnalysis(clientData)
  }
}

function createFallbackAnalysis(clientData: ClientAnalysis): GPTAnalysis {
  const insights = []
  const recommendations = []
  let riskLevel: "low" | "medium" | "high" = "low"

  // Análisis de riesgo basado en múltiples factores
  const riskScore =
    clientData.difficultyScore * 2 +
    clientData.paymentIssues * 3 +
    (clientData.complaints > clientData.compliments ? 2 : 0) +
    (clientData.responseTimeHours > 6 ? 2 : 0) +
    (clientData.orderFrequency < 1 ? 1 : 0)

  if (riskScore >= 8) {
    riskLevel = "high"
    insights.push("Cliente de alto riesgo: múltiples factores problemáticos detectados")
    recommendations.push("Implementar seguimiento semanal y protocolo de atención especial")
  } else if (riskScore >= 4) {
    riskLevel = "medium"
    insights.push("Cliente con complejidad moderada que requiere atención")
    recommendations.push("Monitorear mensualmente y mejorar comunicación")
  } else {
    insights.push("Cliente estable con comportamiento predecible")
    recommendations.push("Mantener nivel de servicio actual")
  }

  // Análisis de valor
  if (clientData.totalSpent > 100000) {
    insights.push("Cliente de muy alto valor económico para el negocio")
    recommendations.push("Ofrecer descuentos por volumen y productos premium")
  } else if (clientData.totalSpent > 50000) {
    insights.push("Cliente de valor medio-alto con potencial de crecimiento")
    recommendations.push("Implementar programa de fidelización")
  }

  // Análisis de frecuencia
  if (clientData.orderFrequency > 5) {
    insights.push("Cliente muy frecuente, excelente para flujo de caja")
    recommendations.push("Asegurar disponibilidad de productos preferidos")
  } else if (clientData.orderFrequency < 1) {
    insights.push("Cliente esporádico, riesgo de pérdida")
    recommendations.push("Implementar estrategia de reactivación")
  }

  // Análisis de productos
  if (clientData.preferredProducts.length > 0) {
    const topProduct = clientData.preferredProducts[0]
    insights.push(`Preferencia clara por ${topProduct.product} (${topProduct.percentage}% de pedidos)`)
    recommendations.push(`Asegurar stock de ${topProduct.product} para este cliente`)
  }

  return {
    insights,
    recommendations,
    riskLevel,
    behaviorProfile: `Cliente ${riskLevel === "high" ? "complejo" : riskLevel === "medium" ? "moderado" : "estable"} con ${clientData.orderFrequency > 3 ? "alta" : "baja"} frecuencia de pedidos`,
    communicationStyle:
      clientData.responseTimeHours > 4 ? "Comunicación lenta pero consistente" : "Comunicación eficiente y directa",
    businessValue:
      clientData.totalSpent > 100000
        ? "Muy alto valor"
        : clientData.totalSpent > 50000
          ? "Alto valor"
          : clientData.totalSpent > 20000
            ? "Valor medio"
            : "Valor básico",
    predictedActions: [
      clientData.orderFrequency > 3 ? "Continuará con pedidos regulares" : "Pedidos esporádicos",
      clientData.satisfactionScore > 0 ? "Mantendrá relación comercial" : "Riesgo de abandono",
    ],
    satisfactionAnalysis:
      clientData.satisfactionScore > 2
        ? "Cliente muy satisfecho, baja probabilidad de abandono"
        : clientData.satisfactionScore > 0
          ? "Cliente satisfecho con el servicio"
          : "Cliente con insatisfacciones que requieren atención inmediata",
  }
}

export async function POST(request: NextRequest) {
  try {
    const { conversations, isAccumulative, totalConversations } = await request.json()

    if (!conversations || typeof conversations !== "string") {
      return NextResponse.json({ error: "Conversaciones inválidas" }, { status: 400 })
    }

    // Parse WhatsApp conversations
    const messages = parseWhatsAppConversations(conversations)

    // Analyze data
    const analysis = await analyzeConversations(messages, isAccumulative, totalConversations)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Error analyzing conversations:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

function parseWhatsAppConversations(text: string): Message[] {
  const messages: Message[] = []
  const lines = text.split("\n")

  // Regex para formato: [H:MM AM/PM, M/D/YYYY] Nombre: Mensaje
  const whatsappRegex = /^\[(\d{1,2}:\d{2}\s(?:AM|PM)),\s(\d{1,2}\/\d{1,2}\/\d{4})\]\s([^:]+):\s*(.*)$/

  for (const line of lines) {
    const match = line.match(whatsappRegex)
    if (match) {
      const [, time, date, sender, content] = match

      // Parse date and time
      const [month, day, year] = date.split("/").map(Number)
      const [hourMin, period] = time.split(" ")
      const [hour, minute] = hourMin.split(":").map(Number)

      let adjustedHour = hour
      if (period === "PM" && hour !== 12) adjustedHour += 12
      if (period === "AM" && hour === 12) adjustedHour = 0

      const timestamp = new Date(year, month - 1, day, adjustedHour, minute)

      // Determine if sender is client (not the bakery)
      const isClient = !sender.toLowerCase().includes("panaderia quilantan")

      messages.push({
        timestamp,
        sender: sender.trim(),
        content: content.trim(),
        isClient,
      })
    }
  }

  return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

async function analyzeConversations(messages: Message[], isAccumulative = false, totalConversations = 1) {
  const clients = new Map<string, ClientAnalysis>()
  const products = new Map<string, number>()
  const hourlyTrends = new Array(24).fill(0)
  const dailyTrends = new Array(7).fill(0)
  const monthlyTrends = new Array(12).fill(0)
  const ordersData: OrderData[] = []
  const clientOrdersData = new Map<string, OrderData[]>()
  const clientProductsData = new Map<string, Array<{ product: string; count: number; percentage: number }>>()

  // Productos específicos de panadería con precios estimados
  const productPatterns = {
    "conchas blancas": { regex: /(\d+)\s*conchas?\s*blancas?/gi, estimatedPrice: 800 },
    "panes largos": { regex: /(\d+)\s*panes?\s*largos?/gi, estimatedPrice: 1000 },
    armadillos: { regex: /(\d+)\s*armadillos?/gi, estimatedPrice: 900 },
    pastelitos: { regex: /(\d+)\s*pastelitos?/gi, estimatedPrice: 1200 },
    donas: { regex: /(\d+)\s*donas?/gi, estimatedPrice: 1100 },
    bisquete: { regex: /(\d+)\s*bisquete?/gi, estimatedPrice: 700 },
    roles: { regex: /(\d+)\s*roles?/gi, estimatedPrice: 800 },
    ojos: { regex: /(\d+)\s*ojos?/gi, estimatedPrice: 900 },
    hojaldrado: { regex: /(\d+)\s*hojaldrado?/gi, estimatedPrice: 1000 },
    tostados: { regex: /(\d+)\s*tostados?/gi, estimatedPrice: 1100 },
    "pan blanco": { regex: /(\d+)\s*pan\s*blanco?/gi, estimatedPrice: 600 },
    cambios: { regex: /(\d+)\s*cambios?/gi, estimatedPrice: 800 },
    surtidas: { regex: /(\d+)\s*(?:piezas\s*)?surtidas?/gi, estimatedPrice: 850 },
  }

  // Patrones de precios en pesos chilenos
  const priceRegex = /\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g

  let totalOrders = 0
  let totalRevenue = 0

  // Group messages by client
  const conversationsByClient = new Map<string, Message[]>()

  messages.forEach((message) => {
    if (message.isClient) {
      if (!conversationsByClient.has(message.sender)) {
        conversationsByClient.set(message.sender, [])
      }
    }

    // Add all messages to client conversations for context
    const clientName = message.isClient ? message.sender : findClientForBakeryMessage(messages, message)
    if (clientName) {
      if (!conversationsByClient.has(clientName)) {
        conversationsByClient.set(clientName, [])
      }
      conversationsByClient.get(clientName)!.push(message)
    }
  })

  // Analyze each client
  const clientAnalysisPromises = Array.from(conversationsByClient.entries()).map(
    async ([clientName, clientMessages]) => {
      const analysis: ClientAnalysis = {
        name: clientName,
        totalOrders: 0,
        totalPieces: 0,
        avgPiecesPerOrder: 0,
        messagesPerOrder: 0,
        responseTimeHours: 0,
        difficultyScore: 0,
        lastOrderDate: new Date(0),
        preferredProducts: [],
        orderPatterns: [],
        paymentIssues: 0,
        noResponseDays: 0,
        orderFrequency: 0,
        totalSpent: 0,
        avgOrderValue: 0,
        satisfactionScore: 0,
        complaints: 0,
        compliments: 0,
      }

      const clientProductCounts: ProductCount = {}
      const clientOrders: OrderData[] = []
      const orderDates: Date[] = []
      let totalResponseTime = 0
      let responseCount = 0
      let totalMessages = 0
      let clientRevenue = 0

      // Sort messages by timestamp
      const sortedMessages = clientMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      for (let i = 0; i < sortedMessages.length; i++) {
        const message = sortedMessages[i]

        // Update temporal trends
        hourlyTrends[message.timestamp.getHours()]++
        dailyTrends[message.timestamp.getDay()]++
        monthlyTrends[message.timestamp.getMonth()]++

        if (message.isClient) {
          totalMessages++

          // Detect satisfaction indicators
          const positiveWords = ["gracias", "perfecto", "excelente", "bueno", "ok"]
          const negativeWords = ["problema", "mal", "error", "queja", "reclamo", "demora", "tarde"]

          const messageContent = message.content.toLowerCase()
          if (positiveWords.some((word) => messageContent.includes(word))) {
            analysis.compliments++
          }
          if (negativeWords.some((word) => messageContent.includes(word))) {
            analysis.complaints++
          }

          // Detect orders by looking for product patterns
          let orderPieces = 0
          let orderValue = 0
          const detectedProducts: string[] = []

          // Check for explicit piece count (e.g., "30 piezas")
          const piecesMatch = message.content.match(/(\d+)\s*piezas?/i)
          if (piecesMatch) {
            orderPieces = Number.parseInt(piecesMatch[1])
          }

          // Detect specific products and calculate estimated value
          Object.entries(productPatterns).forEach(([productName, pattern]) => {
            const matches = [...message.content.matchAll(pattern.regex)]
            matches.forEach((match) => {
              const count = Number.parseInt(match[1])
              if (!isNaN(count)) {
                clientProductCounts[productName] = (clientProductCounts[productName] || 0) + count
                products.set(productName, (products.get(productName) || 0) + count)
                detectedProducts.push(`${count} ${productName}`)
                if (!piecesMatch) orderPieces += count
                orderValue += count * pattern.estimatedPrice
              }
            })
          })

          // Check for explicit prices mentioned
          const prices = message.content.match(priceRegex)
          if (prices) {
            prices.forEach((priceStr) => {
              const price = Number.parseFloat(priceStr.replace(/\$|\.|,/g, ""))
              if (price > 1000) {
                // Assuming minimum order of $1000 CLP
                orderValue = Math.max(orderValue, price) // Use explicit price if higher than estimated
              }
            })
          }

          // If this looks like an order (has products or pieces)
          if (orderPieces > 0 || detectedProducts.length > 0) {
            analysis.totalOrders++
            analysis.totalPieces += orderPieces
            orderDates.push(message.timestamp)
            totalOrders++

            // Use estimated value if no explicit price found
            if (orderValue === 0 && orderPieces > 0) {
              orderValue = orderPieces * 850 // Average price per piece
            }

            clientRevenue += orderValue
            totalRevenue += orderValue

            if (message.timestamp > analysis.lastOrderDate) {
              analysis.lastOrderDate = message.timestamp
            }

            // Calculate response time (time between bakery asking and client responding)
            let responseTime = 0
            if (i > 0) {
              const prevMessage = sortedMessages[i - 1]
              if (
                !prevMessage.isClient &&
                prevMessage.content.toLowerCase().includes("cuántas piezas") &&
                message.timestamp.getTime() - prevMessage.timestamp.getTime() < 24 * 60 * 60 * 1000
              ) {
                const responseTimeMs = message.timestamp.getTime() - prevMessage.timestamp.getTime()
                responseTime = responseTimeMs / (1000 * 60 * 60)
                totalResponseTime += responseTime
                responseCount++
              }
            }

            // Create order record
            const orderRecord: OrderData = {
              date: message.timestamp.toLocaleDateString(),
              client: clientName,
              products: detectedProducts.join(", ") || message.content,
              totalPieces: orderPieces,
              orderType: orderPieces >= 25 ? "Grande" : orderPieces >= 15 ? "Mediano" : "Pequeño",
              responseTime: Math.round(responseTime * 10) / 10,
              estimatedValue: orderValue,
              dayOfWeek: message.timestamp.toLocaleDateString("es-ES", { weekday: "long" }),
              hour: message.timestamp.getHours(),
            }

            ordersData.push(orderRecord)
            clientOrders.push(orderRecord)
          }

          // Detect payment issues
          if (
            message.content.toLowerCase().includes("pago") ||
            message.content.toLowerCase().includes("mañana lo pago") ||
            message.content.toLowerCase().includes("no lo pague")
          ) {
            analysis.paymentIssues++
          }

          // Detect "no" responses
          if (
            message.content.toLowerCase().trim() === "hoy no" ||
            (message.content.toLowerCase().includes("no") && message.content.length < 20)
          ) {
            analysis.noResponseDays++
          }
        }
      }

      // Calculate metrics
      analysis.totalSpent = clientRevenue
      analysis.avgOrderValue = analysis.totalOrders > 0 ? clientRevenue / analysis.totalOrders : 0
      analysis.avgPiecesPerOrder = analysis.totalOrders > 0 ? analysis.totalPieces / analysis.totalOrders : 0
      analysis.messagesPerOrder = analysis.totalOrders > 0 ? totalMessages / analysis.totalOrders : totalMessages
      analysis.responseTimeHours = responseCount > 0 ? totalResponseTime / responseCount : 0

      // Calculate satisfaction score
      analysis.satisfactionScore = analysis.compliments - analysis.complaints

      // Calculate order frequency (orders per week)
      if (orderDates.length > 1) {
        const firstOrder = orderDates[0]
        const lastOrder = orderDates[orderDates.length - 1]
        const daysDiff = (lastOrder.getTime() - firstOrder.getTime()) / (1000 * 60 * 60 * 24)
        analysis.orderFrequency = daysDiff > 0 ? (analysis.totalOrders / daysDiff) * 7 : 0
      }

      // Get preferred products with percentages
      const totalProductCount = Object.values(clientProductCounts).reduce((sum, count) => sum + count, 0)
      analysis.preferredProducts = Object.entries(clientProductCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([product, count]) => ({
          product,
          count,
          percentage: totalProductCount > 0 ? Math.round((count / totalProductCount) * 100) : 0,
        }))

      // Store client-specific data
      clientOrdersData.set(clientName, clientOrders)
      clientProductsData.set(clientName, analysis.preferredProducts)

      // Detect order patterns
      const patterns = []
      if (analysis.avgPiecesPerOrder >= 25) patterns.push("Pedidos grandes")
      if (analysis.orderFrequency > 4) patterns.push("Cliente frecuente")
      if (analysis.responseTimeHours > 3) patterns.push("Respuesta lenta")
      if (analysis.paymentIssues > 0) patterns.push("Problemas de pago")
      if (analysis.noResponseDays > 3) patterns.push("Días sin pedido")
      if (analysis.satisfactionScore > 2) patterns.push("Cliente satisfecho")
      if (analysis.satisfactionScore < -1) patterns.push("Cliente insatisfecho")
      if (analysis.avgOrderValue > 20000) patterns.push("Alto valor")
      analysis.orderPatterns = patterns

      // Calculate difficulty score (updated with new factors)
      analysis.difficultyScore =
        (analysis.messagesPerOrder > 2 ? 1 : 0) +
        (analysis.responseTimeHours > 4 ? 2 : 0) +
        analysis.paymentIssues * 3 +
        (analysis.noResponseDays > 3 ? 2 : 0) +
        (analysis.orderFrequency < 1 ? 1 : 0) +
        (analysis.complaints > analysis.compliments ? 2 : 0)

      // Analyze with GPT if API key is available
      let gptAnalysis: GPTAnalysis | null = null
      if (process.env.OPENAI_API_KEY && analysis.totalOrders > 0) {
        try {
          const clientMessageTexts = sortedMessages.filter((m) => m.isClient).map((m) => m.content)

          gptAnalysis = await analyzeWithGPT(analysis, clientMessageTexts, clientOrders)
        } catch (error) {
          console.error(`Error analyzing client ${clientName} with GPT:`, error)
          gptAnalysis = createFallbackAnalysis(analysis)
        }
      } else {
        gptAnalysis = createFallbackAnalysis(analysis)
      }

      return { analysis, gptAnalysis }
    },
  )

  // Wait for all client analyses to complete
  const clientResults = await Promise.all(clientAnalysisPromises)

  // Process results
  clientResults.forEach(({ analysis, gptAnalysis }) => {
    clients.set(analysis.name, analysis)
  })

  const clientsData = Array.from(clients.values()).map((client, index) => {
    const gptAnalysis = clientResults[index]?.gptAnalysis

    return {
      "Nombre Cliente": client.name,
      "Total Pedidos": client.totalOrders,
      "Total Piezas": client.totalPieces,
      "Total Gastado": client.totalSpent,
      "Valor Promedio Pedido": Math.round(client.avgOrderValue),
      "Promedio Piezas/Pedido": Math.round(client.avgPiecesPerOrder * 10) / 10,
      "Mensajes por Pedido": Math.round(client.messagesPerOrder * 10) / 10,
      "Tiempo Respuesta (hrs)": Math.round(client.responseTimeHours * 10) / 10,
      "Puntuación Dificultad": client.difficultyScore,
      "Último Pedido": client.lastOrderDate.toLocaleDateString(),
      "Productos Preferidos": client.preferredProducts.map((p) => `${p.product} (${p.count})`).join(", "),
      "Productos Detallados": client.preferredProducts,
      Patrones: client.orderPatterns.join(", "),
      "Problemas Pago": client.paymentIssues,
      "Días Sin Pedido": client.noResponseDays,
      "Frecuencia Semanal": Math.round(client.orderFrequency * 10) / 10,
      "Puntuación Satisfacción": client.satisfactionScore,
      "Nivel de Riesgo": gptAnalysis?.riskLevel || "low",
      "Perfil de Comportamiento": gptAnalysis?.behaviorProfile || "Análisis en proceso",
      "Valor para Negocio": gptAnalysis?.businessValue || "Evaluando",
      "Análisis Satisfacción": gptAnalysis?.satisfactionAnalysis || "Pendiente",
      "Insights GPT": gptAnalysis?.insights || [],
      "Recomendaciones GPT": gptAnalysis?.recommendations || [],
      Predicciones: gptAnalysis?.predictedActions || [],
    }
  })

  const productsData = Array.from(products.entries()).map(([product, count]) => ({
    Producto: product,
    "Total Pedidos": count,
    Popularidad: count > 50 ? "Muy Alta" : count > 20 ? "Alta" : count > 10 ? "Media" : "Baja",
  }))

  const trendsData = [
    ...hourlyTrends.map((count, hour) => ({
      Tipo: "Hora",
      Periodo: `${hour}:00`,
      Actividad: count,
    })),
    ...dailyTrends.map((count, day) => ({
      Tipo: "Día Semana",
      Periodo: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][day],
      Actividad: count,
    })),
    ...monthlyTrends.map((count, month) => ({
      Tipo: "Mes",
      Periodo: [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
      ][month],
      Actividad: count,
    })),
  ]

  const ordersExportData = ordersData.map((order) => ({
    Fecha: order.date,
    Cliente: order.client,
    Productos: order.products,
    "Total Piezas": order.totalPieces,
    "Tipo Pedido": order.orderType,
    "Tiempo Respuesta (hrs)": order.responseTime,
    "Valor Estimado": order.estimatedValue,
    "Día de la Semana": order.dayOfWeek,
    Hora: order.hour,
  }))

  return {
    totalClients: clients.size,
    totalOrders,
    totalPieces: Array.from(clients.values()).reduce((sum, client) => sum + client.totalPieces, 0),
    totalRevenue: Array.from(clients.values()).reduce((sum, client) => sum + client.totalSpent, 0),
    avgResponseTime:
      Math.round(
        (Array.from(clients.values()).reduce((sum, client) => sum + client.responseTimeHours, 0) / clients.size) * 10,
      ) / 10,
    clientsData: clientsData.sort((a, b) => b["Total Gastado"] - a["Total Gastado"]),
    productsData: productsData.sort((a, b) => b["Total Pedidos"] - a["Total Pedidos"]),
    trendsData,
    ordersData: ordersExportData,
    isAccumulative,
    totalConversationsProcessed: totalConversations,
  }
}

function findClientForBakeryMessage(messages: Message[], bakeryMessage: Message): string | null {
  // Find the client this bakery message is responding to
  const messageIndex = messages.findIndex((m) => m === bakeryMessage)

  // Look backwards for the most recent client message
  for (let i = messageIndex - 1; i >= 0; i--) {
    if (messages[i].isClient) {
      return messages[i].sender
    }
  }

  // Look forwards for the next client message
  for (let i = messageIndex + 1; i < messages.length; i++) {
    if (messages[i].isClient) {
      return messages[i].sender
    }
  }

  return null
}
