package com.snippetbubbles.floatingbubble

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.types.Enumerable
import expo.modules.kotlin.Promise
import org.json.JSONArray
import org.json.JSONObject

private enum class BubbleSize(val value: String) : Enumerable {
  SMALL("small"), MEDIUM("medium"), LARGE("large");

  override fun toString() = value

  companion object {
    fun from(value: String) = entries.firstOrNull { it.value == value } ?: MEDIUM
  }
}

class FloatingBubbleModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SnippetBubblesFloatingBubble")

    Function("isSupported") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
    }

    AsyncFunction("canDrawOverlays") {
      Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(requireContext())
    }

    AsyncFunction("requestOverlayPermission") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
        true
      } else if (Settings.canDrawOverlays(requireContext())) {
        true
      } else {
        val intent = Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:${requireContext().packageName}"),
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        requireContext().startActivity(intent)
        false
      }
    }

    AsyncFunction("start") { options: Map<String, Any?> ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(requireContext())) {
        false
      } else {
        val intent = Intent(requireContext(), FloatingBubbleService::class.java).apply {
          action = FloatingBubbleService.ACTION_START
          putExtra(FloatingBubbleService.EXTRA_TITLE, options["title"] as? String ?: "Snippet Bubbles")
          putExtra(FloatingBubbleService.EXTRA_SNIPPETS, snippetsJson(options["snippets"]))
          putExtra(FloatingBubbleService.EXTRA_SIZE, options["size"] as? String ?: BubbleSize.MEDIUM.value)
          putExtra(FloatingBubbleService.EXTRA_OPACITY, (options["opacity"] as? Number)?.toFloat() ?: 0.86f)
          putExtra(FloatingBubbleService.EXTRA_SNAP_TO_EDGE, options["snapToEdge"] as? Boolean ?: true)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          requireContext().startForegroundService(intent)
        } else {
          requireContext().startService(intent)
        }
        true
      }
    }

    AsyncFunction("updateSnippets") { snippets: List<Map<String, Any?>> ->
      val intent = Intent(requireContext(), FloatingBubbleService::class.java).apply {
        action = FloatingBubbleService.ACTION_UPDATE_SNIPPETS
        putExtra(FloatingBubbleService.EXTRA_SNIPPETS, snippetsJson(snippets))
      }
      requireContext().startService(intent)
    }

    AsyncFunction("drainPendingChanges") {
      val preferences = requireContext().getSharedPreferences(FLOATING_BUBBLE_PREFS, android.content.Context.MODE_PRIVATE)
      val pending = preferences.getString(FLOATING_BUBBLE_PENDING_CHANGES, "[]") ?: "[]"
      preferences.edit().putString(FLOATING_BUBBLE_PENDING_CHANGES, "[]").apply()
      pending
    }

    AsyncFunction("stop") {
      requireContext().stopService(Intent(requireContext(), FloatingBubbleService::class.java))
    }
  }

  private fun requireContext() = requireNotNull(appContext.reactContext) {
    "React application context is unavailable"
  }

  private fun stringArray(value: Any?): JSONArray {
    val array = JSONArray()
    (value as? List<*>)?.forEach { item ->
      if (item != null) array.put(item.toString())
    }
    return array
  }

  private fun snippetsJson(value: Any?): String {
    val list = value as? List<*> ?: emptyList<Any?>()
    val array = JSONArray()
    list.forEach { item ->
      val source = item as? Map<*, *> ?: return@forEach
      val objectValue = JSONObject()
      objectValue.put("id", source["id"]?.toString() ?: "")
      objectValue.put("title", source["title"]?.toString() ?: "Untitled snippet")
      objectValue.put("language", source["language"]?.toString() ?: "")
      objectValue.put("code", source["code"]?.toString() ?: "")
      objectValue.put("description", source["description"]?.toString() ?: "")
      objectValue.put("tags", stringArray(source["tags"]))
      objectValue.put("categoryId", source["categoryId"]?.toString() ?: JSONObject.NULL)
      objectValue.put("collectionIds", stringArray(source["collectionIds"]))
      objectValue.put("isFavorite", source["isFavorite"] as? Boolean ?: false)
      objectValue.put("isPinned", source["isPinned"] as? Boolean ?: false)
      objectValue.put("lastCopiedAt", source["lastCopiedAt"] ?: JSONObject.NULL)
      objectValue.put("copyCount", source["copyCount"] ?: 0)
      objectValue.put("createdAt", (source["createdAt"] as? Number)?.toLong() ?: System.currentTimeMillis())
      objectValue.put("updatedAt", (source["updatedAt"] as? Number)?.toLong() ?: System.currentTimeMillis())
      array.put(objectValue)
    }
    return array.toString()
  }
}
