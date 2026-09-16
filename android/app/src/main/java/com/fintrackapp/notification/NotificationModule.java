package com.fintrackapp.notification;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Base64;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.io.ByteArrayOutputStream;

import javax.annotation.Nonnull;

public class NotificationModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "NotificationModule";
    private static final int ICON_SIZE_PX = 72;

    public NotificationModule(ReactApplicationContext context) {
        super(context);
        FinTrackNotificationService.setJsReady(false);
        FinTrackNotificationService.setReactContext(context);
    }

    @Nonnull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void addListener(String eventName) {
        // NativeEventEmitter
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        // NativeEventEmitter
    }

    @ReactMethod
    public void flushPendingNotifications(Promise promise) {
        try {
            promise.resolve(FinTrackNotificationService.drainPendingAndMarkReady());
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

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

    /** Lista bancos instalados sem ícones (rápido). */
    @ReactMethod
    public void getInstalledBankApps(Promise promise) {
        try {
            ReactApplicationContext context = getReactApplicationContext();
            PackageManager pm = context.getPackageManager();
            WritableArray result = Arguments.createArray();

            for (String pkg : BankPackages.ALL) {
                try {
                    ApplicationInfo info;
                    if (android.os.Build.VERSION.SDK_INT >= 33) {
                        info = pm.getApplicationInfo(pkg, PackageManager.ApplicationInfoFlags.of(0));
                    } else {
                        info = pm.getApplicationInfo(pkg, 0);
                    }
                    if (info == null) continue;

                    WritableMap map = Arguments.createMap();
                    map.putString("packageName", pkg);
                    CharSequence label = pm.getApplicationLabel(info);
                    map.putString("label", label != null ? label.toString() : pkg);
                    result.pushMap(map);
                } catch (PackageManager.NameNotFoundException ignored) {
                    // App não instalado
                }
            }
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    /** Ícone de um único app, sob demanda. */
    @ReactMethod
    public void getBankAppIcon(String packageName, Promise promise) {
        try {
            PackageManager pm = getReactApplicationContext().getPackageManager();
            ApplicationInfo info;
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                info = pm.getApplicationInfo(packageName, PackageManager.ApplicationInfoFlags.of(0));
            } else {
                info = pm.getApplicationInfo(packageName, 0);
            }
            Drawable icon = pm.getApplicationIcon(info);
            String base64 = drawableToPngBase64(icon, ICON_SIZE_PX);
            promise.resolve(base64);
        } catch (Exception e) {
            promise.resolve(null);
        }
    }

    private static String drawableToPngBase64(Drawable drawable, int sizePx) {
        if (drawable == null) return null;

        Bitmap bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        if (drawable instanceof BitmapDrawable) {
            Bitmap src = ((BitmapDrawable) drawable).getBitmap();
            if (src != null && !src.isRecycled()) {
                Bitmap scaled = Bitmap.createScaledBitmap(src, sizePx, sizePx, true);
                canvas.drawBitmap(scaled, 0, 0, null);
                if (scaled != src) {
                    scaled.recycle();
                }
            } else {
                drawable.setBounds(0, 0, sizePx, sizePx);
                drawable.draw(canvas);
            }
        } else {
            drawable.setBounds(0, 0, sizePx, sizePx);
            drawable.draw(canvas);
        }

        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        boolean ok = bitmap.compress(Bitmap.CompressFormat.PNG, 85, stream);
        bitmap.recycle();
        if (!ok) return null;
        byte[] bytes = stream.toByteArray();
        if (bytes.length == 0) return null;
        return Base64.encodeToString(bytes, Base64.NO_WRAP);
    }
}
