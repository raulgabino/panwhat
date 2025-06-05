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

  // Regex más flexible para diferentes formatos de fecha y hora
  // Soporta: [H:MM AM/PM, M/D/YYYY], [HH:MM, DD/MM/YYYY], [H:MM AM/PM, D/M/YYYY], etc.
  const whatsappRegex = /^\[(\d{1,2}:\d{2}(?:\s(?:AM|PM))?),\s(\d{1,2}\/\d{1,2}\/\d{2,4})\]\s([^:]+):\s*(.*)$/

  for (const line of lines) {
    const match = line.match(whatsappRegex)
    if (match) {
      const [, time, date, sender, content] = match

      // Parse date más flexible
      const [datePart1, datePart2, year] = date.split("/").map(Number)
      let month: number, day: number, fullYear: number

      // Determinar si es formato MM/DD o DD/MM basado en valores
      if (datePart1 > 12) {
        // Debe ser DD/MM
        day = datePart1
        month = datePart2
      } else if (datePart2 > 12) {
        // Debe ser MM/DD
        month = datePart1
        day = datePart2
      } else {
        // Ambiguo, asumir MM/DD (formato US común en WhatsApp)
        month = datePart1
        day = datePart2
      }

      // Manejar años de 2 dígitos
      fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year

      // Parse time más flexible (12h y 24h)
      let adjustedHour: number, minute: number

      if (time.includes("AM") || time.includes("PM")) {
        // Formato 12 horas
        const [hourMin, period] = time.split(" ")
        const [hour, min] = hourMin.split(":").map(Number)
        minute = min

        adjustedHour = hour
        if (period === "PM" && hour !== 12) adjustedHour += 12
        if (period === "AM" && hour === 12) adjustedHour = 0
      } else {
        // Formato 24 horas
        const [hour, min] = time.split(":").map(Number)
        adjustedHour = hour
        minute = min
      }

      const timestamp = new Date(fullYear, month - 1, day, adjustedHour, minute)

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

  let totalOrders = 0
  let totalRevenue = 0

  // Estado para procesamiento cronológico
  let lastClientSender: string | null = null
  const lastBakeryMessageTime: Date | null = null
  const conversationStates = new Map<
    string,
    {
      lastBakeryMessage: Date | null
      awaitingResponse: boolean
      messages: Message[]
    }
  >()

  // Procesar mensajes cronológicamente
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]

    // Update temporal trends
    hourlyTrends[message.timestamp.getHours()]++
    dailyTrends[message.timestamp.getDay()]++
    monthlyTrends[message.timestamp.getMonth()]++

    if (message.isClient) {
      // Mensaje de cliente
      lastClientSender = message.sender

      // Inicializar cliente si no existe
      if (!clients.has(message.sender)) {
        clients.set(message.sender, {
          name: message.sender,
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
        })
      }

      // Inicializar estado de conversación si no existe
      if (!conversationStates.has(message.sender)) {
        conversationStates.set(message.sender, {
          lastBakeryMessage: null,
          awaitingResponse: false,
          messages: [],
        })
      }

      const clientAnalysis = clients.get(message.sender)!
      const conversationState = conversationStates.get(message.sender)!

      // Agregar mensaje al historial de la conversación
      conversationState.messages.push(message)

      // Calcular tiempo de respuesta si la panadería estaba esperando respuesta
      if (conversationState.awaitingResponse && conversationState.lastBakeryMessage) {
        const responseTimeMs = message.timestamp.getTime() - conversationState.lastBakeryMessage.getTime()
        const responseTimeHours = responseTimeMs / (1000 * 60 * 60)

        // Actualizar tiempo de respuesta promedio
        const currentTotal = clientAnalysis.responseTimeHours * (clientAnalysis.totalOrders || 1)
        clientAnalysis.responseTimeHours =
          (currentTotal + responseTimeHours) / Math.max(1, clientAnalysis.totalOrders + 1)

        conversationState.awaitingResponse = false
      }

      // Analizar contenido del mensaje
      const messageContent = message.content.toLowerCase()

      // Detect satisfaction indicators
      const positiveWords = ["gracias", "perfecto", "excelente", "bueno", "ok", "bien"]
      const negativeWords = ["problema", "mal", "error", "queja", "reclamo", "demora", "tarde"]

      if (positiveWords.some((word) => messageContent.includes(word))) {
        clientAnalysis.compliments++
      }
      if (negativeWords.some((word) => messageContent.includes(word))) {
        clientAnalysis.complaints++
      }

      // Detect payment issues
      if (
        messageContent.includes("pago") ||
        messageContent.includes("mañana lo pago") ||
        messageContent.includes("no lo pague")
      ) {
        clientAnalysis.paymentIssues++
      }

      // Detect "no" responses
      if (messageContent.trim() === "hoy no" || (messageContent.includes("no") && message.content.length < 20)) {
        clientAnalysis.noResponseDays++
      }

      // Detect orders by looking for product patterns
      let orderPieces = 0
      let orderValue = 0
      const detectedProducts: string[] = []

      // Check for explicit piece count
      const piecesMatch = message.content.match(/(\d+)\s*piezas?/i)
      if (piecesMatch) {
        orderPieces = Number.parseInt(piecesMatch[1])
      }

      // Detect specific products
      Object.entries(productPatterns).forEach(([productName, pattern]) => {
        const matches = [...message.content.matchAll(pattern.regex)]
        matches.forEach((match) => {
          const countText = match[1]
          const count = textToNumber(countText)

          if (count > 0) {
            // Actualizar contadores de productos del cliente
            if (!clientAnalysis.preferredProducts.find((p) => p.product === productName)) {
              clientAnalysis.preferredProducts.push({ product: productName, count: 0, percentage: 0 })
            }
            const productIndex = clientAnalysis.preferredProducts.findIndex((p) => p.product === productName)
            clientAnalysis.preferredProducts[productIndex].count += count

            // Actualizar contadores globales
            products.set(productName, (products.get(productName) || 0) + count)

            detectedProducts.push(`${count} ${productName}`)
            if (!piecesMatch) orderPieces += count
            orderValue += count * pattern.estimatedPrice
          }
        })
      })

      // Check for explicit prices
      const prices = message.content.match(/\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g)
      if (prices) {
        prices.forEach((priceStr) => {
          const price = Number.parseFloat(priceStr.replace(/\$|\.|,/g, ""))
          if (price > 1000) {
            orderValue = Math.max(orderValue, price)
          }
        })
      }

      // If this looks like an order
      if (orderPieces > 0 || detectedProducts.length > 0) {
        clientAnalysis.totalOrders++
        clientAnalysis.totalPieces += orderPieces
        totalOrders++

        if (orderValue === 0 && orderPieces > 0) {
          orderValue = orderPieces * 850 // Average price per piece
        }

        clientAnalysis.totalSpent += orderValue
        totalRevenue += orderValue

        if (message.timestamp > clientAnalysis.lastOrderDate) {
          clientAnalysis.lastOrderDate = message.timestamp
        }

        // Create order record
        const orderRecord: OrderData = {
          date: message.timestamp.toLocaleDateString(),
          client: message.sender,
          products: detectedProducts.join(", ") || message.content,
          totalPieces: orderPieces,
          orderType: orderPieces >= 25 ? "Grande" : orderPieces >= 15 ? "Mediano" : "Pequeño",
          responseTime:
            conversationState.awaitingResponse && conversationState.lastBakeryMessage
              ? Math.round(
                  ((message.timestamp.getTime() - conversationState.lastBakeryMessage.getTime()) / (1000 * 60 * 60)) *
                    10,
                ) / 10
              : 0,
          estimatedValue: orderValue,
          dayOfWeek: message.timestamp.toLocaleDateString("es-ES", { weekday: "long" }),
          hour: message.timestamp.getHours(),
        }

        ordersData.push(orderRecord)
      }
    } else {
      // Mensaje de la panadería
      if (lastClientSender) {
        // Atribuir mensaje de panadería al último cliente que habló
        const conversationState = conversationStates.get(lastClientSender)
        if (conversationState) {
          conversationState.lastBakeryMessage = message.timestamp
          conversationState.awaitingResponse = true
          conversationState.messages.push(message)
        }
      }
    }
  }

  // Calcular métricas finales para cada cliente
  const clientAnalysisPromises = Array.from(clients.entries()).map(async ([clientName, analysis]) => {
    // Calculate final metrics
    analysis.avgPiecesPerOrder = analysis.totalOrders > 0 ? analysis.totalPieces / analysis.totalOrders : 0
    analysis.avgOrderValue = analysis.totalOrders > 0 ? analysis.totalSpent / analysis.totalOrders : 0
    analysis.satisfactionScore = analysis.compliments - analysis.complaints

    // Calculate order frequency
    const conversationState = conversationStates.get(clientName)
    if (conversationState && conversationState.messages.length > 0) {
      const clientMessages = conversationState.messages.filter((m) => m.isClient)
      analysis.messagesPerOrder =
        analysis.totalOrders > 0 ? clientMessages.length / analysis.totalOrders : clientMessages.length

      // Calculate frequency based on order dates
      const orderDates = ordersData
        .filter((order) => order.client === clientName)
        .map((order) => new Date(order.date))
        .sort((a, b) => a.getTime() - b.getTime())

      if (orderDates.length > 1) {
        const firstOrder = orderDates[0]
        const lastOrder = orderDates[orderDates.length - 1]
        const daysDiff = (lastOrder.getTime() - firstOrder.getTime()) / (1000 * 60 * 60 * 24)
        analysis.orderFrequency = daysDiff > 0 ? (analysis.totalOrders / daysDiff) * 7 : 0
      }
    }

    // Calculate preferred products percentages
    const totalProductCount = analysis.preferredProducts.reduce((sum, p) => sum + p.count, 0)
    analysis.preferredProducts = analysis.preferredProducts
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((product) => ({
        ...product,
        percentage: totalProductCount > 0 ? Math.round((product.count / totalProductCount) * 100) : 0,
      }))

    // Calculate difficulty score and patterns
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

    analysis.difficultyScore =
      (analysis.messagesPerOrder > 2 ? 1 : 0) +
      (analysis.responseTimeHours > 4 ? 2 : 0) +
      analysis.paymentIssues * 3 +
      (analysis.noResponseDays > 3 ? 2 : 0) +
      (analysis.orderFrequency < 1 ? 1 : 0) +
      (analysis.complaints > analysis.compliments ? 2 : 0)

    // Analyze with GPT if available
    let gptAnalysis: GPTAnalysis | null = null
    if (process.env.OPENAI_API_KEY && analysis.totalOrders > 0) {
      try {
        const conversationState = conversationStates.get(clientName)
        const clientMessageTexts = conversationState?.messages.filter((m) => m.isClient).map((m) => m.content) || []

        const clientOrders = ordersData.filter((order) => order.client === clientName)
        gptAnalysis = await analyzeWithGPT(analysis, clientMessageTexts, clientOrders)
      } catch (error) {
        console.error(`Error analyzing client ${clientName} with GPT:`, error)
        gptAnalysis = createFallbackAnalysis(analysis)
      }
    } else {
      gptAnalysis = createFallbackAnalysis(analysis)
    }

    return { analysis, gptAnalysis }
  })

  // Wait for all analyses to complete
  const clientResults = await Promise.all(clientAnalysisPromises)

  // Process results and prepare final data structure
  const clientsData = clientResults.map(({ analysis, gptAnalysis }) => ({
    "Nombre Cliente": analysis.name,
    "Total Pedidos": analysis.totalOrders,
    "Total Piezas": analysis.totalPieces,
    "Total Gastado": analysis.totalSpent,
    "Valor Promedio Pedido": Math.round(analysis.avgOrderValue),
    "Promedio Piezas/Pedido": Math.round(analysis.avgPiecesPerOrder * 10) / 10,
    "Mensajes por Pedido": Math.round(analysis.messagesPerOrder * 10) / 10,
    "Tiempo Respuesta (hrs)": Math.round(analysis.responseTimeHours * 10) / 10,
    "Puntuación Dificultad": analysis.difficultyScore,
    "Último Pedido": analysis.lastOrderDate.toLocaleDateString(),
    "Productos Preferidos": analysis.preferredProducts.map((p) => `${p.product} (${p.count})`).join(", "),
    "Productos Detallados": analysis.preferredProducts,
    Patrones: analysis.orderPatterns.join(", "),
    "Problemas Pago": analysis.paymentIssues,
    "Días Sin Pedido": analysis.noResponseDays,
    "Frecuencia Semanal": Math.round(analysis.orderFrequency * 10) / 10,
    "Puntuación Satisfacción": analysis.satisfactionScore,
    "Nivel de Riesgo": gptAnalysis?.riskLevel || "low",
    "Perfil de Comportamiento": gptAnalysis?.behaviorProfile || "Análisis en proceso",
    "Valor para Negocio": gptAnalysis?.businessValue || "Evaluando",
    "Análisis Satisfacción": gptAnalysis?.satisfactionAnalysis || "Pendiente",
    "Insights GPT": gptAnalysis?.insights || [],
    "Recomendaciones GPT": gptAnalysis?.recommendations || [],
    Predicciones: gptAnalysis?.predictedActions || [],
  }))

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

const productPatterns = {
  "conchas blancas": {
    regex:
      /\b(?:(\d+|uno?|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez))\s*(?:conchas?|conchitas?)\s*(?:blancas?|blanquitas?)?\b/gi,
    estimatedPrice: 800,
  },
  "panes largos": {
    regex:
      /\b(?:(\d+|uno?|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez))\s*(?:panes?|panecitos?)\s*(?:largos?|larguitos?)?\b/gi,
    estimatedPrice: 1000,
  },
  armadillos: {
    regex: /\b(?:(\d+|uno?|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez))\s*(?:armadillos?|armadillitos?)\b/gi,
    estimatedPrice: 900,
  },
  pastelitos: {
    regex: /\b(?:(\d+|uno?|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez))\s*(?:pastelitos?|pasteles?)\b/gi,
    estimatedPrice: 1200,
  },
  donas: {
    regex: /\b(?:(\d+|uno?|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez))\s*(?:donas?|donitas?)\b/gi,
    estimatedPrice: 1100,
  },
  bisquete: {
    regex: /\b(?:(\d+|uno?|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez))\s*(?:bisquete?s?|bisquetitos?)\b/gi,
    estimatedPrice: 700,
  },
  roles: {
    regex: /\b(?:(\d+|uno?|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez))\s*(?:roles?|rolitos?)\b/gi,
    estimatedPrice: 800,
  },
  ojos: {
    regex: /\b(?:(\d+|uno?|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez))\s*(?:ojos?|ojitos?)\b/gi,
    estimatedPrice: 900,
  },
  hojaldrado: {
    regex:
      /\b(?:(\d+|uno?|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez))\s*(?:hojaldrados?|hojaldraditos?)\b/gi,
    estimatedPrice: 1000,
  },
  tostados: {
    regex: /\b(?:(\d+|uno?|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez))\s*(?:tostados?|tostaditos?)\b/gi,
    estimatedPrice: 1100,
  },
  "pan blanco": {
    regex:
      /\b(?:(\d+|uno?|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez))\s*(?:pan|panes?)\s*(?:blanco?s?|blanquito?s?)\b/gi,
    estimatedPrice: 600,
  },
  cambios: {
    regex: /\b(?:(\d+|uno?|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez))\s*(?:cambios?|cambiitos?)\b/gi,
    estimatedPrice: 800,
  },
  surtidas: {
    regex:
      /\b(?:(\d+|uno?|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez))\s*(?:piezas?\s*)?(?:surtidas?|surtiditas?)\b/gi,
    estimatedPrice: 850,
  },
}

// Función para convertir números en texto a números
const textToNumber = (text: string): number => {
  const numberMap: { [key: string]: number } = {
    uno: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
  }

  const lowerText = text.toLowerCase()
  return numberMap[lowerText] || Number.parseInt(text) || 0
}
