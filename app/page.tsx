"use client"

import { useState, useEffect } from "react"
import { parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Upload, Download, BarChart3, Users, TrendingUp, AlertTriangle, Star, Plus, Trash2 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend,
} from "recharts"
import { Progress } from "@/components/ui/progress"

export default function WhatsAppAnalyzer() {
  const [conversations, setConversations] = useState("")
  const [allConversations, setAllConversations] = useState<string[]>([])
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [cleanedData, setCleanedData] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{ id: number; preview: string; date: string }>>(
    [],
  )

  const [predictiveAnalysis, setPredictiveAnalysis] = useState<any>(null)
  const [chartData, setChartData] = useState<any>(null)

  // Persistencia automática de datos
  useEffect(() => {
    // Cargar datos guardados al iniciar
    const savedConversations = localStorage.getItem("whatsapp-conversations")
    const savedHistory = localStorage.getItem("whatsapp-history")
    const savedAnalysis = localStorage.getItem("whatsapp-analysis")

    if (savedConversations) {
      setAllConversations(JSON.parse(savedConversations))
    }
    if (savedHistory) {
      setConversationHistory(JSON.parse(savedHistory))
    }
    if (savedAnalysis) {
      setAnalysisData(JSON.parse(savedAnalysis))
    }
  }, [])

  // Guardar automáticamente cuando cambian los datos
  useEffect(() => {
    if (allConversations.length > 0) {
      localStorage.setItem("whatsapp-conversations", JSON.stringify(allConversations))
    }
  }, [allConversations])

  useEffect(() => {
    if (conversationHistory.length > 0) {
      localStorage.setItem("whatsapp-history", JSON.stringify(conversationHistory))
    }
  }, [conversationHistory])

  useEffect(() => {
    if (analysisData) {
      localStorage.setItem("whatsapp-analysis", JSON.stringify(analysisData))
    }
  }, [analysisData])

  // Efecto para limpiar y procesar los datos
  useEffect(() => {
    if (analysisData) {
      try {
        // Crear una copia profunda del objeto analysisData
        const cleanedDataCopy = JSON.parse(JSON.stringify(analysisData))

        // Procesar fechas en clientsData
        if (cleanedDataCopy.clientsData && Array.isArray(cleanedDataCopy.clientsData)) {
          cleanedDataCopy.clientsData = cleanedDataCopy.clientsData.map((client: any) => {
            try {
              if (client["Último Pedido"]) {
                // Intentar convertir la fecha a un objeto Date
                client["Último Pedido"] = parseISO(client["Último Pedido"])
                // Si la fecha no es válida, usar una fecha por defecto
                if (isNaN(client["Último Pedido"].getTime())) {
                  client["Último Pedido"] = new Date()
                }
              } else {
                client["Último Pedido"] = new Date()
              }
            } catch (error) {
              console.warn("Error al procesar la fecha del cliente:", error)
              client["Último Pedido"] = new Date()
            }
            return client
          })
        }

        // Procesar fechas en ordersData
        if (cleanedDataCopy.ordersData && Array.isArray(cleanedDataCopy.ordersData)) {
          cleanedDataCopy.ordersData = cleanedDataCopy.ordersData.map((order: any) => {
            try {
              if (order.Fecha) {
                // Intentar convertir la fecha a un objeto Date
                order.Fecha = parseISO(order.Fecha)
                // Si la fecha no es válida, usar una fecha por defecto
                if (isNaN(order.Fecha.getTime())) {
                  order.Fecha = new Date()
                }
              } else {
                order.Fecha = new Date()
              }
            } catch (error) {
              console.warn("Error al procesar la fecha del pedido:", error)
              order.Fecha = new Date()
            }
            return order
          })
        }

        setCleanedData(cleanedDataCopy)
      } catch (error) {
        console.error("Error al limpiar los datos:", error)
        // En caso de error, usar los datos originales
        setCleanedData(analysisData)
      }
    }
  }, [analysisData])

  // Efecto para procesar datos pesados fuera del ciclo de renderizado
  useEffect(() => {
    if (cleanedData) {
      try {
        // Procesar análisis predictivo
        const analysis = performPredictiveAnalysis(cleanedData)
        setPredictiveAnalysis(analysis)

        // Procesar datos para gráficos
        const charts = prepareChartData(cleanedData)
        setChartData(charts)
      } catch (error) {
        console.error("Error al procesar los datos para análisis:", error)
      }
    }
  }, [cleanedData])

  const handleAddConversation = () => {
    if (!conversations.trim()) {
      alert("Por favor, ingresa una conversación antes de agregarla")
      return
    }

    const newId = Date.now()
    const preview = conversations.substring(0, 100) + "..."
    const date = new Date().toLocaleDateString()

    setAllConversations((prev) => [...prev, conversations])
    setConversationHistory((prev) => [...prev, { id: newId, preview, date }])
    setConversations("")

    alert("Conversación agregada exitosamente")
  }

  const handleRemoveConversation = (index: number) => {
    setAllConversations((prev) => prev.filter((_, i) => i !== index))
    setConversationHistory((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAnalyzeAll = async () => {
    if (allConversations.length === 0) {
      alert("Por favor, agrega al menos una conversación antes de analizar")
      return
    }

    setIsProcessing(true)
    setPredictiveAnalysis(null)
    setChartData(null)
    setCleanedData(null)

    try {
      // Combinar todas las conversaciones
      const combinedConversations = allConversations.join("\n")

      const response = await fetch("/api/analyze-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversations: combinedConversations,
          isAccumulative: true,
          totalConversations: allConversations.length,
        }),
      })

      const data = await response.json()
      setAnalysisData(data)
    } catch (error) {
      console.error("Error analyzing conversations:", error)
      alert("Error al procesar las conversaciones")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearAll = () => {
    if (confirm("¿Estás seguro de que quieres eliminar todas las conversaciones?")) {
      setAllConversations([])
      setConversationHistory([])
      setAnalysisData(null)
      setCleanedData(null)
      setPredictiveAnalysis(null)
      setChartData(null)
      setConversations("")

      // Limpiar también localStorage
      localStorage.removeItem("whatsapp-conversations")
      localStorage.removeItem("whatsapp-history")
      localStorage.removeItem("whatsapp-analysis")
    }
  }

  const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((header) => `"${row[header] || ""}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getDifficultyBadge = (score: number) => {
    if (score >= 6) return <Badge variant="destructive">Muy Difícil</Badge>
    if (score >= 4) return <Badge variant="secondary">Difícil</Badge>
    if (score >= 2) return <Badge variant="outline">Moderado</Badge>
    return <Badge variant="default">Fácil</Badge>
  }

  const getPopularityBadge = (popularity: string) => {
    const variants = {
      "Muy Alta": "default",
      Alta: "secondary",
      Media: "outline",
      Baja: "destructive",
    } as const
    return <Badge variant={variants[popularity as keyof typeof variants] || "outline"}>{popularity}</Badge>
  }

  const getRiskBadge = (riskLevel: string) => {
    const variants = {
      high: "destructive",
      medium: "secondary",
      low: "default",
    } as const
    return (
      <Badge variant={variants[riskLevel as keyof typeof variants] || "outline"}>
        {riskLevel === "high" ? "Alto" : riskLevel === "medium" ? "Medio" : "Bajo"}
      </Badge>
    )
  }

  const getSegmentBadge = (segment: string) => {
    const variants = {
      VIP: "default",
      "En Riesgo": "destructive",
      Regular: "secondary",
      Nuevo: "outline",
    } as const
    return <Badge variant={variants[segment as keyof typeof variants] || "outline"}>{segment}</Badge>
  }

  const getChurnRiskBadge = (churnRisk: string) => {
    const variants = {
      Alto: "destructive",
      Medio: "secondary",
      Bajo: "default",
    } as const
    return <Badge variant={variants[churnRisk as keyof typeof variants] || "outline"}>{churnRisk}</Badge>
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF7C7C"]

  // Funciones de Análisis Predictivo y Segmentación
  const performPredictiveAnalysis = (data: any) => {
    if (!data.clientsData) return null

    // 1. Segmentación automática de clientes
    const clientSegments = segmentClients(data.clientsData)

    // 2. Predicción de demanda mejorada
    const demandPrediction = predictDemand(data.ordersData, data.productsData)

    // 3. Análisis de riesgo de abandono
    const churnRisk = analyzeChurnRisk(data.clientsData)

    // 4. Oportunidades de crecimiento
    const growthOpportunities = identifyGrowthOpportunities(data.clientsData)

    // 5. Análisis de ciclo de vida
    const lifecycleAnalysis = analyzeClientLifecycle(data.clientsData)

    // 6. NUEVO: Análisis CLV para recuperación de clientes
    const recoveryAnalysis = calculateCustomerLifetimeValue(data.clientsData)

    return {
      clientSegments,
      demandPrediction,
      churnRisk,
      growthOpportunities,
      lifecycleAnalysis,
      recoveryAnalysis,
    }
  }

  const segmentClients = (clientsData: any[]) => {
    const segments = {
      vip: [] as any[],
      regular: [] as any[],
      occasional: [] as any[],
      problematic: [] as any[],
      newbie: [] as any[],
    }

    clientsData.forEach((client) => {
      const totalSpent = client["Total Gastado"] || 0
      const frequency = client["Frecuencia Semanal"] || 0
      const difficulty = client["Puntuación Dificultad"] || 0
      const totalOrders = client["Total Pedidos"] || 0
      const satisfaction = client["Puntuación Satisfacción"] || 0

      // Lógica de segmentación
      if (totalSpent > 50000 && frequency > 3 && difficulty < 3) {
        segments.vip.push({ ...client, segment: "VIP", segmentColor: "#10B981" })
      } else if (difficulty > 5 || client["Problemas Pago"] > 1) {
        segments.problematic.push({ ...client, segment: "Problemático", segmentColor: "#EF4444" })
      } else if (totalOrders < 3) {
        segments.newbie.push({ ...client, segment: "Nuevo", segmentColor: "#8B5CF6" })
      } else if (frequency > 2 && totalSpent > 20000) {
        segments.regular.push({ ...client, segment: "Regular", segmentColor: "#3B82F6" })
      } else {
        segments.occasional.push({ ...client, segment: "Ocasional", segmentColor: "#F59E0B" })
      }
    })

    return segments
  }

  const predictDemand = (ordersData: any[], productsData: any[]) => {
    if (!ordersData || ordersData.length === 0) return null

    // Análisis avanzado de tendencias por día de la semana
    const weeklyTrends = Array(7)
      .fill(0)
      .map((_, day) => {
        const dayName = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][day]
        const dayOrders = ordersData.filter((order) => {
          try {
            // Ahora order.Fecha ya es un objeto Date válido
            return order.Fecha.getDay() === day
          } catch (error) {
            console.warn("Error al filtrar por día:", error)
            return false
          }
        })

        if (dayOrders.length === 0) {
          return {
            day: dayName,
            avgDemand: 0,
            orderCount: 0,
            predictedDemand: 0,
            confidence: "Sin datos",
            trend: "Sin datos",
            seasonalFactor: 1,
            recommendations: ["No hay datos históricos para este día"],
          }
        }

        // Calcular tendencia temporal (últimos vs primeros pedidos)
        const sortedOrders = dayOrders.sort((a, b) => a.Fecha.getTime() - b.Fecha.getTime())
        const recentOrders = sortedOrders.slice(-Math.ceil(sortedOrders.length / 3))
        const oldOrders = sortedOrders.slice(0, Math.ceil(sortedOrders.length / 3))

        const recentAvg =
          recentOrders.length > 0
            ? recentOrders.reduce((sum, order) => sum + (order["Total Piezas"] || 0), 0) / recentOrders.length
            : 0
        const oldAvg =
          oldOrders.length > 0
            ? oldOrders.reduce((sum, order) => sum + (order["Total Piezas"] || 0), 0) / oldOrders.length
            : 0

        const trendPercentage = oldAvg > 0 ? ((recentAvg - oldAvg) / oldAvg) * 100 : 0

        // Análisis estacional (por mes)
        const monthlyVariation = dayOrders.reduce((acc, order) => {
          const month = order.Fecha.getMonth()
          if (!acc[month]) acc[month] = []
          acc[month].push(order["Total Piezas"] || 0)
          return acc
        }, {} as any)

        const currentMonth = new Date().getMonth()
        const seasonalFactor = monthlyVariation[currentMonth]
          ? monthlyVariation[currentMonth].reduce((sum: number, val: number) => sum + val, 0) /
              monthlyVariation[currentMonth].length /
              recentAvg || 1
          : 1

        // Cálculos base
        const totalPieces = dayOrders.reduce((sum, order) => sum + (order["Total Piezas"] || 0), 0)
        const avgPieces = totalPieces / dayOrders.length

        // Predicción mejorada con múltiples factores
        let predictedDemand = avgPieces

        // Aplicar tendencia
        if (trendPercentage > 10) {
          predictedDemand *= 1.15 // Crecimiento fuerte
        } else if (trendPercentage > 0) {
          predictedDemand *= 1.05 // Crecimiento moderado
        } else if (trendPercentage < -10) {
          predictedDemand *= 0.9 // Declive
        }

        // Aplicar factor estacional
        predictedDemand *= Math.max(0.7, Math.min(1.3, seasonalFactor))

        // Factor de día específico (lunes suele ser más alto después del fin de semana)
        if (day === 1) {
          // Lunes
          predictedDemand *= 1.1 // 10% más por efecto "lunes"
        } else if (day === 0 || day === 6) {
          // Fin de semana
          predictedDemand *= 0.8 // 20% menos
        }

        // Buffer de seguridad basado en variabilidad
        const variance =
          dayOrders.reduce((sum, order) => {
            const pieces = order["Total Piezas"] || 0
            return sum + Math.pow(pieces - avgPieces, 2)
          }, 0) / dayOrders.length
        const stdDev = Math.sqrt(variance)
        const variabilityBuffer = stdDev / avgPieces > 0.3 ? 1.2 : 1.1

        predictedDemand *= variabilityBuffer

        // Generar recomendaciones específicas
        const recommendations = []
        if (day === 1) {
          // Lunes
          recommendations.push("Preparar 10-15% más que el promedio (efecto post fin de semana)")
          if (trendPercentage > 5) {
            recommendations.push("Tendencia creciente detectada - considerar aumentar producción")
          }
        }
        if (stdDev / avgPieces > 0.4) {
          recommendations.push("Alta variabilidad - mantener stock de seguridad")
        }
        if (seasonalFactor > 1.1) {
          recommendations.push("Mes de alta demanda - aumentar producción base")
        } else if (seasonalFactor < 0.9) {
          recommendations.push("Mes de baja demanda - reducir producción base")
        }

        return {
          day: dayName,
          avgDemand: Math.round(avgPieces),
          orderCount: dayOrders.length,
          predictedDemand: Math.round(predictedDemand),
          confidence: dayOrders.length > 8 ? "Alta" : dayOrders.length > 4 ? "Media" : "Baja",
          trend: trendPercentage > 5 ? "Creciente" : trendPercentage < -5 ? "Declinante" : "Estable",
          trendPercentage: Math.round(trendPercentage),
          seasonalFactor: Math.round(seasonalFactor * 100) / 100,
          variability: Math.round((stdDev / avgPieces) * 100),
          recommendations,
        }
      })

    // Análisis mejorado de productos con predicción individual
    const productTrends =
      productsData?.slice(0, 8).map((product) => {
        const productOrders = ordersData.filter((order) =>
          order.Productos.toLowerCase().includes(product.Producto.toLowerCase()),
        )

        if (productOrders.length < 3) {
          return {
            product: product.Producto,
            currentDemand: product["Total Pedidos"],
            trend: 0,
            predictedGrowth: "Datos insuficientes",
            recommendation: "Recopilar más datos",
            weeklyPrediction: 0,
            confidence: "Baja",
          }
        }

        // Análisis temporal más sofisticado
        const sortedOrders = productOrders.sort((a, b) => a.Fecha.getTime() - b.Fecha.getTime())
        const recentOrders = sortedOrders.slice(-Math.ceil(sortedOrders.length / 3))
        const oldOrders = sortedOrders.slice(0, Math.ceil(sortedOrders.length / 3))

        const recentAvg =
          recentOrders.length > 0
            ? recentOrders.reduce((sum, o) => sum + (o["Total Piezas"] || 0), 0) / recentOrders.length
            : 0
        const oldAvg =
          oldOrders.length > 0 ? oldOrders.reduce((sum, o) => sum + (o["Total Piezas"] || 0), 0) / oldOrders.length : 0

        const trend = oldAvg > 0 ? ((recentAvg - oldAvg) / oldAvg) * 100 : 0

        // Predicción semanal
        const avgWeeklyDemand =
          productOrders.reduce((sum, o) => sum + (o["Total Piezas"] || 0), 0) / Math.max(1, productOrders.length / 7) // Aproximar semanas

        let weeklyPrediction = avgWeeklyDemand
        if (trend > 15) weeklyPrediction *= 1.2
        else if (trend > 5) weeklyPrediction *= 1.1
        else if (trend < -15) weeklyPrediction *= 0.8
        else if (trend < -5) weeklyPrediction *= 0.9

        return {
          product: product.Producto,
          currentDemand: product["Total Pedidos"],
          trend: Math.round(trend),
          predictedGrowth:
            trend > 15
              ? "Crecimiento fuerte"
              : trend > 5
                ? "Crecimiento moderado"
                : trend < -15
                  ? "Declive fuerte"
                  : trend < -5
                    ? "Declive moderado"
                    : "Estable",
          recommendation:
            trend > 15
              ? "Aumentar producción 20%"
              : trend > 5
                ? "Aumentar producción 10%"
                : trend < -15
                  ? "Reducir producción 20%"
                  : trend < -5
                    ? "Reducir producción 10%"
                    : "Mantener nivel actual",
          weeklyPrediction: Math.round(weeklyPrediction),
          confidence: productOrders.length > 10 ? "Alta" : productOrders.length > 5 ? "Media" : "Baja",
        }
      }) || []

    return { weeklyTrends, productTrends }
  }

  const calculateCustomerLifetimeValue = (clientsData: any[]) => {
    if (!clientsData || clientsData.length === 0) return []

    return clientsData
      .map((client) => {
        const totalSpent = client["Total Gastado"] || 0
        const totalOrders = client["Total Pedidos"] || 0
        const frequency = client["Frecuencia Semanal"] || 0
        const avgOrderValue = client["Valor Promedio Pedido"] || 0
        const satisfaction = client["Puntuación Satisfacción"] || 0
        const difficulty = client["Puntuación Dificultad"] || 0
        const paymentIssues = client["Problemas Pago"] || 0

        // Ahora client["Último Pedido"] ya es un objeto Date válido
        const lastOrderDate = client["Último Pedido"]
        const daysSinceLastOrder = Math.floor((new Date().getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))

        // Calcular probabilidad de retención (0-1)
        let retentionProbability = 0.5 // Base 50%

        // Factores positivos
        if (satisfaction > 0) retentionProbability += 0.2
        if (frequency > 2) retentionProbability += 0.15
        if (totalOrders > 5) retentionProbability += 0.1
        if (avgOrderValue > 15000) retentionProbability += 0.1

        // Factores negativos
        if (difficulty > 4) retentionProbability -= 0.2
        if (paymentIssues > 0) retentionProbability -= 0.15
        if (daysSinceLastOrder > 30) retentionProbability -= 0.2
        if (satisfaction < 0) retentionProbability -= 0.25

        // Limitar entre 0.05 y 0.95
        retentionProbability = Math.max(0.05, Math.min(0.95, retentionProbability))

        // Calcular duración esperada de la relación (en semanas)
        const expectedLifetimeWeeks =
          frequency > 0 ? (52 * retentionProbability) / (1 - retentionProbability + 0.01) : 12

        // CLV = Valor promedio por pedido × Frecuencia × Duración esperada × Probabilidad de retención
        const predictedCLV = avgOrderValue * frequency * expectedLifetimeWeeks * retentionProbability

        // Costo estimado de recuperación (basado en dificultad y tiempo sin pedidos)
        let recoveryEffort = 1 // Esfuerzo base
        if (daysSinceLastOrder > 60) recoveryEffort += 2
        if (difficulty > 4) recoveryEffort += 1
        if (paymentIssues > 0) recoveryEffort += 1
        if (satisfaction < 0) recoveryEffort += 2

        const estimatedRecoveryCost = recoveryEffort * 2000 // $2000 por unidad de esfuerzo

        // ROI de recuperación
        const recoveryROI = predictedCLV > 0 ? (predictedCLV - estimatedRecoveryCost) / estimatedRecoveryCost : -1

        // Determinar si vale la pena recuperar
        let worthRecovering = "No"
        let priority = "Baja"
        let strategy = "No recomendado"

        if (recoveryROI > 3) {
          // ROI > 300%
          worthRecovering = "Definitivamente"
          priority = "Alta"
          strategy = "Contacto personal + oferta especial"
        } else if (recoveryROI > 1) {
          // ROI > 100%
          worthRecovering = "Sí"
          priority = "Media"
          strategy = "Llamada telefónica + descuento"
        } else if (recoveryROI > 0.5) {
          // ROI > 50%
          worthRecovering = "Tal vez"
          priority = "Baja"
          strategy = "WhatsApp con promoción"
        } else {
          strategy = "Dejar ir - enfocar recursos en otros clientes"
        }

        // Factores de riesgo específicos
        const riskFactors = []
        if (daysSinceLastOrder > 60) riskFactors.push("Mucho tiempo sin pedidos")
        if (difficulty > 4) riskFactors.push("Cliente difícil de manejar")
        if (paymentIssues > 0) riskFactors.push("Historial de problemas de pago")
        if (satisfaction < 0) riskFactors.push("Baja satisfacción")
        if (frequency < 1) riskFactors.push("Baja frecuencia histórica")

        return {
          client: client["Nombre Cliente"],
          currentValue: totalSpent,
          predictedCLV: Math.round(predictedCLV),
          retentionProbability: Math.round(retentionProbability * 100),
          expectedLifetimeWeeks: Math.round(expectedLifetimeWeeks),
          recoveryROI: Math.round(recoveryROI * 100),
          estimatedRecoveryCost,
          worthRecovering,
          priority,
          strategy,
          riskFactors,
          daysSinceLastOrder,
          quickWins: [
            avgOrderValue > 10000 ? "Cliente de valor medio-alto" : null,
            frequency > 1 ? "Tenía buena frecuencia" : null,
            satisfaction >= 0 ? "Sin problemas de satisfacción" : null,
            paymentIssues === 0 ? "Sin problemas de pago" : null,
          ].filter(Boolean),
        }
      })
      .filter((client) => client.daysSinceLastOrder > 14) // Solo clientes que no han pedido en 2+ semanas
      .sort((a, b) => b.recoveryROI - a.recoveryROI) // Ordenar por ROI descendente
  }

  const analyzeChurnRisk = (clientsData: any[]) => {
    const today = new Date()

    return clientsData
      .map((client) => {
        // Ahora client["Último Pedido"] ya es un objeto Date válido
        const lastOrderDate = client["Último Pedido"]
        const daysSinceLastOrder = Math.floor((today.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        const frequency = client["Frecuencia Semanal"] || 0
        const expectedDays = frequency > 0 ? 7 / frequency : 30

        let riskLevel = "Bajo"
        let riskScore = 0

        // Calcular score de riesgo
        if (daysSinceLastOrder > expectedDays * 2) riskScore += 3
        if (client["Puntuación Satisfacción"] < 0) riskScore += 2
        if (client["Problemas Pago"] > 0) riskScore += 2
        if (frequency < 1) riskScore += 1
        if (client["Puntuación Dificultad"] > 5) riskScore += 1

        if (riskScore >= 6) riskLevel = "Alto"
        else if (riskScore >= 3) riskLevel = "Medio"

        return {
          client: client["Nombre Cliente"],
          riskLevel,
          riskScore,
          daysSinceLastOrder,
          expectedDays: Math.round(expectedDays),
          reasons: [
            daysSinceLastOrder > expectedDays * 2 ? "Tiempo excesivo sin pedidos" : null,
            client["Puntuación Satisfacción"] < 0 ? "Baja satisfacción" : null,
            client["Problemas Pago"] > 0 ? "Problemas de pago" : null,
            frequency < 1 ? "Baja frecuencia histórica" : null,
          ].filter(Boolean),
          recommendation:
            riskLevel === "Alto"
              ? "Contactar inmediatamente"
              : riskLevel === "Medio"
                ? "Seguimiento semanal"
                : "Monitoreo regular",
        }
      })
      .filter((client) => client.riskLevel !== "Bajo")
      .sort((a, b) => b.riskScore - a.riskScore)
  }

  const identifyGrowthOpportunities = (clientsData: any[]) => {
    return clientsData
      .map((client) => {
        const totalSpent = client["Total Gastado"] || 0
        const frequency = client["Frecuencia Semanal"] || 0
        const avgOrder = client["Valor Promedio Pedido"] || 0
        const satisfaction = client["Puntuación Satisfacción"] || 0

        const opportunities = []
        let potentialValue = 0

        // Oportunidad de frecuencia
        if (frequency < 2 && satisfaction > 0 && totalSpent > 10000) {
          opportunities.push("Aumentar frecuencia de pedidos")
          potentialValue += avgOrder * 52 // Potencial anual
        }

        // Oportunidad de valor por pedido
        if (avgOrder < 15000 && frequency > 2) {
          opportunities.push("Incrementar valor por pedido")
          potentialValue += 5000 * frequency * 52
        }

        // Oportunidad de productos premium
        if (totalSpent > 30000 && client["Productos Detallados"]?.length < 3) {
          opportunities.push("Diversificar productos")
          potentialValue += avgOrder * 0.3 * frequency * 52
        }

        // Oportunidad de fidelización
        if (satisfaction > 1 && frequency > 3 && totalSpent < 50000) {
          opportunities.push("Programa de fidelización")
          potentialValue += totalSpent * 0.2
        }

        return {
          client: client["Nombre Cliente"],
          currentValue: totalSpent,
          potentialValue: Math.round(potentialValue),
          growthPotential: potentialValue > 0 ? Math.round((potentialValue / Math.max(totalSpent, 1)) * 100) : 0,
          opportunities,
          priority: potentialValue > 50000 ? "Alta" : potentialValue > 20000 ? "Media" : "Baja",
        }
      })
      .filter((client) => client.opportunities.length > 0)
      .sort((a, b) => b.potentialValue - a.potentialValue)
  }

  const analyzeClientLifecycle = (clientsData: any[]) => {
    return clientsData.map((client) => {
      const totalOrders = client["Total Pedidos"] || 0
      const frequency = client["Frecuencia Semanal"] || 0

      // Ahora client["Último Pedido"] ya es un objeto Date válido
      const lastOrderDate = client["Último Pedido"]
      const today = new Date()
      const daysSinceLastOrder = Math.floor((today.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))

      let stage = ""
      let stageColor = ""
      let nextAction = ""

      if (totalOrders < 3) {
        stage = "Nuevo Cliente"
        stageColor = "#8B5CF6"
        nextAction = "Asegurar buena primera experiencia"
      } else if (frequency > 3 && daysSinceLastOrder < 14) {
        stage = "Cliente Activo"
        stageColor = "#10B981"
        nextAction = "Mantener satisfacción y explorar upselling"
      } else if (frequency > 1 && daysSinceLastOrder < 30) {
        stage = "Cliente Regular"
        stageColor = "#3B82F6"
        nextAction = "Incentivar mayor frecuencia"
      } else if (daysSinceLastOrder > 30 && daysSinceLastOrder < 90) {
        stage = "En Riesgo"
        stageColor = "#F59E0B"
        nextAction = "Campaña de reactivación"
      } else {
        stage = "Inactivo"
        stageColor = "#EF4444"
        nextAction = "Evaluar si vale la pena recuperar"
      }

      return {
        client: client["Nombre Cliente"],
        stage,
        stageColor,
        nextAction,
        daysSinceLastOrder,
        totalValue: client["Total Gastado"] || 0,
      }
    })
  }

  const prepareChartData = (data: any) => {
    // Datos para gráfico de productos
    const productChartData =
      data.productsData?.slice(0, 8).map((product: any, index: number) => ({
        name: product.Producto,
        cantidad: product["Total Pedidos"],
        color: COLORS[index % COLORS.length],
      })) || []

    // Datos para gráfico de clientes por valor
    const clientValueData =
      data.clientsData?.slice(0, 10).map((client: any) => ({
        name:
          client["Nombre Cliente"].length > 15
            ? client["Nombre Cliente"].substring(0, 15) + "..."
            : client["Nombre Cliente"],
        valor: client["Total Gastado"],
        pedidos: client["Total Pedidos"],
      })) || []

    // Datos para tendencias horarias
    const hourlyData =
      data.trendsData
        ?.filter((trend: any) => trend.Tipo === "Hora")
        .map((trend: any) => ({
          hora: trend.Periodo,
          actividad: trend.Actividad,
        })) || []

    // Datos para tendencias por día de la semana
    const dailyData =
      data.trendsData
        ?.filter((trend: any) => trend.Tipo === "Día Semana")
        .map((trend: any) => ({
          dia: trend.Periodo,
          actividad: trend.Actividad,
        })) || []

    // Datos para distribución de dificultad
    const difficultyData = [
      {
        name: "Fácil (0-1)",
        value: data.clientsData?.filter((c: any) => c["Puntuación Dificultad"] <= 1).length || 0,
      },
      {
        name: "Moderado (2-3)",
        value:
          data.clientsData?.filter((c: any) => c["Puntuación Dificultad"] >= 2 && c["Puntuación Dificultad"] <= 3)
            .length || 0,
      },
      {
        name: "Difícil (4-5)",
        value:
          data.clientsData?.filter((c: any) => c["Puntuación Dificultad"] >= 4 && c["Puntuación Dificultad"] <= 5)
            .length || 0,
      },
      {
        name: "Muy Difícil (6+)",
        value: data.clientsData?.filter((c: any) => c["Puntuación Dificultad"] >= 6).length || 0,
      },
    ]

    // Datos para distribución de riesgo
    const riskData = [
      {
        name: "Bajo Riesgo",
        value: data.clientsData?.filter((c: any) => c["Nivel de Riesgo"] === "low").length || 0,
      },
      {
        name: "Riesgo Medio",
        value: data.clientsData?.filter((c: any) => c["Nivel de Riesgo"] === "medium").length || 0,
      },
      {
        name: "Alto Riesgo",
        value: data.clientsData?.filter((c: any) => c["Nivel de Riesgo"] === "high").length || 0,
      },
    ]

    return {
      productChartData,
      clientValueData,
      hourlyData,
      dailyData,
      difficultyData,
      riskData,
    }
  }

  const prepareClientChartData = (client: any, data: any) => {
    // Historial de pedidos del cliente
    const clientOrders = data.ordersData?.filter((order: any) => order.Cliente === client["Nombre Cliente"]) || []

    // Agrupar pedidos por mes
    const monthlyOrders = clientOrders.reduce((acc: any, order: any) => {
      // Ahora order.Fecha ya es un objeto Date válido
      const date = order.Fecha
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, pedidos: 0, piezas: 0, valor: 0 }
      }

      acc[monthKey].pedidos += 1
      acc[monthKey].piezas += order["Total Piezas"] || 0
      acc[monthKey].valor += order["Valor Estimado"] || 0

      return acc
    }, {})

    const monthlyData = Object.values(monthlyOrders).sort((a: any, b: any) => a.month.localeCompare(b.month))

    // Productos preferidos del cliente
    const clientProductData =
      client["Productos Detallados"]?.map((product: any, index: number) => ({
        name: product.product,
        cantidad: product.count,
        porcentaje: product.percentage,
        color: COLORS[index % COLORS.length],
      })) || []

    return {
      monthlyData,
      clientProductData,
    }
  }

  // Función para formatear fechas para mostrar en la UI
  const formatDate = (date: Date) => {
    if (!date) return "N/A"
    try {
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch (error) {
      console.warn("Error al formatear fecha:", error)
      return "Fecha inválida"
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">Analizador de WhatsApp - Panadería Quilantán</h1>
        <p className="text-muted-foreground text-center">
          Analiza conversaciones de WhatsApp para obtener insights de ventas y comportamiento de clientes
        </p>
      </div>

      <div className="grid gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Gestionar Conversaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Pega aquí las conversaciones de WhatsApp exportadas...&#10;&#10;Ejemplo:&#10;[7:37 AM, 3/7/2025] Panaderia Quilantan: B días panadería Quilantan cuántas piezas le enviamos hoy gracias&#10;[10:19 AM, 3/7/2025] Abts Emilio: 2 pastelitos 1 donas 2 bisquete..."
              value={conversations}
              onChange={(e) => setConversations(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />

            <div className="flex gap-2">
              <Button
                onClick={handleAddConversation}
                disabled={!conversations.trim()}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Conversación
              </Button>

              <Button
                onClick={handleAnalyzeAll}
                disabled={isProcessing || allConversations.length === 0}
                variant="default"
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                {isProcessing ? "Analizando..." : `Analizar Todo (${allConversations.length})`}
              </Button>

              <Button
                onClick={handleClearAll}
                disabled={allConversations.length === 0}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Limpiar Todo
              </Button>

              <Button
                onClick={() => {
                  const saved = localStorage.getItem("whatsapp-conversations")
                  if (saved) {
                    const conversations = JSON.parse(saved)
                    setAllConversations(conversations)
                    alert(`Recuperados ${conversations.length} conversaciones guardadas`)
                  } else {
                    alert("No hay datos guardados para recuperar")
                  }
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Recuperar Datos Guardados
              </Button>
            </div>

            {/* Historial de conversaciones */}
            {conversationHistory.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Conversaciones Agregadas ({conversationHistory.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {conversationHistory.map((conv, index) => (
                    <div key={conv.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                      <div className="flex-1">
                        <span className="font-medium">Conversación {index + 1}</span>
                        <span className="text-muted-foreground ml-2">({conv.date})</span>
                        <p className="text-xs text-muted-foreground truncate mt-1">{conv.preview}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveConversation(index)}
                        className="ml-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {analysisData && (
          <>
            {!cleanedData ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p>Procesando y validando datos...</p>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-8">
                  <TabsTrigger value="overview">Resumen General</TabsTrigger>
                  <TabsTrigger value="visualizations">Visualizaciones</TabsTrigger>
                  <TabsTrigger value="clients">Todos los Clientes</TabsTrigger>
                  <TabsTrigger value="individual">Análisis Individual</TabsTrigger>
                  <TabsTrigger value="gpt-insights">Insights IA</TabsTrigger>
                  <TabsTrigger value="products">Productos</TabsTrigger>
                  <TabsTrigger value="trends">Tendencias</TabsTrigger>
                  <TabsTrigger value="export">Exportar</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  {/* Métricas principales */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-2xl font-bold">{cleanedData.totalClients || 0}</p>
                            <p className="text-sm text-muted-foreground">Clientes Únicos</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-2xl font-bold">{cleanedData.totalSpecificOrders || 0}</p>
                            <p className="text-sm text-muted-foreground">Pedidos Específicos</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-2xl font-bold">{cleanedData.totalGeneralOrders || 0}</p>
                            <p className="text-sm text-muted-foreground">Pedidos Generales</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                          <div>
                            <p className="text-2xl font-bold">{cleanedData.totalSpecificPieces || 0}</p>
                            <p className="text-sm text-muted-foreground">Piezas Específicas</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-orange-600" />
                          <div>
                            <p className="text-2xl font-bold">{cleanedData.totalGeneralPieces || 0}</p>
                            <p className="text-sm text-muted-foreground">Piezas Generales</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Análisis general del negocio */}
                  <Card>
                    <CardHeader>
                      <CardTitle>📊 Análisis General del Negocio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3 text-blue-600">Rendimiento de Clientes</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Clientes frecuentes (&gt;4 pedidos/semana):</span>
                              <Badge variant="default">
                                {cleanedData.clientsData?.filter((c: any) => c["Frecuencia Semanal"] > 4).length || 0}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Clientes de alto valor (&gt;$50k):</span>
                              <Badge variant="secondary">
                                {cleanedData.clientsData?.filter((c: any) => c["Total Gastado"] > 50000).length || 0}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Clientes con problemas de pago:</span>
                              <Badge variant="destructive">
                                {cleanedData.clientsData?.filter((c: any) => c["Problemas Pago"] > 0).length || 0}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3 text-green-600">Satisfacción y Comunicación</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Clientes satisfechos:</span>
                              <Badge variant="default">
                                {cleanedData.clientsData?.filter((c: any) => c["Puntuación Satisfacción"] > 0).length ||
                                  0}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Respuesta lenta (&gt;4h):</span>
                              <Badge variant="outline">
                                {cleanedData.clientsData?.filter((c: any) => c["Tiempo Respuesta (hrs)"] > 4).length ||
                                  0}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Clientes difíciles (score &gt;4):</span>
                              <Badge variant="secondary">
                                {cleanedData.clientsData?.filter((c: any) => c["Puntuación Dificultad"] > 4).length ||
                                  0}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3 text-purple-600">Métricas de Negocio</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Ingresos totales estimados:</span>
                              <Badge variant="default">
                                $
                                {cleanedData.clientsData
                                  ?.reduce((sum: number, c: any) => sum + (c["Total Gastado"] || 0), 0)
                                  .toLocaleString()}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Valor promedio por cliente:</span>
                              <Badge variant="secondary">
                                $
                                {Math.round(
                                  cleanedData.clientsData?.reduce(
                                    (sum: number, c: any) => sum + (c["Total Gastado"] || 0),
                                    0,
                                  ) / (cleanedData.totalClients || 1),
                                ).toLocaleString()}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Pedidos promedio por cliente:</span>
                              <Badge variant="outline">
                                {Math.round(((cleanedData.totalOrders || 0) / (cleanedData.totalClients || 1)) * 10) /
                                  10}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Desglose por Tipo de Pedido */}
                  <Card>
                    <CardHeader>
                      <CardTitle>📊 Desglose por Tipo de Pedido</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3 text-green-600">Pedidos Específicos</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Total de pedidos específicos:</span>
                              <Badge variant="default">{cleanedData.totalSpecificOrders || 0}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Porcentaje del total:</span>
                              <Badge variant="secondary">
                                {cleanedData.totalOrders > 0
                                  ? Math.round(((cleanedData.totalSpecificOrders || 0) / cleanedData.totalOrders) * 100)
                                  : 0}
                                %
                              </Badge>
                            </div>
                            <Progress
                              value={
                                cleanedData.totalOrders > 0
                                  ? ((cleanedData.totalSpecificOrders || 0) / cleanedData.totalOrders) * 100
                                  : 0
                              }
                              className="h-2"
                            />
                            <p className="text-xs text-muted-foreground">
                              Productos específicos como donas, conchas, pastelitos, etc.
                            </p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3 text-blue-600">Pedidos Generales</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Total de pedidos generales:</span>
                              <Badge variant="default">{cleanedData.totalGeneralOrders || 0}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Porcentaje del total:</span>
                              <Badge variant="secondary">
                                {cleanedData.totalOrders > 0
                                  ? Math.round(((cleanedData.totalGeneralOrders || 0) / cleanedData.totalOrders) * 100)
                                  : 0}
                                %
                              </Badge>
                            </div>
                            <Progress
                              value={
                                cleanedData.totalOrders > 0
                                  ? ((cleanedData.totalGeneralOrders || 0) / cleanedData.totalOrders) * 100
                                  : 0
                              }
                              className="h-2"
                            />
                            <p className="text-xs text-muted-foreground">
                              Pedidos de "piezas", "surtido" o "panes" sin especificar producto.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2">💡 Insights de Categorización:</h4>
                        <ul className="text-sm space-y-1">
                          <li>
                            • <strong>Ratio Específico/General:</strong>{" "}
                            {cleanedData.totalGeneralOrders > 0
                              ? Math.round(
                                  ((cleanedData.totalSpecificOrders || 0) / (cleanedData.totalGeneralOrders || 1)) *
                                    100,
                                ) / 100
                              : "N/A"}
                          </li>
                          <li>
                            • <strong>Piezas promedio por pedido específico:</strong>{" "}
                            {cleanedData.totalSpecificOrders > 0
                              ? Math.round(
                                  ((cleanedData.totalSpecificPieces || 0) / (cleanedData.totalSpecificOrders || 1)) *
                                    10,
                                ) / 10
                              : 0}
                          </li>
                          <li>
                            • <strong>Piezas promedio por pedido general:</strong>{" "}
                            {cleanedData.totalGeneralOrders > 0
                              ? Math.round(
                                  ((cleanedData.totalGeneralPieces || 0) / (cleanedData.totalGeneralOrders || 1)) * 10,
                                ) / 10
                              : 0}
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top insights */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-yellow-500" />
                          Top 5 Mejores Clientes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {cleanedData.clientsData?.slice(0, 5).map((client: any, index: number) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                            <div>
                              <p className="font-medium">{client["Nombre Cliente"]}</p>
                              <p className="text-xs text-muted-foreground">
                                {client["Total Pedidos"]} pedidos · {client["Frecuencia Semanal"]} pedidos/semana
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">${client["Total Gastado"]?.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">
                                Último pedido: {formatDate(client["Último Pedido"])}
                              </p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          Top 5 Clientes en Riesgo
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {predictiveAnalysis?.churnRisk?.slice(0, 5).map((client: any, index: number) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                            <div>
                              <p className="font-medium">{client.client}</p>
                              <p className="text-xs text-muted-foreground">
                                {client.daysSinceLastOrder} días sin pedidos · {client.reasons.join(", ")}
                              </p>
                            </div>
                            <div className="text-right">
                              {getRiskBadge(client.riskLevel)}
                              <p className="text-xs text-muted-foreground mt-1">{client.recommendation}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="visualizations" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gráfico de productos más populares */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Productos Más Populares</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData?.productChartData || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="cantidad" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Gráfico de clientes por valor */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Top Clientes por Valor</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData?.clientValueData || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="valor" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Gráfico de tendencias horarias */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Tendencias Horarias</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData?.hourlyData || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="hora" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="actividad" stroke="#8884d8" />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Gráfico de tendencias por día */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Tendencias por Día</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData?.dailyData || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="dia" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="actividad" fill="#ffc658" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Gráfico de distribución de dificultad */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Distribución de Dificultad</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData?.difficultyData || []}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {chartData?.difficultyData?.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Gráfico de distribución de riesgo */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Distribución de Riesgo</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData?.riskData || []}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {chartData?.riskData?.map((entry: any, index: number) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    entry.name === "Alto Riesgo"
                                      ? "#ef4444"
                                      : entry.name === "Riesgo Medio"
                                        ? "#f59e0b"
                                        : "#10b981"
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="clients" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Todos los Clientes ({cleanedData.clientsData?.length || 0})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Total Gastado</TableHead>
                              <TableHead>Pedidos</TableHead>
                              <TableHead>Frecuencia</TableHead>
                              <TableHead>Último Pedido</TableHead>
                              <TableHead>Dificultad</TableHead>
                              <TableHead>Segmento</TableHead>
                              <TableHead>Riesgo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cleanedData.clientsData?.map((client: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{client["Nombre Cliente"]}</TableCell>
                                <TableCell>${client["Total Gastado"]?.toLocaleString()}</TableCell>
                                <TableCell>{client["Total Pedidos"]}</TableCell>
                                <TableCell>{client["Frecuencia Semanal"]} / semana</TableCell>
                                <TableCell>{formatDate(client["Último Pedido"])}</TableCell>
                                <TableCell>{getDifficultyBadge(client["Puntuación Dificultad"])}</TableCell>
                                <TableCell>
                                  {getSegmentBadge(
                                    predictiveAnalysis?.clientSegments?.vip?.find(
                                      (c: any) => c["Nombre Cliente"] === client["Nombre Cliente"],
                                    )
                                      ? "VIP"
                                      : predictiveAnalysis?.clientSegments?.problematic?.find(
                                            (c: any) => c["Nombre Cliente"] === client["Nombre Cliente"],
                                          )
                                        ? "En Riesgo"
                                        : predictiveAnalysis?.clientSegments?.regular?.find(
                                              (c: any) => c["Nombre Cliente"] === client["Nombre Cliente"],
                                            )
                                          ? "Regular"
                                          : "Nuevo",
                                  )}
                                </TableCell>
                                <TableCell>
                                  {getChurnRiskBadge(
                                    predictiveAnalysis?.churnRisk?.find(
                                      (c: any) => c.client === client["Nombre Cliente"],
                                    )?.riskLevel === "Alto"
                                      ? "Alto"
                                      : predictiveAnalysis?.churnRisk?.find(
                                            (c: any) => c.client === client["Nombre Cliente"],
                                          )?.riskLevel === "Medio"
                                        ? "Medio"
                                        : "Bajo",
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="individual" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Análisis Individual de Clientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="client-0" className="w-full">
                        <TabsList className="flex flex-wrap h-auto">
                          {cleanedData.clientsData?.slice(0, 10).map((client: any, index: number) => (
                            <TabsTrigger key={index} value={`client-${index}`} className="mb-1">
                              {client["Nombre Cliente"]}
                            </TabsTrigger>
                          ))}
                        </TabsList>

                        {cleanedData.clientsData?.slice(0, 10).map((client: any, index: number) => {
                          const clientChartData = prepareClientChartData(client, cleanedData)

                          return (
                            <TabsContent key={index} value={`client-${index}`} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">Información General</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-sm font-medium">Total Gastado:</span>
                                        <span>${client["Total Gastado"]?.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm font-medium">Total Pedidos:</span>
                                        <span>{client["Total Pedidos"]}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm font-medium">Frecuencia:</span>
                                        <span>{client["Frecuencia Semanal"]} pedidos/semana</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm font-medium">Último Pedido:</span>
                                        <span>{formatDate(client["Último Pedido"])}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm font-medium">Dificultad:</span>
                                        <span>{getDifficultyBadge(client["Puntuación Dificultad"])}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm font-medium">Problemas de Pago:</span>
                                        <span>{client["Problemas Pago"] || 0}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm font-medium">Satisfacción:</span>
                                        <span>{client["Puntuación Satisfacción"] || 0}</span>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">Productos Preferidos</CardTitle>
                                  </CardHeader>
                                  <CardContent className="h-60">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                        <Pie
                                          data={clientChartData.clientProductData || []}
                                          cx="50%"
                                          cy="50%"
                                          labelLine={false}
                                          outerRadius={60}
                                          fill="#8884d8"
                                          dataKey="cantidad"
                                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        >
                                          {clientChartData.clientProductData?.map((entry: any, i: number) => (
                                            <Cell key={`cell-${i}`} fill={entry.color} />
                                          ))}
                                        </Pie>
                                        <Tooltip />
                                      </PieChart>
                                    </ResponsiveContainer>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">Análisis de Riesgo</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-4">
                                      <div>
                                        <div className="flex justify-between mb-1">
                                          <span className="text-sm font-medium">Riesgo de Abandono:</span>
                                          <span>
                                            {getChurnRiskBadge(
                                              predictiveAnalysis?.churnRisk?.find(
                                                (c: any) => c.client === client["Nombre Cliente"],
                                              )?.riskLevel === "Alto"
                                                ? "Alto"
                                                : predictiveAnalysis?.churnRisk?.find(
                                                      (c: any) => c.client === client["Nombre Cliente"],
                                                    )?.riskLevel === "Medio"
                                                  ? "Medio"
                                                  : "Bajo",
                                            )}
                                          </span>
                                        </div>
                                        <Progress
                                          value={
                                            predictiveAnalysis?.churnRisk?.find(
                                              (c: any) => c.client === client["Nombre Cliente"],
                                            )?.riskScore * 10 || 0
                                          }
                                          className="h-2"
                                        />
                                      </div>

                                      <div>
                                        <div className="flex justify-between mb-1">
                                          <span className="text-sm font-medium">Valor de Vida del Cliente:</span>
                                          <span>
                                            $
                                            {predictiveAnalysis?.recoveryAnalysis
                                              ?.find((c: any) => c.client === client["Nombre Cliente"])
                                              ?.predictedCLV?.toLocaleString() || "N/A"}
                                          </span>
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex justify-between mb-1">
                                          <span className="text-sm font-medium">Segmento:</span>
                                          <span>
                                            {getSegmentBadge(
                                              predictiveAnalysis?.clientSegments?.vip?.find(
                                                (c: any) => c["Nombre Cliente"] === client["Nombre Cliente"],
                                              )
                                                ? "VIP"
                                                : predictiveAnalysis?.clientSegments?.problematic?.find(
                                                      (c: any) => c["Nombre Cliente"] === client["Nombre Cliente"],
                                                    )
                                                  ? "En Riesgo"
                                                  : predictiveAnalysis?.clientSegments?.regular?.find(
                                                        (c: any) => c["Nombre Cliente"] === client["Nombre Cliente"],
                                                      )
                                                    ? "Regular"
                                                    : "Nuevo",
                                            )}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="text-sm">
                                        <p className="font-medium mb-1">Recomendación:</p>
                                        <p className="text-muted-foreground">
                                          {predictiveAnalysis?.churnRisk?.find(
                                            (c: any) => c.client === client["Nombre Cliente"],
                                          )?.recommendation ||
                                            predictiveAnalysis?.recoveryAnalysis?.find(
                                              (c: any) => c.client === client["Nombre Cliente"],
                                            )?.strategy ||
                                            "Mantener comunicación regular"}
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>

                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-lg">Historial de Pedidos</CardTitle>
                                </CardHeader>
                                <CardContent className="h-80">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={clientChartData.monthlyData || []}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="month" />
                                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                      <Tooltip />
                                      <Legend />
                                      <Area
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="pedidos"
                                        stroke="#8884d8"
                                        fill="#8884d8"
                                        name="Pedidos"
                                      />
                                      <Area
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="valor"
                                        stroke="#82ca9d"
                                        fill="#82ca9d"
                                        name="Valor ($)"
                                      />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </CardContent>
                              </Card>
                            </TabsContent>
                          )
                        })}
                      </Tabs>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="gpt-insights" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Análisis Predictivo y Segmentación</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="segments" className="w-full">
                        <TabsList className="grid w-full grid-cols-5">
                          <TabsTrigger value="segments">Segmentación</TabsTrigger>
                          <TabsTrigger value="demand">Predicción de Demanda</TabsTrigger>
                          <TabsTrigger value="churn">Riesgo de Abandono</TabsTrigger>
                          <TabsTrigger value="growth">Oportunidades</TabsTrigger>
                          <TabsTrigger value="recovery">Recuperación</TabsTrigger>
                        </TabsList>

                        <TabsContent value="segments" className="space-y-4 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                              <CardHeader className="bg-green-50 dark:bg-green-900/20">
                                <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                                  <Star className="h-5 w-5" />
                                  Clientes VIP ({predictiveAnalysis?.clientSegments?.vip?.length || 0})
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-4">
                                <div className="space-y-3">
                                  {predictiveAnalysis?.clientSegments?.vip
                                    ?.slice(0, 5)
                                    .map((client: any, i: number) => (
                                      <div key={i} className="flex justify-between items-center border-b pb-2">
                                        <div>
                                          <p className="font-medium">{client["Nombre Cliente"]}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {client["Total Pedidos"]} pedidos · $
                                            {client["Total Gastado"]?.toLocaleString()}
                                          </p>
                                        </div>
                                        <Badge variant="default">VIP</Badge>
                                      </div>
                                    ))}
                                </div>
                                <div className="mt-4 p-3 bg-muted rounded-lg">
                                  <h4 className="font-semibold mb-1">Estrategia Recomendada:</h4>
                                  <p className="text-sm">
                                    Programa de fidelización exclusivo, atención personalizada y ofertas especiales para
                                    mantener su lealtad.
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
                                <CardTitle className="text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                  <Users className="h-5 w-5" />
                                  Clientes Regulares ({predictiveAnalysis?.clientSegments?.regular?.length || 0})
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-4">
                                <div className="space-y-3">
                                  {predictiveAnalysis?.clientSegments?.regular
                                    ?.slice(0, 5)
                                    .map((client: any, i: number) => (
                                      <div key={i} className="flex justify-between items-center border-b pb-2">
                                        <div>
                                          <p className="font-medium">{client["Nombre Cliente"]}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {client["Total Pedidos"]} pedidos · $
                                            {client["Total Gastado"]?.toLocaleString()}
                                          </p>
                                        </div>
                                        <Badge variant="secondary">Regular</Badge>
                                      </div>
                                    ))}
                                </div>
                                <div className="mt-4 p-3 bg-muted rounded-lg">
                                  <h4 className="font-semibold mb-1">Estrategia Recomendada:</h4>
                                  <p className="text-sm">
                                    Incentivar mayor frecuencia de compra y aumentar el valor promedio por pedido con
                                    promociones específicas.
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader className="bg-red-50 dark:bg-red-900/20">
                                <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5" />
                                  Clientes en Riesgo ({predictiveAnalysis?.clientSegments?.problematic?.length || 0})
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-4">
                                <div className="space-y-3">
                                  {predictiveAnalysis?.clientSegments?.problematic
                                    ?.slice(0, 5)
                                    .map((client: any, i: number) => (
                                      <div key={i} className="flex justify-between items-center border-b pb-2">
                                        <div>
                                          <p className="font-medium">{client["Nombre Cliente"]}</p>
                                          <p className="text-xs text-muted-foreground">
                                            Dificultad: {client["Puntuación Dificultad"]} · Problemas pago:{" "}
                                            {client["Problemas Pago"]}
                                          </p>
                                        </div>
                                        <Badge variant="destructive">En Riesgo</Badge>
                                      </div>
                                    ))}
                                </div>
                                <div className="mt-4 p-3 bg-muted rounded-lg">
                                  <h4 className="font-semibold mb-1">Estrategia Recomendada:</h4>
                                  <p className="text-sm">
                                    Evaluar si vale la pena mantener la relación. Para los que sí, establecer límites
                                    claros y mejorar la comunicación.
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          <Card>
                            <CardHeader>
                              <CardTitle>Distribución de Segmentos</CardTitle>
                            </CardHeader>
                            <CardContent className="h-80">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={[
                                      {
                                        name: "VIP",
                                        value: predictiveAnalysis?.clientSegments?.vip?.length || 0,
                                        color: "#10B981",
                                      },
                                      {
                                        name: "Regular",
                                        value: predictiveAnalysis?.clientSegments?.regular?.length || 0,
                                        color: "#3B82F6",
                                      },
                                      {
                                        name: "Ocasional",
                                        value: predictiveAnalysis?.clientSegments?.occasional?.length || 0,
                                        color: "#F59E0B",
                                      },
                                      {
                                        name: "Problemático",
                                        value: predictiveAnalysis?.clientSegments?.problematic?.length || 0,
                                        color: "#EF4444",
                                      },
                                      {
                                        name: "Nuevo",
                                        value: predictiveAnalysis?.clientSegments?.newbie?.length || 0,
                                        color: "#8B5CF6",
                                      },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={120}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                  >
                                    {[
                                      { name: "VIP", color: "#10B981" },
                                      { name: "Regular", color: "#3B82F6" },
                                      { name: "Ocasional", color: "#F59E0B" },
                                      { name: "Problemático", color: "#EF4444" },
                                      { name: "Nuevo", color: "#8B5CF6" },
                                    ].map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="demand" className="space-y-4 pt-4">
                          <Card>
                            <CardHeader>
                              <CardTitle>Predicción de Demanda por Día de la Semana</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Día</TableHead>
                                      <TableHead>Demanda Histórica</TableHead>
                                      <TableHead>Predicción</TableHead>
                                      <TableHead>Tendencia</TableHead>
                                      <TableHead>Confianza</TableHead>
                                      <TableHead>Recomendación</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {predictiveAnalysis?.demandPrediction?.weeklyTrends?.map(
                                      (day: any, index: number) => (
                                        <TableRow key={index}>
                                          <TableCell className="font-medium">{day.day}</TableCell>
                                          <TableCell>{day.avgDemand} piezas</TableCell>
                                          <TableCell className="font-bold">{day.predictedDemand} piezas</TableCell>
                                          <TableCell>
                                            <Badge
                                              variant={
                                                day.trend === "Creciente"
                                                  ? "default"
                                                  : day.trend === "Declinante"
                                                    ? "destructive"
                                                    : "secondary"
                                              }
                                            >
                                              {day.trend}
                                              {day.trendPercentage
                                                ? ` (${day.trendPercentage > 0 ? "+" : ""}${day.trendPercentage}%)`
                                                : ""}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>{getPopularityBadge(day.confidence)}</TableCell>
                                          <TableCell className="max-w-[200px]">
                                            <ul className="text-xs list-disc pl-4">
                                              {day.recommendations?.slice(0, 2).map((rec: string, i: number) => (
                                                <li key={i}>{rec}</li>
                                              ))}
                                            </ul>
                                          </TableCell>
                                        </TableRow>
                                      ),
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle>Predicción de Demanda por Producto</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Producto</TableHead>
                                      <TableHead>Demanda Actual</TableHead>
                                      <TableHead>Predicción Semanal</TableHead>
                                      <TableHead>Tendencia</TableHead>
                                      <TableHead>Recomendación</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {predictiveAnalysis?.demandPrediction?.productTrends?.map(
                                      (product: any, index: number) => (
                                        <TableRow key={index}>
                                          <TableCell className="font-medium">{product.product}</TableCell>
                                          <TableCell>{product.currentDemand}</TableCell>
                                          <TableCell className="font-bold">{product.weeklyPrediction}</TableCell>
                                          <TableCell>
                                            <Badge
                                              variant={
                                                product.trend > 5
                                                  ? "default"
                                                  : product.trend < -5
                                                    ? "destructive"
                                                    : "secondary"
                                              }
                                            >
                                              {product.predictedGrowth}
                                              {product.trend
                                                ? ` (${product.trend > 0 ? "+" : ""}${product.trend}%)`
                                                : ""}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>{product.recommendation}</TableCell>
                                        </TableRow>
                                      ),
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle>Visualización de Predicciones</CardTitle>
                            </CardHeader>
                            <CardContent className="h-80">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={predictiveAnalysis?.demandPrediction?.weeklyTrends?.map((day: any) => ({
                                    name: day.day,
                                    actual: day.avgDemand,
                                    predicted: day.predictedDemand,
                                  }))}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Bar dataKey="actual" fill="#8884d8" name="Demanda Histórica" />
                                  <Bar dataKey="predicted" fill="#82ca9d" name="Predicción" />
                                </BarChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="churn" className="space-y-4 pt-4">
                          <Card>
                            <CardHeader>
                              <CardTitle>Clientes en Riesgo de Abandono</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Cliente</TableHead>
                                      <TableHead>Nivel de Riesgo</TableHead>
                                      <TableHead>Días sin Pedidos</TableHead>
                                      <TableHead>Razones</TableHead>
                                      <TableHead>Recomendación</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {predictiveAnalysis?.churnRisk?.map((client: any, index: number) => (
                                      <TableRow key={index}>
                                        <TableCell className="font-medium">{client.client}</TableCell>
                                        <TableCell>{getRiskBadge(client.riskLevel)}</TableCell>
                                        <TableCell>
                                          {client.daysSinceLastOrder}{" "}
                                          <span className="text-xs text-muted-foreground">
                                            (esperado: {client.expectedDays})
                                          </span>
                                        </TableCell>
                                        <TableCell>
                                          <ul className="text-xs list-disc pl-4">
                                            {client.reasons.map((reason: string, i: number) => (
                                              <li key={i}>{reason}</li>
                                            ))}
                                          </ul>
                                        </TableCell>
                                        <TableCell>{client.recommendation}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </CardContent>
                          </Card>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                              <CardHeader>
                                <CardTitle>Distribución de Riesgo</CardTitle>
                              </CardHeader>
                              <CardContent className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={[
                                        {
                                          name: "Alto Riesgo",
                                          value:
                                            predictiveAnalysis?.churnRisk?.filter((c: any) => c.riskLevel === "Alto")
                                              .length || 0,
                                        },
                                        {
                                          name: "Riesgo Medio",
                                          value:
                                            predictiveAnalysis?.churnRisk?.filter((c: any) => c.riskLevel === "Medio")
                                              .length || 0,
                                        },
                                        {
                                          name: "Bajo Riesgo",
                                          value:
                                            (cleanedData.clientsData?.length || 0) -
                                            (predictiveAnalysis?.churnRisk?.length || 0),
                                        },
                                      ]}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      outerRadius={120}
                                      fill="#8884d8"
                                      dataKey="value"
                                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                      <Cell fill="#ef4444" />
                                      <Cell fill="#f59e0b" />
                                      <Cell fill="#10b981" />
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle>Factores de Riesgo Principales</CardTitle>
                              </CardHeader>
                              <CardContent className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={[
                                      {
                                        name: "Tiempo sin pedidos",
                                        count:
                                          predictiveAnalysis?.churnRisk?.filter((c: any) =>
                                            c.reasons.some((r: string) => r.includes("Tiempo")),
                                          ).length || 0,
                                      },
                                      {
                                        name: "Baja satisfacción",
                                        count:
                                          predictiveAnalysis?.churnRisk?.filter((c: any) =>
                                            c.reasons.some((r: string) => r.includes("satisfacción")),
                                          ).length || 0,
                                      },
                                      {
                                        name: "Problemas de pago",
                                        count:
                                          predictiveAnalysis?.churnRisk?.filter((c: any) =>
                                            c.reasons.some((r: string) => r.includes("pago")),
                                          ).length || 0,
                                      },
                                      {
                                        name: "Baja frecuencia",
                                        count:
                                          predictiveAnalysis?.churnRisk?.filter((c: any) =>
                                            c.reasons.some((r: string) => r.includes("frecuencia")),
                                          ).length || 0,
                                      },
                                    ]}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#ef4444" name="Clientes afectados" />
                                  </BarChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>
                          </div>
                        </TabsContent>

                        <TabsContent value="growth" className="space-y-4 pt-4">
                          <Card>
                            <CardHeader>
                              <CardTitle>Oportunidades de Crecimiento</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Cliente</TableHead>
                                      <TableHead>Valor Actual</TableHead>
                                      <TableHead>Potencial</TableHead>
                                      <TableHead>Crecimiento</TableHead>
                                      <TableHead>Oportunidades</TableHead>
                                      <TableHead>Prioridad</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {predictiveAnalysis?.growthOpportunities?.map((client: any, index: number) => (
                                      <TableRow key={index}>
                                        <TableCell className="font-medium">{client.client}</TableCell>
                                        <TableCell>${client.currentValue?.toLocaleString()}</TableCell>
                                        <TableCell>${client.potentialValue?.toLocaleString()}</TableCell>
                                        <TableCell>+{client.growthPotential}%</TableCell>
                                        <TableCell>
                                          <ul className="text-xs list-disc pl-4">
                                            {client.opportunities.map((opp: string, i: number) => (
                                              <li key={i}>{opp}</li>
                                            ))}
                                          </ul>
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            variant={
                                              client.priority === "Alta"
                                                ? "default"
                                                : client.priority === "Media"
                                                  ? "secondary"
                                                  : "outline"
                                            }
                                          >
                                            {client.priority}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </CardContent>
                          </Card>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                              <CardHeader>
                                <CardTitle>Potencial de Crecimiento por Cliente</CardTitle>
                              </CardHeader>
                              <CardContent className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={predictiveAnalysis?.growthOpportunities?.slice(0, 10).map((client: any) => ({
                                      name:
                                        client.client.length > 15
                                          ? client.client.substring(0, 15) + "..."
                                          : client.client,
                                      actual: client.currentValue,
                                      potential: client.potentialValue,
                                    }))}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="actual" fill="#8884d8" name="Valor Actual" />
                                    <Bar dataKey="potential" fill="#82ca9d" name="Potencial" />
                                  </BarChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle>Tipos de Oportunidades</CardTitle>
                              </CardHeader>
                              <CardContent className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={[
                                        {
                                          name: "Aumentar frecuencia",
                                          value:
                                            predictiveAnalysis?.growthOpportunities?.filter((c: any) =>
                                              c.opportunities.some((o: string) => o.includes("frecuencia")),
                                            ).length || 0,
                                        },
                                        {
                                          name: "Incrementar valor",
                                          value:
                                            predictiveAnalysis?.growthOpportunities?.filter((c: any) =>
                                              c.opportunities.some((o: string) => o.includes("valor")),
                                            ).length || 0,
                                        },
                                        {
                                          name: "Diversificar productos",
                                          value:
                                            predictiveAnalysis?.growthOpportunities?.filter((c: any) =>
                                              c.opportunities.some((o: string) => o.includes("Diversificar")),
                                            ).length || 0,
                                        },
                                        {
                                          name: "Fidelización",
                                          value:
                                            predictiveAnalysis?.growthOpportunities?.filter((c: any) =>
                                              c.opportunities.some((o: string) => o.includes("fidelización")),
                                            ).length || 0,
                                        },
                                      ]}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      outerRadius={120}
                                      fill="#8884d8"
                                      dataKey="value"
                                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                      {COLORS.map((color, index) => (
                                        <Cell key={`cell-${index}`} fill={color} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>
                          </div>
                        </TabsContent>

                        <TabsContent value="recovery" className="space-y-4 pt-4">
                          <Card>
                            <CardHeader>
                              <CardTitle>Análisis de Recuperación de Clientes</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Cliente</TableHead>
                                      <TableHead>Días Inactivo</TableHead>
                                      <TableHead>Valor Potencial</TableHead>
                                      <TableHead>ROI Recuperación</TableHead>
                                      <TableHead>¿Vale la pena?</TableHead>
                                      <TableHead>Estrategia</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {predictiveAnalysis?.recoveryAnalysis?.map((client: any, index: number) => (
                                      <TableRow key={index}>
                                        <TableCell className="font-medium">{client.client}</TableCell>
                                        <TableCell>{client.daysSinceLastOrder} días</TableCell>
                                        <TableCell>${client.predictedCLV?.toLocaleString()}</TableCell>
                                        <TableCell>
                                          <Badge
                                            variant={
                                              client.recoveryROI > 300
                                                ? "default"
                                                : client.recoveryROI > 100
                                                  ? "secondary"
                                                  : client.recoveryROI > 0
                                                    ? "outline"
                                                    : "destructive"
                                            }
                                          >
                                            {client.recoveryROI > 0
                                              ? `+${client.recoveryROI}%`
                                              : `${client.recoveryROI}%`}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>{client.worthRecovering}</TableCell>
                                        <TableCell>{client.strategy}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </CardContent>
                          </Card>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                              <CardHeader>
                                <CardTitle>ROI de Recuperación por Cliente</CardTitle>
                              </CardHeader>
                              <CardContent className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={predictiveAnalysis?.recoveryAnalysis?.slice(0, 10).map((client: any) => ({
                                      name:
                                        client.client.length > 15
                                          ? client.client.substring(0, 15) + "..."
                                          : client.client,
                                      roi: client.recoveryROI,
                                    }))}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar
                                      dataKey="roi"
                                      fill="#8884d8"
                                      name="ROI de Recuperación (%)"
                                      label={{ position: "top" }}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle>Factores de Riesgo para Recuperación</CardTitle>
                              </CardHeader>
                              <CardContent className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={[
                                        {
                                          name: "Mucho tiempo sin pedidos",
                                          value:
                                            predictiveAnalysis?.recoveryAnalysis?.filter((c: any) =>
                                              c.riskFactors.some((r: string) => r.includes("tiempo")),
                                            ).length || 0,
                                        },
                                        {
                                          name: "Cliente difícil",
                                          value:
                                            predictiveAnalysis?.recoveryAnalysis?.filter((c: any) =>
                                              c.riskFactors.some((r: string) => r.includes("difícil")),
                                            ).length || 0,
                                        },
                                        {
                                          name: "Problemas de pago",
                                          value:
                                            predictiveAnalysis?.recoveryAnalysis?.filter((c: any) =>
                                              c.riskFactors.some((r: string) => r.includes("pago")),
                                            ).length || 0,
                                        },
                                        {
                                          name: "Baja satisfacción",
                                          value:
                                            predictiveAnalysis?.recoveryAnalysis?.filter((c: any) =>
                                              c.riskFactors.some((r: string) => r.includes("satisfacción")),
                                            ).length || 0,
                                        },
                                        {
                                          name: "Baja frecuencia",
                                          value:
                                            predictiveAnalysis?.recoveryAnalysis?.filter((c: any) =>
                                              c.riskFactors.some((r: string) => r.includes("frecuencia")),
                                            ).length || 0,
                                        },
                                      ]}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      outerRadius={120}
                                      fill="#8884d8"
                                      dataKey="value"
                                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                      {COLORS.map((color, index) => (
                                        <Cell key={`cell-${index}`} fill={color} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="products" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Productos Más Populares
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead>Total Pedidos</TableHead>
                              <TableHead>Popularidad</TableHead>
                              <TableHead>Tendencia</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cleanedData.productsData?.map((product: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{product.Producto}</TableCell>
                                <TableCell>{product["Total Pedidos"]}</TableCell>
                                <TableCell>{getPopularityBadge(product.Popularidad)}</TableCell>
                                <TableCell>
                                  {predictiveAnalysis?.demandPrediction?.productTrends?.find(
                                    (p: any) => p.product === product.Producto,
                                  )?.predictedGrowth || "Sin datos"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="trends" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Tendencias por Hora del Día</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Hora</TableHead>
                                <TableHead>Nivel de Actividad</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cleanedData.trendsData
                                ?.filter((trend: any) => trend.Tipo === "Hora")
                                .map((trend: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">{trend.Periodo}</TableCell>
                                    <TableCell>{trend.Actividad}</TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Tendencias por Día de la Semana</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Día</TableHead>
                                <TableHead>Nivel de Actividad</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cleanedData.trendsData
                                ?.filter((trend: any) => trend.Tipo === "Día Semana")
                                .map((trend: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">{trend.Periodo}</TableCell>
                                    <TableCell>{trend.Actividad}</TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="export" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Download className="h-5 w-5" />
                          Exportar Datos de Clientes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Descarga los datos de todos los clientes en formato CSV para análisis adicional.
                        </p>
                        <Button
                          onClick={() => downloadCSV(cleanedData.clientsData || [], "clientes-whatsapp.csv")}
                          className="w-full"
                        >
                          Descargar CSV de Clientes
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Download className="h-5 w-5" />
                          Exportar Datos de Productos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Descarga los datos de todos los productos en formato CSV para análisis adicional.
                        </p>
                        <Button
                          onClick={() => downloadCSV(cleanedData.productsData || [], "productos-whatsapp.csv")}
                          className="w-full"
                        >
                          Descargar CSV de Productos
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Download className="h-5 w-5" />
                          Exportar Datos de Pedidos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Descarga los datos de todos los pedidos en formato CSV para análisis adicional.
                        </p>
                        <Button
                          onClick={() => downloadCSV(cleanedData.ordersData || [], "pedidos-whatsapp.csv")}
                          className="w-full"
                        >
                          Descargar CSV de Pedidos
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Exportar Análisis Predictivo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button
                          onClick={() =>
                            downloadCSV(
                              [
                                ...Object.values(predictiveAnalysis?.clientSegments?.vip || []),
                                ...Object.values(predictiveAnalysis?.clientSegments?.regular || []),
                                ...Object.values(predictiveAnalysis?.clientSegments?.occasional || []),
                                ...Object.values(predictiveAnalysis?.clientSegments?.problematic || []),
                                ...Object.values(predictiveAnalysis?.clientSegments?.newbie || []),
                              ],
                              "segmentacion-clientes.csv",
                            )
                          }
                          variant="outline"
                        >
                          Segmentación de Clientes
                        </Button>

                        <Button
                          onClick={() => downloadCSV(predictiveAnalysis?.churnRisk || [], "riesgo-abandono.csv")}
                          variant="outline"
                        >
                          Riesgo de Abandono
                        </Button>

                        <Button
                          onClick={() =>
                            downloadCSV(predictiveAnalysis?.growthOpportunities || [], "oportunidades-crecimiento.csv")
                          }
                          variant="outline"
                        >
                          Oportunidades de Crecimiento
                        </Button>

                        <Button
                          onClick={() =>
                            downloadCSV(
                              predictiveAnalysis?.demandPrediction?.weeklyTrends || [],
                              "prediccion-demanda-s.csv",
                            )
                          }
                          variant="outline"
                        >
                          Predicción de Demanda Semanal
                        </Button>

                        <Button
                          onClick={() =>
                            downloadCSV(
                              predictiveAnalysis?.demandPrediction?.productTrends || [],
                              "prediccion-productos.csv",
                            )
                          }
                          variant="outline"
                        >
                          Predicción por Producto
                        </Button>

                        <Button
                          onClick={() =>
                            downloadCSV(predictiveAnalysis?.recoveryAnalysis || [], "analisis-recuperacion.csv")
                          }
                          variant="outline"
                        >
                          Análisis de Recuperación
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </>
        )}

        {isProcessing && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p>Analizando conversaciones con IA...</p>
                <p className="text-sm text-muted-foreground">
                  Esto puede tomar unos minutos dependiendo de la cantidad de datos
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
