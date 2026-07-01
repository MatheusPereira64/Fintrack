package com.fintrackapp.notification;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.provider.Settings;
import android.text.TextUtils;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import javax.annotation.Nonnull;

/**
 * Módulo React Native que expõe funções nativas para o lado JS:
 * - Verificar se a permissão de notificações está ativa
 * - Abrir as configurações de acesso a notificações
 * - Registrar o ReactContext no serviço de listener
 */
public class NotificationModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "NotificationModule";

    public NotificationModule(ReactApplicationContext context) {
        super(context);
        // Registra o contexto para o serviço poder emitir eventos
        FinTrackNotificationService.setReactContext(context);
    }

    @Nonnull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Verifica se o app tem permissão para acessar notificações.
     * A permissão é concedida via Configurações → Acesso a Notificações.
     */
    @ReactMethod
    public void hasNotificationPermission(Promise promise) {
        try {
            String pkgName = getReactApplicationContext().getPackageName();
            String flat    = Settings.Secure.getString(
                getReactApplicationContext().getContentResolver(),
                "enabled_notification_listeners"
            );
            boolean enabled = !TextUtils.isEmpty(flat) && flat.contains(pkgName);
            promise.resolve(enabled);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    /**
     * Abre a tela de configurações do Android para o usuário
     * conceder permissão de acesso a notificações.
     */
    @ReactMethod
    public void openNotificationSettings(Promise promise) {
        try {
            Activity activity = getCurrentActivity();
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity não disponível");
                return;
            }

            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    /**
     * Tenta iniciar o serviço de listener manualmente (para casos onde
     * o serviço não inicia automaticamente após concessão de permissão).
     */
    @ReactMethod
    public void requestListenerBind(Promise promise) {
        try {
            ComponentName component = new ComponentName(
                getReactApplicationContext(),
                FinTrackNotificationService.class
            );
            promise.resolve(component.flattenToShortString());
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    /**
     * Retorna apps bancários instalados cujo packageName está na lista monitorada.
     */
    @ReactMethod
    public void getInstalledBankApps(Promise promise) {
        try {
            ReactApplicationContext context = getReactApplicationContext();
            PackageManager pm = context.getPackageManager();
            WritableArray result = Arguments.createArray();

            for (ApplicationInfo info : pm.getInstalledApplications(PackageManager.GET_META_DATA)) {
                String pkg = info.packageName;
                if (!FinTrackNotificationService.BANK_PACKAGES.contains(pkg)) {
                    continue;
                }
                WritableMap map = Arguments.createMap();
                map.putString("packageName", pkg);
                map.putString("label", pm.getApplicationLabel(info).toString());
                result.pushMap(map);
            }
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}
