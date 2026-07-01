package com.fintrackapp.notification;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONObject;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Serviço Android que monitora notificações de aplicativos bancários.
 * Requer permissão especial do usuário via Configurações → Acesso a Notificações.
 *
 * O serviço emite eventos para o lado JavaScript via ReactEventEmitter
 * quando detecta uma notificação de um banco conhecido.
 */
public class FinTrackNotificationService extends NotificationListenerService {

    private static final String TAG = "FinTrackNotif";
    private static final String EVENT_BANK_NOTIFICATION = "onBankNotification";

    // Package names dos bancos monitorados (mantido sincronizado com BankRegistry.ts)
    private static final Set<String> BANK_PACKAGES = new HashSet<>(Arrays.asList(
        "com.nubank.nubank",
        "br.com.intermedium",
        "com.bancointer.banking",
        "com.itau",
        "com.itau.empresas",
        "com.bradesco",
        "com.bradesco.prime",
        "com.bb.android",
        "com.santander.app",
        "com.santander.way",
        "br.com.c6bank.app",
        "br.gov.caixa.internet.smartphones",
        "com.mercadopago.wallet",
        "com.picpay",
        "br.com.bradesco.next",
        "br.com.original.bank",
        "br.com.uol.ps.myaccount",
        "br.com.neon.app",
        "com.willbank"
    ));

    // Instância estática para comunicar com o módulo React Native
    private static ReactContext reactContext;

    public static void setReactContext(ReactContext context) {
        reactContext = context;
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String packageName = sbn.getPackageName();

        if (!BANK_PACKAGES.contains(packageName)) {
            return;
        }

        try {
            Notification notification = sbn.getNotification();
            Bundle extras = notification.extras;

            // Concatena todos os campos de texto disponíveis
            String title = extras.getCharSequence(Notification.EXTRA_TITLE, "").toString();
            String text    = extras.getCharSequence(Notification.EXTRA_TEXT, "").toString();
            String subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT, "").toString();
            String bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT, "").toString();

            String bodyText = bigText.isEmpty() ? text : bigText;
            if (subText != null && !subText.isEmpty() && !bodyText.contains(subText)) {
                bodyText = bodyText + " " + subText;
            }
            // Se o corpo estiver vazio, usa o título como fonte principal
            if (bodyText.trim().isEmpty()) {
                bodyText = title;
            }

            JSONObject payload = new JSONObject();
            payload.put("packageName", packageName);
            payload.put("title",       title);
            payload.put("text",        bodyText);
            payload.put("subText",     subText);
            payload.put("timestamp",   sbn.getPostTime());

            Log.d(TAG, "Bank notification: " + packageName + " | " + title);
            sendEventToJS(EVENT_BANK_NOTIFICATION, payload.toString());

        } catch (Exception e) {
            Log.e(TAG, "Error processing notification", e);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Não é necessário processar remoção
    }

    private void sendEventToJS(String eventName, String payload) {
        if (reactContext == null) {
            Log.w(TAG, "ReactContext is null, cannot send event: " + eventName);
            return;
        }

        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, payload);
        } catch (Exception e) {
            Log.e(TAG, "Error sending event to JS", e);
        }
    }
}
