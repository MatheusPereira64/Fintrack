package com.fintrackapp.update;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.fintrackapp.BuildConfig;

import java.io.File;

import javax.annotation.Nonnull;

/**
 * Expõe versão do app e instalação de APK (atualização via GitHub Releases).
 * Atualizar o mesmo applicationId + mesma assinatura preserva dados do usuário.
 */
public class UpdateModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "UpdateModule";

    public UpdateModule(ReactApplicationContext context) {
        super(context);
    }

    @Nonnull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void getVersionInfo(Promise promise) {
        try {
            WritableMap map = Arguments.createMap();
            map.putString("versionName", BuildConfig.VERSION_NAME);
            map.putInt("versionCode", BuildConfig.VERSION_CODE);
            map.putString("applicationId", BuildConfig.APPLICATION_ID);
            promise.resolve(map);
        } catch (Exception e) {
            promise.reject("VERSION_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void canRequestPackageInstalls(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                boolean allowed = getReactApplicationContext()
                    .getPackageManager()
                    .canRequestPackageInstalls();
                promise.resolve(allowed);
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.reject("INSTALL_PERM_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void openUnknownSourcesSettings(Promise promise) {
        try {
            Activity activity = getCurrentActivity();
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity não disponível");
                return;
            }
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + getReactApplicationContext().getPackageName()));
            } else {
                intent = new Intent(Settings.ACTION_SECURITY_SETTINGS);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SETTINGS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void installApk(String filePath, Promise promise) {
        try {
            File file = new File(filePath);
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "APK não encontrado: " + filePath);
                return;
            }

            ReactApplicationContext context = getReactApplicationContext();
            Uri uri = FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                file
            );

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Activity activity = getCurrentActivity();
            if (activity != null) {
                activity.startActivity(intent);
            } else {
                context.startActivity(intent);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("INSTALL_ERROR", e.getMessage());
        }
    }
}
