"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  Download,
  BarChart3,
  Users,
  TrendingUp,
  AlertTriangle,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default function WhatsAppAnalyzer() {
  const [conversations, setConversations] = useState("")
  const [allConversations, setAllConversations] = useState<string[]>([])

  // Estados renombrados según las instrucciones
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<string>("idle") // 'idle', 'pending', 'processing', 'completed', 'failed'
  const [summaryData, setSummaryData] = useState<any>(null)

  // Estados para clientes paginados
  const [clients, setClients] = useState<any[]>([])
  const [clientsCurrentPage, setClientsCurrentPage] = useState(1)
  const [clientsTotalPages, setClientsTotalPages] = useState(1)
  const [clientsLoading, setClientsLoading] = useState(false)
  const [clientsTotalCount, setClientsTotalCount] = useState(0)

  // Estados para productos paginados
  const [products, setProducts] = useState<any[]>([])
  const [productsCurrentPage, setProductsCurrentPage] = useState(1)
  const [productsTotalPages, setProductsTotalPages] = useState(1)
  const [productsLoading, setProductsLoading] = useState(false)

  // Estados para pedidos paginados
  const [orders, setOrders] = useState<any[]>([])
  const [ordersCurrentPage, setOrdersCurrentPage] = useState(1)
  const [ordersTotalPages, setOrdersTotalPages] = useState(1)
  const [ordersLoading, setOrdersLoading] = useState(false)

  // Estados para otras secciones
  const [trends, setTrends] = useState<any[]>([])
  const [trendsLoading, setTrendsLoading] = useState(false)

  const [conversationHistory, setConversationHistory] = useState<Array<{ id: number; preview: string; date: string }>>(
    [],
  )

  // Ref para polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Persistencia automática de datos
  useEffect(() => {
    const savedConversations = localStorage.getItem("whatsapp-conversations")
    const savedHistory = localStorage.getItem("whatsapp-history")

    if (savedConversations) {
      setAllConversations(JSON.parse(savedConversations))
    }
    if (savedHistory) {
      setConversationHistory(JSON.parse(savedHistory))
    }
  }, [])

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

  // Función para hacer polling del estado del trabajo
  const startPolling = (jobId: string) => {
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/status/${jobId}`)
        const data = await response.json()

        if (data.status === "completed") {
          setJobStatus("completed")
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
          }
          // Cargar datos del resumen
          await fetchSummaryData(jobId)
        } else if (data.status === "failed") {
          setJobStatus("failed")
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
          }
        } else {
          setJobStatus(data.status)
        }
      } catch (error) {
        console.error("Error polling status:", error)
      }
    }, 3000)
  }

  // Función para obtener datos del resumen
  const fetchSummaryData = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/results/${jobId}?part=summary`)
      const data = await response.json()
      setSummaryData(data)
    } catch (error) {
      console.error("Error fetching summary:", error)
      setJobStatus("failed")
    }
  }

  // Función para obtener clientes paginados
  const fetchClients = async (page: number) => {
    if (!jobId) return

    setClientsLoading(true)
    try {
      const response = await fetch(`/api/jobs/results/${jobId}?part=clients&page=${page}&limit=20`)
      const data = await response.json()

      setClients(data.clients || [])
      setClientsCurrentPage(data.currentPage || 1)
      setClientsTotalPages(data.totalPages || 1)
      setClientsTotalCount(data.totalClients || 0)
    } catch (error) {
      console.error("Error fetching clients:", error)
    } finally {
      setClientsLoading(false)
    }
  }

  // Función para obtener productos paginados
  const fetchProducts = async (page: number) => {
    if (!jobId) return

    setProductsLoading(true)
    try {
      const response = await fetch(`/api/jobs/results/${jobId}?part=products&page=${page}&limit=20`)
      const data = await response.json()

      setProducts(data.products || [])
      setProductsCurrentPage(data.currentPage || 1)
      setProductsTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setProductsLoading(false)
    }
  }

  // Función para obtener pedidos paginados
  const fetchOrders = async (page: number) => {
    if (!jobId) return

    setOrdersLoading(true)
    try {
      const response = await fetch(`/api/jobs/results/${jobId}?part=orders&page=${page}&limit=20`)
      const data = await response.json()

      setOrders(data.orders || [])
      setOrdersCurrentPage(data.currentPage || 1)
      setOrdersTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setOrdersLoading(false)
    }
  }

  // Función para obtener tendencias
  const fetchTrends = async () => {
    if (!jobId) return

    setTrendsLoading(true)
    try {
      const response = await fetch(`/api/jobs/results/${jobId}?part=trends`)
      const data = await response.json()

      setTrends(data.trends || [])
    } catch (error) {
      console.error("Error fetching trends:", error)
    } finally {
      setTrendsLoading(false)
    }
  }

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

  // Función modificada según las instrucciones
  const handleAnalyzeAll = async () => {
    if (allConversations.length === 0) {
      alert("Por favor, agrega al menos una conversación antes de analizar")
      return
    }

    // Limpiar estados previos
    setJobStatus("pending")
    setSummaryData(null)
    setClients([])
    setProducts([])
    setOrders([])
    setTrends([])

    try {
      const combinedConversations = allConversations.join("\n")

      // Hacer POST a /api/jobs/start
      const response = await fetch("/api/jobs/start", {
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

      if (data.jobId) {
        setJobId(data.jobId)
        startPolling(data.jobId)
      } else {
        setJobStatus("failed")
        alert("Error al iniciar el análisis")
      }
    } catch (error) {
      console.error("Error starting analysis:", error)
      setJobStatus("failed")
      alert("Error al procesar las conversaciones")
    }
  }

  const handleClearAll = () => {
    if (confirm("¿Estás seguro de que quieres eliminar todas las conversaciones?")) {
      setAllConversations([])
      setConversationHistory([])
      setSummaryData(null)
      setClients([])
      setProducts([])
      setOrders([])
      setTrends([])
      setConversations("")
      setJobId(null)
      setJobStatus("idle")

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }

      localStorage.removeItem("whatsapp-conversations")
      localStorage.removeItem("whatsapp-history")
    }
  }

  // Función para manejar cambios de pestaña
  const handleTabChange = (value: string) => {
    if (jobStatus !== "completed" || !jobId) return

    switch (value) {
      case "clients":
        if (clients.length === 0) {
          fetchClients(1)
        }
        break
      case "products":
        if (products.length === 0) {
          fetchProducts(1)
        }
        break
      case "orders":
        if (orders.length === 0) {
          fetchOrders(1)
        }
        break
      case "trends":
        if (trends.length === 0) {
          fetchTrends()
        }
        break
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

  // Función para obtener el mensaje de estado
  const getStatusMessage = () => {
    switch (jobStatus) {
      case "pending":
        return "Trabajo en cola, esperando procesamiento..."
      case "processing":
        return "Analizando conversaciones..."
      case "completed":
        return "Análisis completado"
      case "failed":
        return "Error en el análisis"
      default:
        return ""
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">PanWhat - Analizador de WhatsApp</h1>
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
              disabled={jobStatus === "pending" || jobStatus === "processing"}
            />

            <div className="flex gap-2">
              <Button
                onClick={handleAddConversation}
                disabled={!conversations.trim() || jobStatus === "pending" || jobStatus === "processing"}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Conversación
              </Button>

              <Button
                onClick={handleAnalyzeAll}
                disabled={jobStatus === "pending" || jobStatus === "processing" || allConversations.length === 0}
                variant="default"
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                {jobStatus === "pending" || jobStatus === "processing"
                  ? "Analizando..."
                  : `Analizar Todo (${allConversations.length})`}
              </Button>

              <Button
                onClick={handleClearAll}
                disabled={allConversations.length === 0 || jobStatus === "pending" || jobStatus === "processing"}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Limpiar Todo
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
                        disabled={jobStatus === "pending" || jobStatus === "processing"}
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

        {/* Indicador de Progreso durante el procesamiento */}
        {(jobStatus === "pending" || jobStatus === "processing") && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  {jobStatus === "pending" ? (
                    <Clock className="h-8 w-8 text-blue-600" />
                  ) : (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  )}
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-blue-800">{getStatusMessage()}</h3>
                    <p className="text-blue-600 mt-1">
                      {jobStatus === "pending"
                        ? "Tu análisis está en la cola de procesamiento."
                        : "Esto puede tomar varios minutos dependiendo del volumen de datos."}
                    </p>
                  </div>
                </div>
                {jobId && (
                  <div className="text-xs text-blue-500 font-mono bg-blue-100 p-2 rounded">ID del trabajo: {jobId}</div>
                )}
                <p className="text-sm text-blue-500">
                  Puedes dejar esta pestaña abierta mientras el análisis se completa.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {jobStatus === "failed" && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-600 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Error en el Análisis</h3>
                  <p className="text-red-600 mt-2">
                    Hubo un problema procesando las conversaciones. Por favor, intenta nuevamente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {jobStatus === "completed" && summaryData && (
          <Tabs defaultValue="overview" className="w-full" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Resumen General</TabsTrigger>
              <TabsTrigger value="clients">Clientes</TabsTrigger>
              <TabsTrigger value="products">Productos</TabsTrigger>
              <TabsTrigger value="trends">Tendencias</TabsTrigger>
              <TabsTrigger value="orders">Pedidos</TabsTrigger>
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
                        <p className="text-2xl font-bold">{summaryData.totalClients || 0}</p>
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
                        <p className="text-2xl font-bold">{summaryData.totalSpecificOrders || 0}</p>
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
                        <p className="text-2xl font-bold">{summaryData.totalGeneralOrders || 0}</p>
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
                        <p className="text-2xl font-bold">{summaryData.totalSpecificPieces || 0}</p>
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
                        <p className="text-2xl font-bold">{summaryData.totalGeneralPieces || 0}</p>
                        <p className="text-sm text-muted-foreground">Piezas Generales</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

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
                          <Badge variant="default">{summaryData.totalSpecificOrders || 0}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Porcentaje del total:</span>
                          <Badge variant="secondary">
                            {summaryData.totalOrders > 0
                              ? Math.round(((summaryData.totalSpecificOrders || 0) / summaryData.totalOrders) * 100)
                              : 0}
                            %
                          </Badge>
                        </div>
                        <Progress
                          value={
                            summaryData.totalOrders > 0
                              ? ((summaryData.totalSpecificOrders || 0) / summaryData.totalOrders) * 100
                              : 0
                          }
                          className="h-2"
                        />
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 text-blue-600">Pedidos Generales</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Total de pedidos generales:</span>
                          <Badge variant="default">{summaryData.totalGeneralOrders || 0}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Porcentaje del total:</span>
                          <Badge variant="secondary">
                            {summaryData.totalOrders > 0
                              ? Math.round(((summaryData.totalGeneralOrders || 0) / summaryData.totalOrders) * 100)
                              : 0}
                            %
                          </Badge>
                        </div>
                        <Progress
                          value={
                            summaryData.totalOrders > 0
                              ? ((summaryData.totalGeneralOrders || 0) / summaryData.totalOrders) * 100
                              : 0
                          }
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clients" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Todos los Clientes ({clientsTotalCount})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {clientsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2">Cargando clientes...</p>
                    </div>
                  ) : (
                    <>
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
                              <TableHead>Riesgo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {clients.map((client: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{client["Nombre Cliente"]}</TableCell>
                                <TableCell>${client["Total Gastado"]?.toLocaleString()}</TableCell>
                                <TableCell>{client["Total Pedidos"]}</TableCell>
                                <TableCell>{client["Frecuencia Semanal"]} / semana</TableCell>
                                <TableCell>{client["Último Pedido"]}</TableCell>
                                <TableCell>{getDifficultyBadge(client["Puntuación Dificultad"])}</TableCell>
                                <TableCell>{getRiskBadge(client["Nivel de Riesgo"])}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Paginación */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          Página {clientsCurrentPage} de {clientsTotalPages} ({clientsTotalCount} clientes total)
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchClients(clientsCurrentPage - 1)}
                            disabled={clientsCurrentPage <= 1 || clientsLoading}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchClients(clientsCurrentPage + 1)}
                            disabled={clientsCurrentPage >= clientsTotalPages || clientsLoading}
                          >
                            Siguiente
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
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
                  {productsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2">Cargando productos...</p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead>Total Pedidos</TableHead>
                              <TableHead>Popularidad</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {products.map((product: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{product.Producto}</TableCell>
                                <TableCell>{product["Total Pedidos"]}</TableCell>
                                <TableCell>{getPopularityBadge(product.Popularidad)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Paginación para productos */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          Página {productsCurrentPage} de {productsTotalPages}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchProducts(productsCurrentPage - 1)}
                            disabled={productsCurrentPage <= 1 || productsLoading}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchProducts(productsCurrentPage + 1)}
                            disabled={productsCurrentPage >= productsTotalPages || productsLoading}
                          >
                            Siguiente
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tendencias de Actividad</CardTitle>
                </CardHeader>
                <CardContent>
                  {trendsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2">Cargando tendencias...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Por Hora del Día</h4>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Hora</TableHead>
                                <TableHead>Actividad</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {trends
                                .filter((trend: any) => trend.Tipo === "Hora")
                                .map((trend: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">{trend.Periodo}</TableCell>
                                    <TableCell>{trend.Actividad}</TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Por Día de la Semana</h4>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Día</TableHead>
                                <TableHead>Actividad</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {trends
                                .filter((trend: any) => trend.Tipo === "Día Semana")
                                .map((trend: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">{trend.Periodo}</TableCell>
                                    <TableCell>{trend.Actividad}</TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Historial de Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2">Cargando pedidos...</p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Productos</TableHead>
                              <TableHead>Piezas</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Categoría</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orders.map((order: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>{order.Fecha}</TableCell>
                                <TableCell className="font-medium">{order.Cliente}</TableCell>
                                <TableCell>{order.Productos}</TableCell>
                                <TableCell>{order["Total Piezas"]}</TableCell>
                                <TableCell>${order["Valor Estimado"]?.toLocaleString()}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{order["Categoría Pedido"]}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Paginación para pedidos */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          Página {ordersCurrentPage} de {ordersTotalPages}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchOrders(ordersCurrentPage - 1)}
                            disabled={ordersCurrentPage <= 1 || ordersLoading}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchOrders(ordersCurrentPage + 1)}
                            disabled={ordersCurrentPage >= ordersTotalPages || ordersLoading}
                          >
                            Siguiente
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
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
                      Descarga los datos de todos los clientes en formato CSV.
                    </p>
                    <Button
                      onClick={() => downloadCSV(clients, "clientes-whatsapp.csv")}
                      className="w-full"
                      disabled={clients.length === 0}
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
                      Descarga los datos de todos los productos en formato CSV.
                    </p>
                    <Button
                      onClick={() => downloadCSV(products, "productos-whatsapp.csv")}
                      className="w-full"
                      disabled={products.length === 0}
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
                      Descarga los datos de todos los pedidos en formato CSV.
                    </p>
                    <Button
                      onClick={() => downloadCSV(orders, "pedidos-whatsapp.csv")}
                      className="w-full"
                      disabled={orders.length === 0}
                    >
                      Descargar CSV de Pedidos
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
