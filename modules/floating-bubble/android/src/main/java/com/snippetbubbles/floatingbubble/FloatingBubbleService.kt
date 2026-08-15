package com.snippetbubbles.floatingbubble

import android.app.AlertDialog
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.text.InputType
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import kotlin.math.abs
import kotlin.math.min

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
    private const val MAX_OVERLAY_ITEMS = 100
    private const val PANEL_WIDTH_DP = 380
    private const val PANEL_HEIGHT_DP = 680
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
  private var isEditing = false
  private var selectedTab = "snippets"
  private var searchQuery = ""

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    snippetsJson = getPreferences().getString(FLOATING_BUBBLE_SNIPPETS, "[]") ?: "[]"
    createNotificationChannel()
    startForeground(NOTIFICATION_ID, createNotification())
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_UPDATE_SNIPPETS -> {
        snippetsJson = intent.getStringExtra(EXTRA_SNIPPETS) ?: snippetsJson
        persistSnippets()
        if (isExpanded && !isEditing) showExpandedPanel()
      }
      ACTION_START, null -> {
        title = intent?.getStringExtra(EXTRA_TITLE) ?: title
        intent?.getStringExtra(EXTRA_SNIPPETS)?.let {
          snippetsJson = it
          persistSnippets()
        }
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
    isEditing = false
    val size = when (bubbleSize) {
      "small" -> dp(52)
      "large" -> dp(76)
      else -> dp(64)
    }
    val bubble = TextView(this).apply {
      text = "⌘"
      textSize = if (size > dp(64)) 30f else 25f
      gravity = Gravity.CENTER
      setTextColor(Color.WHITE)
      alpha = opacity.coerceIn(0.35f, 1f)
      background = circleBackground("#981518")
      contentDescription = "Open Snippet Bubbles workspace"
      setOnTouchListener(createDragListener { showExpandedPanel() })
    }
    bubbleView = bubble
    bubbleParams = createParams(size, size, focusable = false).also { params ->
      params.gravity = Gravity.TOP or Gravity.START
      params.x = dp(24)
      params.y = dp(220)
    }
    windowManager.addView(bubble, bubbleParams)
  }

  private fun showExpandedPanel() {
    removeOverlayViews()
    isExpanded = true
    isEditing = false

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(16), dp(12), dp(16), dp(12))
      background = roundedBackground("#171a1d", dp(18).toFloat())
      alpha = opacity.coerceAtLeast(0.94f).coerceAtMost(1f)
      contentDescription = "Snippet Bubbles workspace"
    }

    val header = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    val heading = TextView(this).apply {
      text = "$title  ${visibleItems().length()}/$MAX_OVERLAY_ITEMS"
      textSize = 19f
      setTextColor(Color.WHITE)
      setTypeface(Typeface.DEFAULT, Typeface.BOLD)
    }
    header.addView(heading, LinearLayout.LayoutParams(0, dp(52), 1f))
    header.addView(makeHeaderButton("—", "Minimize workspace") { showBubble() }, LinearLayout.LayoutParams(dp(52), dp(52)))
    header.addView(makeHeaderButton("×", "Close overlay") { stopSelf() }, LinearLayout.LayoutParams(dp(52), dp(52)))
    root.addView(header)

    val search = EditText(this).apply {
      hint = "Search snippets and notes..."
      setHintTextColor(Color.rgb(170, 170, 175))
      setTextColor(Color.WHITE)
      textSize = 15f
      setSingleLine(true)
      inputType = InputType.TYPE_CLASS_TEXT
      setPadding(dp(12), 0, dp(12), 0)
      background = roundedBackground("#303134", dp(10).toFloat())
      setText(searchQuery)
      setSelection(text.length)
      contentDescription = "Search snippets and notes"
      setOnEditorActionListener { _, _, _ ->
        searchQuery = text.toString()
        showExpandedPanel()
        true
      }
    }
    search.setOnFocusChangeListener { _, hasFocus ->
      if (!hasFocus && searchQuery != search.text.toString()) {
        searchQuery = search.text.toString()
        showExpandedPanel()
      }
    }
    root.addView(search, LinearLayout.LayoutParams(-1, dp(48)).apply { setMargins(0, 0, 0, dp(10)) })

    val tabs = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      setPadding(0, 0, 0, dp(8))
    }
    tabs.addView(makeTabButton("Snippets", "snippets"), LinearLayout.LayoutParams(0, dp(44), 1f).apply { setMargins(0, 0, dp(6), 0) })
    tabs.addView(makeTabButton("Memos", "memos"), LinearLayout.LayoutParams(0, dp(44), 1f))
    root.addView(tabs)

    val scroll = ScrollView(this).apply {
      isFillViewport = true
      isVerticalScrollBarEnabled = true
    }
    val list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    val visible = visibleItems()
    if (visible.length() == 0) {
      list.addView(TextView(this).apply {
        text = if (searchQuery.isBlank()) {
          if (selectedTab == "memos") "No memos yet. Tap + New memo to capture a thought." else "No snippets yet. Tap + New snippet to capture code."
        } else "Nothing matched your search."
        textSize = 15f
        setTextColor(Color.LTGRAY)
        setPadding(dp(4), dp(28), dp(4), dp(28))
      })
    } else {
      for (index in 0 until visible.length()) {
        val item = visible.optJSONObject(index) ?: continue
        list.addView(makeSnippetRow(item), LinearLayout.LayoutParams(-1, dp(78)).apply { setMargins(0, 0, 0, dp(8)) })
      }
    }
    scroll.addView(list)
    root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))

    val newButton = makePrimaryButton(if (selectedTab == "memos") "+  New memo" else "+  New snippet", "Create a new overlay entry") {
      showEditor(null)
    }
    root.addView(newButton, LinearLayout.LayoutParams(-1, dp(54)).apply { setMargins(0, dp(10), 0, 0) })

    panelView = root
    panelParams = createParams(dp(PANEL_WIDTH_DP), dp(PANEL_HEIGHT_DP), focusable = true).also { params ->
      params.gravity = Gravity.TOP or Gravity.START
      params.x = dp(16)
      params.y = dp(92)
      params.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
    }
    root.setOnTouchListener(createDragListener { })
    windowManager.addView(root, panelParams)
  }

  private fun showEditor(editingId: String?) {
    removeOverlayViews()
    isExpanded = true
    isEditing = true

    val existing = editingId?.let { findSnippet(it) }
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(16), dp(12), dp(16), dp(12))
      background = roundedBackground("#171a1d", dp(18).toFloat())
      alpha = opacity.coerceAtLeast(0.94f).coerceAtMost(1f)
      contentDescription = if (existing == null) "Create overlay entry" else "Edit overlay entry"
    }

    val header = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    header.addView(makeHeaderButton("‹", "Back to workspace") { showExpandedPanel() }, LinearLayout.LayoutParams(dp(52), dp(52)))
    val heading = TextView(this).apply {
      text = if (existing == null) "New ${if (selectedTab == "memos") "memo" else "snippet"}" else "Edit entry"
      textSize = 18f
      setTextColor(Color.WHITE)
      setTypeface(Typeface.DEFAULT, Typeface.BOLD)
      gravity = Gravity.CENTER_VERTICAL
    }
    header.addView(heading, LinearLayout.LayoutParams(0, dp(52), 1f))
    header.addView(makeHeaderButton("×", "Close overlay") { stopSelf() }, LinearLayout.LayoutParams(dp(52), dp(52)))
    root.addView(header)

    val titleField = makeField("Title", existing?.optString("title").orEmpty(), singleLine = true)
    root.addView(titleField, LinearLayout.LayoutParams(-1, dp(54)).apply { setMargins(0, 0, 0, dp(8)) })

    val languageField = makeField("Language (for code formatting)", existing?.optString("language").orEmpty().ifBlank {
      if (selectedTab == "memos") "Plaintext" else "Auto-detect"
    }, singleLine = true)
    root.addView(languageField, LinearLayout.LayoutParams(-1, dp(54)).apply { setMargins(0, 0, 0, dp(8)) })

    val codeField = EditText(this).apply {
      hint = if (selectedTab == "memos") "Write a quick memo..." else "Paste or type code here..."
      setHintTextColor(Color.rgb(150, 150, 155))
      setTextColor(Color.WHITE)
      textSize = 15f
      gravity = Gravity.TOP or Gravity.START
      inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
      setSingleLine(false)
      setPadding(dp(12), dp(12), dp(12), dp(12))
      background = roundedBackground("#17181b", dp(10).toFloat())
      typeface = Typeface.MONOSPACE
      setText(existing?.optString("code").orEmpty())
      contentDescription = "Multiline code or memo editor"
    }
    root.addView(codeField, LinearLayout.LayoutParams(-1, 0, 1f).apply { setMargins(0, 0, 0, dp(10)) })

    if (existing != null) {
      root.addView(makeDangerButton("Delete entry", "Delete this overlay entry") {
        showDeleteConfirmation(existing.optString("id"))
      }, LinearLayout.LayoutParams(-1, dp(50)).apply { setMargins(0, 0, 0, dp(8)) })
    }

    val actions = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    actions.addView(makeSecondaryButton("Cancel", "Discard changes") { showExpandedPanel() }, LinearLayout.LayoutParams(0, dp(52), 1f).apply { setMargins(0, 0, dp(12), 0) })
    actions.addView(makePrimaryButton("Save", "Save overlay entry") {
      saveEntry(editingId, titleField.text.toString(), languageField.text.toString(), codeField.text.toString())
    }, LinearLayout.LayoutParams(0, dp(52), 1f))
    root.addView(actions)

    panelView = root
    panelParams = createParams(dp(PANEL_WIDTH_DP), dp(PANEL_HEIGHT_DP), focusable = true).also { params ->
      params.gravity = Gravity.TOP or Gravity.START
      params.x = dp(16)
      params.y = dp(92)
      params.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
    }
    root.setOnTouchListener(createDragListener { })
    windowManager.addView(root, panelParams)
  }

  private fun makeSnippetRow(item: JSONObject): View {
    val row = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(dp(12), dp(8), dp(8), dp(8))
      background = roundedBackground("#303134", dp(10).toFloat())
      contentDescription = "Open ${item.optString("title", "Untitled entry")}"
      setOnClickListener { showEditor(item.optString("id")) }
    }
    val contentLayout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    val titleView = TextView(this).apply {
      setText(item.optString("title", "Untitled entry"))
      textSize = 16f
      setTextColor(Color.WHITE)
      setTypeface(Typeface.DEFAULT, Typeface.BOLD)
      maxLines = 1
      ellipsize = android.text.TextUtils.TruncateAt.END
    }
    val preview = item.optString("code", "").replace("\n", " ").trim()
    val metadata = TextView(this).apply {
      setText(listOf(item.optString("language", "Plaintext"), preview.ifBlank { "Empty entry" }).joinToString(" • "))
      textSize = 12f
      setTextColor(Color.LTGRAY)
      maxLines = 2
      ellipsize = android.text.TextUtils.TruncateAt.END
    }
    contentLayout.addView(titleView)
    contentLayout.addView(metadata)
    row.addView(contentLayout, LinearLayout.LayoutParams(0, -2, 1f))
    row.addView(TextView(this).apply {
      setText("›")
      textSize = 28f
      setTextColor(Color.LTGRAY)
      gravity = Gravity.CENTER
      contentDescription = "Edit entry"
    }, LinearLayout.LayoutParams(dp(40), dp(56)))
    return row
  }

  private fun makeTabButton(label: String, tab: String): Button {
    return Button(this).apply {
      text = label
      textSize = 13f
      setTextColor(Color.WHITE)
      isAllCaps = false
      background = roundedBackground(if (selectedTab == tab) "#981518" else "#303134", dp(10).toFloat())
      contentDescription = "Show $label"
      setOnClickListener {
        selectedTab = tab
        searchQuery = ""
        showExpandedPanel()
      }
    }
  }

  private fun makeHeaderButton(label: String, description: String, action: () -> Unit): Button {
    return Button(this).apply {
      text = label
      textSize = 22f
      setTextColor(Color.WHITE)
      isAllCaps = false
      minHeight = dp(48)
      background = roundedBackground("#303134", dp(10).toFloat())
      contentDescription = description
      setOnClickListener { action() }
    }
  }

  private fun makePrimaryButton(label: String, description: String, action: () -> Unit): Button {
    return Button(this).apply {
      text = label
      textSize = 15f
      setTextColor(Color.WHITE)
      isAllCaps = false
      minHeight = dp(48)
      background = roundedBackground("#981518", dp(10).toFloat())
      contentDescription = description
      setOnClickListener { action() }
    }
  }

  private fun makeDangerButton(label: String, description: String, action: () -> Unit): Button {
    return Button(this).apply {
      text = label
      textSize = 15f
      setTextColor(Color.WHITE)
      isAllCaps = false
      minHeight = dp(48)
      background = roundedBackground("#7f1519", dp(10).toFloat())
      contentDescription = description
      setOnClickListener { action() }
    }
  }

  private fun makeSecondaryButton(label: String, description: String, action: () -> Unit): Button {
    return Button(this).apply {
      text = label
      textSize = 15f
      setTextColor(Color.WHITE)
      isAllCaps = false
      minHeight = dp(48)
      background = roundedBackground("#303134", dp(10).toFloat())
      contentDescription = description
      setOnClickListener { action() }
    }
  }

  private fun makeField(hintText: String, value: String, singleLine: Boolean): EditText {
    return EditText(this).apply {
      hint = hintText
      setHintTextColor(Color.rgb(150, 150, 155))
      setTextColor(Color.WHITE)
      textSize = 15f
      setText(value)
      setPadding(dp(12), 0, dp(12), 0)
      background = roundedBackground("#303134", dp(10).toFloat())
      inputType = InputType.TYPE_CLASS_TEXT or if (singleLine) 0 else InputType.TYPE_TEXT_FLAG_MULTI_LINE
      setSingleLine(singleLine)
      contentDescription = hintText
    }
  }

  private fun showDeleteConfirmation(id: String) {
    val dialog = AlertDialog.Builder(this)
      .setTitle("Delete this entry?")
      .setMessage("This removes the entry from the overlay and the main Snippet Bubbles library.")
      .setNegativeButton("Cancel", null)
      .setPositiveButton("Delete") { _, _ -> deleteEntry(id) }
      .create()
    dialog.window?.setType(
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      } else {
        WindowManager.LayoutParams.TYPE_PHONE
      },
    )
    dialog.show()
  }

  private fun deleteEntry(id: String) {
    if (id.isBlank()) return
    val source = runCatching { JSONArray(snippetsJson) }.getOrElse { JSONArray() }
    val next = JSONArray()
    var removed = false
    for (index in 0 until source.length()) {
      val item = source.optJSONObject(index) ?: continue
      if (item.optString("id") == id) {
        removed = true
      } else {
        next.put(item)
      }
    }
    if (!removed) return
    snippetsJson = next.toString()
    persistSnippets()
    appendPendingDelete(id)
    Toast.makeText(this, "Entry deleted.", Toast.LENGTH_SHORT).show()
    showExpandedPanel()
  }

  private fun saveEntry(editingId: String?, rawTitle: String, rawLanguage: String, code: String) {
    if (code.isBlank()) {
      Toast.makeText(this, "Add some text before saving.", Toast.LENGTH_SHORT).show()
      return
    }
    val titleValue = rawTitle.trim().ifBlank { "Quick memo" }
    val languageValue = rawLanguage.trim().ifBlank { "Plaintext" }
    val now = System.currentTimeMillis()
    val id = editingId?.takeIf { it.isNotBlank() } ?: "overlay-${UUID.randomUUID()}"
    val existing = editingId?.let { findSnippet(it) }
    val entry = JSONObject().apply {
      put("id", id)
      put("title", titleValue)
      put("language", languageValue)
      put("code", code)
      put("description", existing?.optString("description", "") ?: "")
      put("tags", existing?.optJSONArray("tags") ?: JSONArray())
      put("isFavorite", existing?.optBoolean("isFavorite", false) ?: false)
      put("isPinned", existing?.optBoolean("isPinned", false) ?: false)
      put("lastCopiedAt", existing?.opt("lastCopiedAt") ?: JSONObject.NULL)
      put("createdAt", existing?.optLong("createdAt", now) ?: now)
      put("updatedAt", now)
    }

    val next = JSONArray(snippetsJson)
    var replaced = false
    for (index in 0 until next.length()) {
      if (next.optJSONObject(index)?.optString("id") == id) {
        next.put(index, entry)
        replaced = true
        break
      }
    }
    if (!replaced) {
      if (next.length() >= MAX_OVERLAY_ITEMS) {
        Toast.makeText(this, "The overlay is full. Edit or remove an existing entry first.", Toast.LENGTH_LONG).show()
        return
      }
      next.put(0, entry)
    }
    snippetsJson = next.toString()
    persistSnippets()
    appendPendingUpsert(entry)
    Toast.makeText(this, "Saved to Snippet Bubbles.", Toast.LENGTH_SHORT).show()
    showExpandedPanel()
  }

  private fun visibleItems(): JSONArray {
    val source = runCatching { JSONArray(snippetsJson) }.getOrElse { JSONArray() }
    val result = JSONArray()
    for (index in 0 until min(source.length(), MAX_OVERLAY_ITEMS)) {
      val item = source.optJSONObject(index) ?: continue
      val language = item.optString("language", "")
      val isMemo = language.equals("Plaintext", ignoreCase = true) || language.equals("Memo", ignoreCase = true)
      if ((selectedTab == "memos") != isMemo) continue
      if (searchQuery.isNotBlank()) {
        val query = searchQuery.trim().lowercase()
        val matches = item.optString("title").lowercase().contains(query) ||
          item.optString("code").lowercase().contains(query) ||
          language.lowercase().contains(query)
        if (!matches) continue
      }
      result.put(item)
    }
    return result
  }

  private fun findSnippet(id: String): JSONObject? {
    val source = runCatching { JSONArray(snippetsJson) }.getOrElse { JSONArray() }
    for (index in 0 until source.length()) {
      val item = source.optJSONObject(index) ?: continue
      if (item.optString("id") == id) return item
    }
    return null
  }

  private fun appendPendingDelete(id: String) {
    val prefs = getPreferences()
    val existing = runCatching { JSONArray(prefs.getString(FLOATING_BUBBLE_PENDING_CHANGES, "[]") ?: "[]") }.getOrElse { JSONArray() }
    val next = JSONArray()
    for (index in 0 until existing.length()) {
      val change = existing.optJSONObject(index) ?: continue
      val changeId = change.optString("id").ifBlank { change.optJSONObject("snippet")?.optString("id") ?: "" }
      if (changeId != id) next.put(change)
    }
    next.put(JSONObject().put("type", "delete").put("id", id))
    prefs.edit().putString(FLOATING_BUBBLE_PENDING_CHANGES, next.toString()).apply()
  }

  private fun appendPendingUpsert(entry: JSONObject) {
    val prefs = getPreferences()
    val existing = runCatching { JSONArray(prefs.getString(FLOATING_BUBBLE_PENDING_CHANGES, "[]") ?: "[]") }.getOrElse { JSONArray() }
    val next = JSONArray()
    var replaced = false
    for (index in 0 until existing.length()) {
      val change = existing.optJSONObject(index) ?: continue
      if (change.optString("type") == "upsert" && change.optJSONObject("snippet")?.optString("id") == entry.optString("id")) {
        if (!replaced) {
          next.put(JSONObject().put("type", "upsert").put("snippet", entry))
          replaced = true
        }
      } else {
        next.put(change)
      }
    }
    if (!replaced) next.put(JSONObject().put("type", "upsert").put("snippet", entry))
    prefs.edit().putString(FLOATING_BUBBLE_PENDING_CHANGES, next.toString()).apply()
  }

  private fun persistSnippets() {
    getPreferences().edit().putString(FLOATING_BUBBLE_SNIPPETS, snippetsJson).apply()
  }

  private fun getPreferences() = getSharedPreferences(FLOATING_BUBBLE_PREFS, Context.MODE_PRIVATE)

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
          if (abs(dx) > 5 || abs(dy) > 5) moved = true
          params.x = initialX + dx
          params.y = initialY + dy
          windowManager.updateViewLayout(view, params)
          true
        }
        MotionEvent.ACTION_UP -> {
          if (!moved) onTap()
          if (snapToEdge && view === bubbleView) {
            params.x = if (params.x < resources.displayMetrics.widthPixels / 2) dp(12) else resources.displayMetrics.widthPixels - params.width - dp(12)
            windowManager.updateViewLayout(view, params)
          }
          true
        }
        else -> false
      }
    }
  }

  private fun createParams(width: Int, height: Int, focusable: Boolean): WindowManager.LayoutParams {
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      WindowManager.LayoutParams.TYPE_PHONE
    }
    val flags = WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
      if (focusable) WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL else WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
    return WindowManager.LayoutParams(width, height, type, flags, PixelFormat.TRANSLUCENT)
  }

  private fun removeOverlayViews() {
    panelView?.let { runCatching { windowManager.removeView(it) } }
    bubbleView?.let { runCatching { windowManager.removeView(it) } }
    panelView = null
    bubbleView = null
    panelParams = null
    bubbleParams = null
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

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
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL_ID) else Notification.Builder(this)
    return builder
      .setContentTitle("Snippet Bubbles is ready")
      .setContentText("Your floating snippet workspace is available above other apps.")
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
