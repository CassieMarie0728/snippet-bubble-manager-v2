package com.snippetbubbles.floatingbubble

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONArray

class FloatingBubbleService : Service() {
  companion object {
    const val ACTION_START = "com.snippetbubbles.floatingbubble.START"
    const val ACTION_UPDATE_SNIPPETS = "com.snippetbubbles.floatingbubble.UPDATE_SNIPPETS"
    const val EXTRA_TITLE = "title"
    const val EXTRA_SNIPPETS = "snippets"
    const val EXTRA_SIZE = "size"
    const val EXTRA_OPACITY = "opacity"
    const val EXTRA_SNAP_TO_EDGE = "snapToEdge"
    private const val CHANNEL_ID = "snippet_bubbles_overlay"
    private const val NOTIFICATION_ID = 4801
  }

  private lateinit var windowManager: WindowManager
  private var bubbleView: TextView? = null
  private var panelView: View? = null
  private var panelParams: WindowManager.LayoutParams? = null
  private var bubbleParams: WindowManager.LayoutParams? = null
  private var snippetsJson = "[]"
  private var title = "Snippet Bubbles"
  private var bubbleSize = "medium"
  private var opacity = 0.86f
  private var snapToEdge = true
  private var isExpanded = false

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    createNotificationChannel()
    startForeground(NOTIFICATION_ID, createNotification())
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_UPDATE_SNIPPETS -> {
        snippetsJson = intent.getStringExtra(EXTRA_SNIPPETS) ?: "[]"
        if (isExpanded) showExpandedPanel() else showBubble()
      }
      ACTION_START, null -> {
        title = intent?.getStringExtra(EXTRA_TITLE) ?: title
        snippetsJson = intent?.getStringExtra(EXTRA_SNIPPETS) ?: snippetsJson
        bubbleSize = intent?.getStringExtra(EXTRA_SIZE) ?: bubbleSize
        opacity = intent?.getFloatExtra(EXTRA_OPACITY, opacity) ?: opacity
        snapToEdge = intent?.getBooleanExtra(EXTRA_SNAP_TO_EDGE, snapToEdge) ?: snapToEdge
        showBubble()
      }
    }
    return START_STICKY
  }

  private fun showBubble() {
    removeOverlayViews()
    isExpanded = false
    val size = when (bubbleSize) {
      "small" -> 52
      "large" -> 76
      else -> 64
    }
    val bubble = TextView(this).apply {
      text = "⌘"
      textSize = if (size > 64) 30f else 25f
      gravity = Gravity.CENTER
      setTextColor(Color.WHITE)
      alpha = opacity.coerceIn(0.35f, 1f)
      background = circleBackground("#981518")
      contentDescription = "Open Snippet Bubbles"
      setOnTouchListener(createDragListener { toggleExpanded() })
    }
    bubbleView = bubble
    bubbleParams = createParams(size, size).also { params ->
      params.gravity = Gravity.TOP or Gravity.START
      params.x = 24
      params.y = 220
    }
    windowManager.addView(bubble, bubbleParams)
  }

  private fun showExpandedPanel() {
    removeOverlayViews()
    isExpanded = true
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(18, 16, 18, 14)
      background = roundedBackground("#202124", 18f)
      alpha = opacity.coerceIn(0.35f, 1f)
    }

    val header = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    val heading = TextView(this).apply {
      text = title
      textSize = 19f
      setTextColor(Color.WHITE)
      setTypeface(typeface, android.graphics.Typeface.BOLD)
    }
    header.addView(heading, LinearLayout.LayoutParams(0, 52, 1f))
    val minimize = Button(this).apply {
      text = "—"
      setTextColor(Color.WHITE)
      setOnClickListener { showBubble() }
    }
    val close = Button(this).apply {
      text = "×"
      setTextColor(Color.WHITE)
      setOnClickListener { stopSelf() }
    }
    header.addView(minimize, LinearLayout.LayoutParams(52, 52))
    header.addView(close, LinearLayout.LayoutParams(52, 52))
    root.addView(header)

    val scroll = ScrollView(this)
    val list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    val snippets = runCatching { JSONArray(snippetsJson) }.getOrNull()
    if (snippets == null || snippets.length() == 0) {
      list.addView(TextView(this).apply {
        text = "No snippets yet. Open the full app to save one."
        textSize = 15f
        setTextColor(Color.LTGRAY)
        setPadding(4, 28, 4, 28)
      })
    } else {
      for (index in 0 until snippets.length()) {
        val item = snippets.optJSONObject(index) ?: continue
        val itemView = TextView(this).apply {
          text = "${item.optString("title", "Untitled")}\n${item.optString("language", "")}".trim()
          textSize = 16f
          setTextColor(Color.WHITE)
          setPadding(12, 14, 12, 14)
          background = roundedBackground("#303134", 10f)
          setOnClickListener { openFullApp() }
        }
        list.addView(itemView, LinearLayout.LayoutParams(-1, 72).apply { setMargins(0, 0, 0, 8) })
      }
    }
    scroll.addView(list)
    root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))

    val save = Button(this).apply {
      text = "+  Save a snippet"
      setOnClickListener { openFullApp() }
    }
    root.addView(save, LinearLayout.LayoutParams(-1, 52))

    panelView = root
    panelParams = createParams(340, 520).also { params ->
      params.gravity = Gravity.TOP or Gravity.START
      params.x = 24
      params.y = 180
    }
    root.setOnTouchListener(createDragListener { })
    windowManager.addView(root, panelParams)
  }

  private fun toggleExpanded() {
    if (isExpanded) showBubble() else showExpandedPanel()
  }

  private fun openFullApp() {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
      ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    if (launchIntent != null) startActivity(launchIntent)
  }

  private fun createDragListener(onTap: () -> Unit): View.OnTouchListener {
    var downX = 0f
    var downY = 0f
    var initialX = 0
    var initialY = 0
    var moved = false
    return View.OnTouchListener { view, event ->
      val params = if (view === bubbleView) bubbleParams else panelParams
      if (params == null) return@OnTouchListener false
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          downX = event.rawX
          downY = event.rawY
          initialX = params.x
          initialY = params.y
          moved = false
          true
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = (event.rawX - downX).toInt()
          val dy = (event.rawY - downY).toInt()
          if (kotlin.math.abs(dx) > 5 || kotlin.math.abs(dy) > 5) moved = true
          params.x = initialX + dx
          params.y = initialY + dy
          windowManager.updateViewLayout(view, params)
          true
        }
        MotionEvent.ACTION_UP -> {
          if (!moved) onTap()
          if (snapToEdge && view === bubbleView) {
            params.x = if (params.x < resources.displayMetrics.widthPixels / 2) 12 else resources.displayMetrics.widthPixels - params.width - 12
            windowManager.updateViewLayout(view, params)
          }
          true
        }
        else -> false
      }
    }
  }

  private fun createParams(width: Int, height: Int): WindowManager.LayoutParams {
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      WindowManager.LayoutParams.TYPE_PHONE
    }
    return WindowManager.LayoutParams(
      width,
      height,
      type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT,
    )
  }

  private fun removeOverlayViews() {
    bubbleView?.let { runCatching { windowManager.removeView(it) } }
    panelView?.let { runCatching { windowManager.removeView(it) } }
    bubbleView = null
    panelView = null
  }

  private fun circleBackground(color: String) = GradientDrawable().apply {
    shape = GradientDrawable.OVAL
    setColor(Color.parseColor(color))
  }

  private fun roundedBackground(color: String, radius: Float) = GradientDrawable().apply {
    shape = GradientDrawable.RECTANGLE
    cornerRadius = radius
    setColor(Color.parseColor(color))
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "Snippet Bubbles overlay", NotificationManager.IMPORTANCE_LOW)
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
  }

  private fun createNotification(): Notification {
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      Notification.Builder(this)
    }
    return builder
      .setContentTitle("Snippet Bubbles is ready")
      .setContentText("Your floating snippet bubble is available above other apps.")
      .setSmallIcon(android.R.drawable.ic_menu_edit)
      .setOngoing(true)
      .build()
  }

  override fun onDestroy() {
    removeOverlayViews()
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
