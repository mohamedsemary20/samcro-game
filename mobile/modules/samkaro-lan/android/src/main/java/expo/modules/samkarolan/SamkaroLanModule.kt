package expo.modules.samkarolan

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.java_websocket.WebSocket
import org.java_websocket.drafts.Draft_6455
import org.java_websocket.handshake.ClientHandshake
import org.java_websocket.server.WebSocketServer
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

class SamkaroLanModule : Module() {
  private val lock = Any()
  @Volatile private var server: WebSocketServer? = null
  private val clientIds = ConcurrentHashMap<WebSocket, String>()
  private val buckets = ConcurrentHashMap<WebSocket, MessageBucket>()

  override fun definition() = ModuleDefinition {
    Name("SamkaroLan")
    Events("onLanEvent")

    AsyncFunction("startHost") { requestedPort: Int ->
      if (requestedPort !in 0..65535) throw IllegalArgumentException("INVALID_PORT")
      synchronized(lock) {
        if (server != null) throw IllegalStateException("HOST_ALREADY_RUNNING")
        val started = CountDownLatch(1)
        val startupError = AtomicReference<Exception?>(null)
        val host = object : WebSocketServer(
          InetSocketAddress("0.0.0.0", requestedPort),
          Runtime.getRuntime().availableProcessors().coerceAtLeast(2),
          listOf(Draft_6455(emptyList(), MAX_MESSAGE_BYTES)),
        ) {
          override fun onOpen(connection: WebSocket, handshake: ClientHandshake) {
            if (connections.size > MAX_CLIENTS) {
              connection.close(CLOSE_POLICY_VIOLATION, "ROOM_FULL")
              return
            }
            val clientId = UUID.randomUUID().toString()
            clientIds[connection] = clientId
            buckets[connection] = MessageBucket()
            emit("connected", mapOf("clientId" to clientId, "address" to remoteAddress(connection)))
          }

          override fun onClose(connection: WebSocket, code: Int, reason: String, remote: Boolean) {
            val clientId = clientIds.remove(connection)
            buckets.remove(connection)
            if (clientId != null) emit("disconnected", mapOf("clientId" to clientId, "code" to code))
          }

          override fun onMessage(connection: WebSocket, message: String) {
            val clientId = clientIds[connection] ?: return
            if (message.toByteArray(Charsets.UTF_8).size > MAX_MESSAGE_BYTES || buckets[connection]?.take() != true) {
              connection.close(CLOSE_POLICY_VIOLATION, "MESSAGE_LIMIT")
              return
            }
            emit("message", mapOf("clientId" to clientId, "data" to message))
          }

          override fun onError(connection: WebSocket?, error: Exception) {
            // Never log remote payloads, resume tokens, join credentials, or exception messages.
            if (started.count > 0) startupError.compareAndSet(null, error)
            started.countDown()
            emit("transportError", mapOf("clientId" to connection?.let { clientIds[it] }))
          }

          override fun onStart() {
            setConnectionLostTimeout(HEARTBEAT_TIMEOUT_SECONDS)
            emit("listening", mapOf("port" to port))
            started.countDown()
          }
        }
        host.setReuseAddr(true)
        host.connectionLostTimeout = HEARTBEAT_TIMEOUT_SECONDS
        server = host
        try {
          host.start()
        } catch (error: Exception) {
          server = null
          throw error
        }
        if (!started.await(START_TIMEOUT_MS, TimeUnit.MILLISECONDS)) {
          server = null
          host.stop(250)
          throw IllegalStateException("HOST_START_TIMEOUT")
        }
        if (startupError.get() != null) {
          server = null
          host.stop(250)
          throw IllegalStateException("HOST_BIND_FAILED")
        }
        mapOf("port" to host.port, "addresses" to discoverAddresses())
      }
    }

    AsyncFunction("sendToClient") { clientId: String, message: String ->
      validateMessage(message)
      val connection = clientIds.entries.firstOrNull { it.value == clientId }?.key
        ?: throw IllegalStateException("CLIENT_NOT_CONNECTED")
      connection.send(message)
      true
    }

    AsyncFunction("closeClient") { clientId: String ->
      val connection = clientIds.entries.firstOrNull { it.value == clientId }?.key ?: return@AsyncFunction false
      connection.close(CLOSE_POLICY_VIOLATION, "ROOM_REMOVED")
      true
    }

    AsyncFunction("broadcast") { message: String ->
      validateMessage(message)
      val host = server ?: throw IllegalStateException("HOST_NOT_RUNNING")
      host.broadcast(message)
      true
    }

    AsyncFunction("stopHost") {
      stopServer()
      true
    }

    AsyncFunction("getAddresses") { discoverAddresses() }

    OnDestroy {
      stopServer()
    }
  }

  private fun stopServer() {
    synchronized(lock) {
      val current = server ?: return
      server = null
      try {
        current.stop(500, "HOST_SHUTDOWN")
      } catch (_: Exception) {
        // Shutdown is best-effort during Android module teardown.
      } finally {
        clientIds.clear()
        buckets.clear()
      }
    }
  }

  private fun validateMessage(message: String) {
    require(message.toByteArray(Charsets.UTF_8).size <= MAX_MESSAGE_BYTES) { "MESSAGE_TOO_LARGE" }
  }

  private fun emit(type: String, fields: Map<String, Any?> = emptyMap()) {
    val payload = mutableMapOf<String, Any?>("type" to type)
    payload.putAll(fields)
    sendEvent("onLanEvent", payload)
  }

  private fun remoteAddress(connection: WebSocket): String =
    (connection.remoteSocketAddress?.address as? InetAddress)?.hostAddress.orEmpty()

  private fun discoverAddresses(): List<String> {
    val candidates = linkedSetOf<String>()
    try {
      val context = appContext.reactContext ?: return emptyList()
      val connectivity = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
      val active = connectivity.activeNetwork
      val capabilities = active?.let { connectivity.getNetworkCapabilities(it) }
      val hasLocalTransport = capabilities?.let {
        it.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) || it.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
      } == true
      if (active != null && hasLocalTransport && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        connectivity.getLinkProperties(active)?.linkAddresses?.forEach { link ->
          val address = link.address as? Inet4Address
          if (address != null && isUsable(address)) candidates.add(address.hostAddress ?: "")
        }
      }
    } catch (_: Exception) {
      // Interface enumeration below also works on older Android releases.
    }
    try {
      val interfaces = NetworkInterface.getNetworkInterfaces()
      while (interfaces.hasMoreElements()) {
        val network = interfaces.nextElement()
        if (!network.isUp || network.isLoopback || network.isVirtual) continue
        val addresses = network.inetAddresses
        while (addresses.hasMoreElements()) {
          val address = addresses.nextElement() as? Inet4Address ?: continue
          if (isUsable(address)) candidates.add(address.hostAddress ?: "")
        }
      }
    } catch (_: Exception) {
      // Return the active link-properties result if enumeration is restricted.
    }
    return candidates.filter { it.isNotBlank() }.sortedWith(compareBy<String>({ !it.startsWith("192.168.") && !it.startsWith("10.") && !it.startsWith("172.") }, { it }))
  }

  private fun isUsable(address: Inet4Address): Boolean =
    !address.isAnyLocalAddress && !address.isLoopbackAddress && !address.isLinkLocalAddress && address.isSiteLocalAddress

  private class MessageBucket {
    private var tokens = MESSAGE_BURST.toDouble()
    private var updatedAt = System.nanoTime()

    @Synchronized fun take(): Boolean {
      val now = System.nanoTime()
      tokens = (tokens + (now - updatedAt) / 1_000_000_000.0 * MESSAGE_RATE).coerceAtMost(MESSAGE_BURST.toDouble())
      updatedAt = now
      if (tokens < 1.0) return false
      tokens -= 1.0
      return true
    }
  }

  companion object {
    private const val MAX_CLIENTS = 8
    private const val MAX_MESSAGE_BYTES = 64 * 1024
    private const val HEARTBEAT_TIMEOUT_SECONDS = 30
    private const val START_TIMEOUT_MS = 4_000L
    private const val MESSAGE_RATE = 20.0
    private const val MESSAGE_BURST = 60
    private const val CLOSE_POLICY_VIOLATION = 1008
  }
}
