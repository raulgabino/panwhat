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
  specificOrders: number
  generalOrders: number
  specificPieces: number
  generalPieces: number
}

interface OrderData {
  date: string
  client: string
  products: string
  totalPieces: number
  orderType: string
  orderCategory: "especifico" | "general"
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

interface ConversationContext {
  lastClientSender: string | null
  lastBakeryMessageTime: Date | null
  clientStates: Map<
    string,
    {
      lastBakeryMessage: Date | null
      awaitingResponse: boolean
      totalMessages: number
      responseTimes: number[]
    }
  >
}

async function analyzeWithGPT(
  clientData: ClientAnalysis,
  messages: string[],
  orderHistory: OrderData[],
): Promise<GPTAnalysis> {
  try {
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
      preferredProducts: clientData.preferredProducts.slice(0, 3),
      recentMessages: messages.slice(-5),
      orderTrends: orderHistory.slice(-3),
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
        model: "gpt-4o-mini",
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
        temperature: 0.1,
        max_tokens: 800,
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

    try {
      const cleanResponse = gptResponse.replace(/```json|```/g, "").trim()
      const analysis = JSON.parse(cleanResponse)

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

  if (clientData.totalSpent > 100000) {
    insights.push("Cliente de muy alto valor económico para el negocio")
    recommendations.push("Ofrecer descuentos por volumen y productos premium")
  } else if (clientData.totalSpent > 50000) {
    insights.push("Cliente de valor medio-alto con potencial de crecimiento")
    recommendations.push("Implementar programa de fidelización")
  }

  if (clientData.orderFrequency > 5) {
    insights.push("Cliente muy frecuente, excelente para flujo de caja")
    recommendations.push("Asegurar disponibilidad de productos preferidos")
  } else if (clientData.orderFrequency < 1) {
    insights.push("Cliente esporádico, riesgo de pérdida")
    recommendations.push("Implementar estrategia de reactivación")
  }

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

    const messages = parseWhatsAppConversations(conversations)

    // Verificar si se pudieron procesar mensajes válidos
    if (messages.length === 0) {
      return NextResponse.json(
        {
          error: "No se pudieron reconocer mensajes válidos en el texto. Verifica el formato del chat.",
        },
        { status: 400 },
      )
    }

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

  // Regex mejorada para múltiples formatos de hora y fecha
  // Soporta: [H:MM a.m./p.m./AM/PM, D/M/AAAA] o [HH:MM, DD/MM/YYYY] etc.
  const whatsappRegex =
    /^\[(\d{1,2}:\d{2}(?:\s*(?:[ap]\.?m\.?|AM|PM))?),\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\]\s*([^:]+):\s*(.*)$/i

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    const match = trimmedLine.match(whatsappRegex)
    if (match) {
      const [, time, date, sender, content] = match

      try {
        // Parse date más robusto
        const [datePart1, datePart2, year] = date.split("/").map(Number)
        let month: number, day: number, fullYear: number

        // Determinar formato de fecha basado en valores
        if (datePart1 > 12) {
          // Debe ser DD/MM
          day = datePart1
          month = datePart2
        } else if (datePart2 > 12) {
          // Debe ser MM/DD
          month = datePart1
          day = datePart2
        } else {
          // Ambiguo, asumir DD/MM (formato más común internacionalmente)
          day = datePart1
          month = datePart2
        }

        // Manejar años de 2 dígitos
        fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year

        // Parse time más flexible
        let adjustedHour: number, minute: number

        // Detectar formato AM/PM (insensible a mayúsculas y puntos opcionales)
        const timeMatch = time.match(/(\d{1,2}):(\d{2})(?:\s*([ap])\.?m\.?)?/i)
        if (timeMatch) {
          const [, hourStr, minStr, period] = timeMatch
          const hour = Number.parseInt(hourStr)
          minute = Number.parseInt(minStr)

          if (period) {
            // Formato 12 horas
            adjustedHour = hour
            if (period.toLowerCase() === "p" && hour !== 12) adjustedHour += 12
            if (period.toLowerCase() === "a" && hour === 12) adjustedHour = 0
          } else {
            // Formato 24 horas
            adjustedHour = hour
          }
        } else {
          // Fallback para formatos no reconocidos
          const [hour, min] = time.split(":").map(Number)
          adjustedHour = hour
          minute = min
        }

        const timestamp = new Date(fullYear, month - 1, day, adjustedHour, minute)

        // Verificar que la fecha sea válida
        if (isNaN(timestamp.getTime())) {
          console.warn(`Invalid timestamp for line: ${line}`)
          continue
        }

        // Determinar si es cliente (no es la panadería)
        const isClient = !sender.toLowerCase().includes("panaderia quilantan")

        messages.push({
          timestamp,
          sender: sender.trim(),
          content: content.trim(),
          isClient,
        })
      } catch (error) {
        console.warn(`Error parsing line: ${line}`, error)
        continue
      }
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
  let totalSpecificOrders = 0
  let totalGeneralOrders = 0
  let totalSpecificPieces = 0
  let totalGeneralPieces = 0

  // Contexto de conversación para procesamiento cronológico
  const context: ConversationContext = {
    lastClientSender: null,
    lastBakeryMessageTime: null,
    clientStates: new Map(),
  }

  // Productos específicos de panadería con regex mejoradas (sin "cambios")
  const productPatterns = {
    "conchas blancas": {
      regex: /\b(?:conchas?|conchitas?)\s*(?:blancas?|blanquitas?)?\b/gi,
      estimatedPrice: 800,
    },
    "panes largos": {
      regex: /\b(?:panes?|panecitos?)\s*(?:largos?|larguitos?)?\b/gi,
      estimatedPrice: 1000,
    },
    armadillos: {
      regex: /\b(?:armadillos?|armadillitos?)\b/gi,
      estimatedPrice: 900,
    },
    pastelitos: {
      regex: /\b(?:pastelitos?|pasteles?|pastelillos?)\b/gi,
      estimatedPrice: 1200,
    },
    donas: {
      regex: /\b(?:donas?|donitas?|donutas?)\b/gi,
      estimatedPrice: 1100,
    },
    bisquete: {
      regex: /\b(?:bisquetes?|bisquetitos?)\b/gi,
      estimatedPrice: 700,
    },
    roles: {
      regex: /\b(?:roles?|rolitos?|rollitos?)\b/gi,
      estimatedPrice: 800,
    },
    ojos: {
      regex: /\b(?:ojos?|ojitos?)\b/gi,
      estimatedPrice: 900,
    },
    hojaldrado: {
      regex: /\b(?:hojaldrados?|hojaldraditos?)\b/gi,
      estimatedPrice: 1000,
    },
    tostados: {
      regex: /\b(?:tostados?|tostaditos?)\b/gi,
      estimatedPrice: 1100,
    },
    "pan blanco": {
      regex: /\b(?:panes?)\s*(?:blancos?|blanquitos?)\b/gi,
      estimatedPrice: 600,
    },
    surtidas: {
      regex: /\b(?:piezas?\s*)?(?:surtidas?|surtiditas?|variadas?)\b/gi,
      estimatedPrice: 850,
    },
  }

  // Palabras clave para pedidos generales
  const generalOrderKeywords = /\b(?:piezas?|surtido|panes?)\b/gi

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
      once: 11,
      doce: 12,
      trece: 13,
      catorce: 14,
      quince: 15,
      veinte: 20,
      treinta: 30,
      cuarenta: 40,
      cincuenta: 50,
    }
    const lowerText = text.toLowerCase()
    return numberMap[lowerText] || Number.parseInt(text) || 0
  }

  // Función para extraer números de un texto
  const extractNumbers = (text: string): number[] => {
    const numbers: number[] = []

    // Buscar números escritos en dígitos
    const digitMatches = text.match(/\b\d+\b/g)
    if (digitMatches) {
      numbers.push(...digitMatches.map(Number))
    }

    // Buscar números escritos en palabras
    const words = text.toLowerCase().split(/\s+/)
    for (const word of words) {
      const num = textToNumber(word)
      if (num > 0) {
        numbers.push(num)
      }
    }

    return numbers
  }

  // Función para determinar si un mensaje contiene un pedido específico
  const containsSpecificProducts = (content: string): boolean => {
    return Object.values(productPatterns).some((pattern) => pattern.regex.test(content))
  }

  // Función para determinar si un mensaje contiene un pedido general
  const containsGeneralOrder = (content: string): boolean => {
    return generalOrderKeywords.test(content) && !containsSpecificProducts(content)
  }

  // Procesar mensajes cronológicamente
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]

    // Actualizar tendencias temporales
    hourlyTrends[message.timestamp.getHours()]++
    dailyTrends[message.timestamp.getDay()]++
    monthlyTrends[message.timestamp.getMonth()]++

    if (message.isClient) {
      // Mensaje de cliente
      context.lastClientSender = message.sender

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
          specificOrders: 0,
          generalOrders: 0,
          specificPieces: 0,
          generalPieces: 0,
        })
      }

      // Inicializar estado del cliente si no existe
      if (!context.clientStates.has(message.sender)) {
        context.clientStates.set(message.sender, {
          lastBakeryMessage: null,
          awaitingResponse: false,
          totalMessages: 0,
          responseTimes: [],
        })
      }

      const clientAnalysis = clients.get(message.sender)!
      const clientState = context.clientStates.get(message.sender)!

      clientState.totalMessages++

      // Calcular tiempo de respuesta si la panadería estaba esperando respuesta
      if (clientState.awaitingResponse && clientState.lastBakeryMessage) {
        const responseTimeMs = message.timestamp.getTime() - clientState.lastBakeryMessage.getTime()
        const responseTimeHours = responseTimeMs / (1000 * 60 * 60)

        // Solo considerar tiempos de respuesta razonables (menos de 24 horas)
        if (responseTimeHours < 24) {
          clientState.responseTimes.push(responseTimeHours)
        }

        clientState.awaitingResponse = false
      }

      // Analizar contenido del mensaje
      const messageContent = message.content.toLowerCase()

      // Detectar indicadores de satisfacción
      const positiveWords = ["gracias", "perfecto", "excelente", "bueno", "ok", "bien", "genial", "súper"]
      const negativeWords = ["problema", "mal", "error", "queja", "reclamo", "demora", "tarde", "feo", "horrible"]

      if (positiveWords.some((word) => messageContent.includes(word))) {
        clientAnalysis.compliments++
      }
      if (negativeWords.some((word) => messageContent.includes(word))) {
        clientAnalysis.complaints++
      }

      // Detectar problemas de pago
      if (
        messageContent.includes("pago") ||
        messageContent.includes("mañana lo pago") ||
        messageContent.includes("no lo pague") ||
        messageContent.includes("después pago") ||
        messageContent.includes("luego pago")
      ) {
        clientAnalysis.paymentIssues++
      }

      // Detectar respuestas negativas
      if (
        messageContent.trim() === "hoy no" ||
        messageContent.trim() === "no" ||
        (messageContent.includes("no") && message.content.length < 20)
      ) {
        clientAnalysis.noResponseDays++
      }

      // Analizar si el mensaje contiene un pedido
      const isSpecificOrder = containsSpecificProducts(message.content)
      const isGeneralOrder = containsGeneralOrder(message.content)

      if (isSpecificOrder || isGeneralOrder) {
        let orderPieces = 0
        let orderValue = 0
        const detectedProducts: string[] = []
        let orderCategory: "especifico" | "general" = "general"

        // Extraer números del mensaje
        const numbersInMessage = extractNumbers(message.content)

        if (isSpecificOrder) {
          orderCategory = "especifico"

          // Detectar productos específicos
          Object.entries(productPatterns).forEach(([productName, pattern]) => {
            if (pattern.regex.test(message.content)) {
              // Buscar números en el contexto del producto
              let productCount = 0

              // Si hay números en el mensaje, usar el primero como cantidad
              if (numbersInMessage.length > 0) {
                productCount = numbersInMessage[0]
              } else {
                // Si no hay números explícitos, asumir 1
                productCount = 1
              }

              if (productCount > 0) {
                // Actualizar contadores de productos del cliente
                const existingProduct = clientAnalysis.preferredProducts.find((p) => p.product === productName)
                if (existingProduct) {
                  existingProduct.count += productCount
                } else {
                  clientAnalysis.preferredProducts.push({ product: productName, count: productCount, percentage: 0 })
                }

                // Actualizar contadores globales
                products.set(productName, (products.get(productName) || 0) + productCount)

                detectedProducts.push(`${productCount} ${productName}`)
                orderPieces += productCount
                orderValue += productCount * pattern.estimatedPrice
              }
            }
          })
        } else if (isGeneralOrder) {
          orderCategory = "general"

          // Para pedidos generales, buscar cantidad de piezas
          const piecesMatch = message.content.match(/(\d+)\s*piezas?/i)
          if (piecesMatch) {
            orderPieces = Number.parseInt(piecesMatch[1])
          } else if (numbersInMessage.length > 0) {
            // Si hay números pero no se especifica "piezas", usar el primer número
            orderPieces = numbersInMessage[0]
          } else {
            // Si no hay números, asumir un pedido pequeño
            orderPieces = 5
          }

          detectedProducts.push(`${orderPieces} piezas surtidas`)
          orderValue = orderPieces * 850 // Precio promedio por pieza
        }

        // Buscar precios explícitos mencionados
        const priceRegex = /\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g
        const prices = message.content.match(priceRegex)
        if (prices) {
          prices.forEach((priceStr) => {
            const price = Number.parseFloat(priceStr.replace(/\$|\.|,/g, ""))
            if (price > 1000) {
              orderValue = Math.max(orderValue, price)
            }
          })
        }

        // Registrar el pedido
        clientAnalysis.totalOrders++
        clientAnalysis.totalPieces += orderPieces
        totalOrders++

        // Actualizar contadores por categoría
        if (orderCategory === "especifico") {
          clientAnalysis.specificOrders++
          clientAnalysis.specificPieces += orderPieces
          totalSpecificOrders++
          totalSpecificPieces += orderPieces
        } else {
          clientAnalysis.generalOrders++
          clientAnalysis.generalPieces += orderPieces
          totalGeneralOrders++
          totalGeneralPieces += orderPieces
        }

        // Usar valor estimado si no hay precio explícito
        if (orderValue === 0 && orderPieces > 0) {
          orderValue = orderPieces * 850 // Precio promedio por pieza
        }

        clientAnalysis.totalSpent += orderValue
        totalRevenue += orderValue

        if (message.timestamp > clientAnalysis.lastOrderDate) {
          clientAnalysis.lastOrderDate = message.timestamp
        }

        // Crear registro de pedido
        const orderRecord: OrderData = {
          date: message.timestamp.toLocaleDateString(),
          client: message.sender,
          products: detectedProducts.join(", ") || message.content,
          totalPieces: orderPieces,
          orderType: orderPieces >= 25 ? "Grande" : orderPieces >= 15 ? "Mediano" : "Pequeño",
          orderCategory,
          responseTime:
            clientState.responseTimes.length > 0 ? clientState.responseTimes[clientState.responseTimes.length - 1] : 0,
          estimatedValue: orderValue,
          dayOfWeek: message.timestamp.toLocaleDateString("es-ES", { weekday: "long" }),
          hour: message.timestamp.getHours(),
        }

        ordersData.push(orderRecord)
      }
    } else {
      // Mensaje de la panadería
      if (context.lastClientSender) {
        const clientState = context.clientStates.get(context.lastClientSender)
        if (clientState) {
          clientState.lastBakeryMessage = message.timestamp
          clientState.awaitingResponse = true
        }
      }
    }
  }

  // Calcular métricas finales para cada cliente
  const clientAnalysisPromises = Array.from(clients.entries()).map(async ([clientName, analysis]) => {
    const clientState = context.clientStates.get(clientName)

    // Calcular métricas finales
    analysis.avgPiecesPerOrder = analysis.totalOrders > 0 ? analysis.totalPieces / analysis.totalOrders : 0
    analysis.avgOrderValue = analysis.totalOrders > 0 ? analysis.totalSpent / analysis.totalOrders : 0
    analysis.satisfactionScore = analysis.compliments - analysis.complaints

    if (clientState) {
      analysis.messagesPerOrder =
        analysis.totalOrders > 0 ? clientState.totalMessages / analysis.totalOrders : clientState.totalMessages

      // Calcular tiempo de respuesta promedio
      if (clientState.responseTimes.length > 0) {
        analysis.responseTimeHours =
          clientState.responseTimes.reduce((sum, time) => sum + time, 0) / clientState.responseTimes.length
      }
    }

    // Calcular frecuencia de pedidos
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

    // Calcular porcentajes de productos preferidos
    const totalProductCount = analysis.preferredProducts.reduce((sum, p) => sum + p.count, 0)
    analysis.preferredProducts = analysis.preferredProducts
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((product) => ({
        ...product,
        percentage: totalProductCount > 0 ? Math.round((product.count / totalProductCount) * 100) : 0,
      }))

    // Detectar patrones de pedidos
    const patterns = []
    if (analysis.avgPiecesPerOrder >= 25) patterns.push("Pedidos grandes")
    if (analysis.orderFrequency > 4) patterns.push("Cliente frecuente")
    if (analysis.responseTimeHours > 3) patterns.push("Respuesta lenta")
    if (analysis.paymentIssues > 0) patterns.push("Problemas de pago")
    if (analysis.noResponseDays > 3) patterns.push("Días sin pedido")
    if (analysis.satisfactionScore > 2) patterns.push("Cliente satisfecho")
    if (analysis.satisfactionScore < -1) patterns.push("Cliente insatisfecho")
    if (analysis.avgOrderValue > 20000) patterns.push("Alto valor")
    if (analysis.specificOrders > analysis.generalOrders) patterns.push("Prefiere productos específicos")
    if (analysis.generalOrders > analysis.specificOrders) patterns.push("Prefiere pedidos generales")
    analysis.orderPatterns = patterns

    // Calcular puntuación de dificultad
    analysis.difficultyScore =
      (analysis.messagesPerOrder > 2 ? 1 : 0) +
      (analysis.responseTimeHours > 4 ? 2 : 0) +
      analysis.paymentIssues * 3 +
      (analysis.noResponseDays > 3 ? 2 : 0) +
      (analysis.orderFrequency < 1 ? 1 : 0) +
      (analysis.complaints > analysis.compliments ? 2 : 0)

    // Analizar con GPT si está disponible
    let gptAnalysis: GPTAnalysis | null = null
    if (process.env.OPENAI_API_KEY && analysis.totalOrders > 0) {
      try {
        const clientMessages = messages.filter((m) => m.isClient && m.sender === clientName).map((m) => m.content)

        const clientOrders = ordersData.filter((order) => order.client === clientName)
        gptAnalysis = await analyzeWithGPT(analysis, clientMessages, clientOrders)
      } catch (error) {
        console.error(`Error analyzing client ${clientName} with GPT:`, error)
        gptAnalysis = createFallbackAnalysis(analysis)
      }
    } else {
      gptAnalysis = createFallbackAnalysis(analysis)
    }

    return { analysis, gptAnalysis }
  })

  // Esperar a que se completen todos los análisis
  const clientResults = await Promise.all(clientAnalysisPromises)

  // Preparar datos finales manteniendo la estructura original
  const clientsData = clientResults.map(({ analysis, gptAnalysis }) => ({
    "Nombre Cliente": analysis.name,
    "Total Pedidos": analysis.totalOrders,
    "Pedidos Específicos": analysis.specificOrders,
    "Pedidos Generales": analysis.generalOrders,
    "Total Piezas": analysis.totalPieces,
    "Piezas Específicas": analysis.specificPieces,
    "Piezas Generales": analysis.generalPieces,
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
    "Categoría Pedido": order.orderCategory,
    "Tiempo Respuesta (hrs)": order.responseTime,
    "Valor Estimado": order.estimatedValue,
    "Día de la Semana": order.dayOfWeek,
    Hora: order.hour,
  }))

  return {
    totalClients: clients.size,
    totalOrders,
    totalSpecificOrders,
    totalGeneralOrders,
    totalPieces: Array.from(clients.values()).reduce((sum, client) => sum + client.totalPieces, 0),
    totalSpecificPieces,
    totalGeneralPieces,
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
