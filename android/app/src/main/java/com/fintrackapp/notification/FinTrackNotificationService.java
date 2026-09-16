package com.fintrackapp.notification;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONObject;

import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * Serviço Android que monitora notificações de aplicativos bancários.
 * Dedupe por chave do sistema + buffer quando o JS ainda não está pronto.
 */
public class FinTrackNotificationService extends NotificationListenerService {

    private static final String TAG = "FinTrackNotif";
    private static final String EVENT_BANK_NOTIFICATION = "onBankNotification";
    private static final int MAX_PENDING = 50;
    private static final int MAX_SEEN = 80;

    static final Set<String> BANK_PACKAGES = BankPackages.ALL;

    private static ReactContext reactContext;
    private static volatile boolean jsReady = false;
    private static final Queue<String> pending = new ConcurrentLinkedQueue<>();
    private static final Map<String, Long> seenKeys = new LinkedHashMap<String, Long>(MAX_SEEN + 4, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Long> eldest) {
            return size() > MAX_SEEN;
        }
    };

    public static void setReactContext(ReactContext context) {
        reactContext = context;
    }

    public static void setJsReady(boolean ready) {
        jsReady = ready;
    }

    /** Entrega o buffer ao JS (após addListener) e marca o runtime como pronto. */
    public static WritableArray drainPendingAndMarkReady() {
        jsReady = true;
        WritableArray arr = Arguments.createArray();
        String item;
        while ((item = pending.poll()) != null) {
            arr.pushString(item);
        }
        return arr;
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String packageName = sbn.getPackageName();

        if (!BANK_PACKAGES.contains(packageName)) {
            return;
        }

        try {
            Notification notification = sbn.getNotification();
            if (notification == null) return;

            if ((notification.flags & Notification.FLAG_GROUP_SUMMARY) != 0) {
                Log.d(TAG, "Skip group summary: " + packageName);
                return;
            }

            String dedupeKey = buildDedupeKey(sbn);
            if (isDuplicate(dedupeKey)) {
                Log.d(TAG, "Skip duplicate: " + dedupeKey);
                return;
            }

            Bundle extras = notification.extras;

            String title = extras.getCharSequence(Notification.EXTRA_TITLE, "").toString();
            String text    = extras.getCharSequence(Notification.EXTRA_TEXT, "").toString();
            String subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT, "").toString();
            String bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT, "").toString();

            String bodyText = bigText.isEmpty() ? text : bigText;
            if (subText != null && !subText.isEmpty() && !bodyText.contains(subText)) {
                bodyText = bodyText + " " + subText;
            }
            if (bodyText.trim().isEmpty()) {
                bodyText = title;
            }

            JSONObject payload = new JSONObject();
            payload.put("packageName", packageName);
            payload.put("title",       title);
            payload.put("text",        bodyText);
            payload.put("subText",     subText);
            payload.put("timestamp",   sbn.getPostTime());
            payload.put("key",         dedupeKey);

            Log.d(TAG, "Bank notification: " + packageName + " | " + title);
            dispatch(payload.toString());

        } catch (Exception e) {
            Log.e(TAG, "Error processing notification", e);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Não é necessário processar remoção
    }

    private static String buildDedupeKey(StatusBarNotification sbn) {
        String key = sbn.getKey();
        if (key != null && !key.isEmpty()) return key;
        return sbn.getPackageName() + "|" + sbn.getId() + "|" + sbn.getPostTime();
    }

    private static boolean isDuplicate(String key) {
        synchronized (seenKeys) {
            if (seenKeys.containsKey(key)) return true;
            seenKeys.put(key, System.currentTimeMillis());
            return false;
        }
    }

    private static void dispatch(String payload) {
        if (!jsReady || reactContext == null) {
            enqueue(payload);
            Log.w(TAG, "JS not ready, buffered notification (" + pending.size() + ")");
            return;
        }
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(EVENT_BANK_NOTIFICATION, payload);
        } catch (Exception e) {
            Log.e(TAG, "Error sending event to JS, buffering", e);
            enqueue(payload);
        }
    }

    private static void enqueue(String payload) {
        while (pending.size() >= MAX_PENDING) {
            pending.poll();
        }
        pending.add(payload);
    }
}
