package com.fintrackapp.device;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.fragment.app.FragmentActivity;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.File;

import javax.annotation.Nonnull;

/**
 * Recursos do aparelho usados pelo app:
 * - compartilhar um arquivo (backup) pelo menu de compartilhamento do Android;
 * - bloqueio do app com biometria ou PIN/padrão do aparelho.
 */
public class DeviceModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "DeviceModule";

    public DeviceModule(ReactApplicationContext context) {
        super(context);
    }

    @Nonnull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    // ── Compartilhar arquivo ──────────────────────────────────────────────────

    @ReactMethod
    public void shareFile(String filePath, String mimeType, String title, Promise promise) {
        try {
            File file = new File(filePath);
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "Arquivo não encontrado: " + filePath);
                return;
            }
            ReactApplicationContext context = getReactApplicationContext();
            Uri uri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", file);

            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mimeType);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.putExtra(Intent.EXTRA_SUBJECT, file.getName());
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(send, title);
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Activity activity = getCurrentActivity();
            if (activity != null) {
                activity.startActivity(chooser);
            } else {
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(chooser);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SHARE_ERROR", e.getMessage());
        }
    }

    // ── Bloqueio do app ───────────────────────────────────────────────────────

    /** Biometria fraca (digital/rosto) ou o bloqueio de tela do aparelho como alternativa. */
    private int authenticators() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return BiometricManager.Authenticators.BIOMETRIC_WEAK
                | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
        }
        return BiometricManager.Authenticators.BIOMETRIC_WEAK;
    }

    @ReactMethod
    public void canAuthenticate(Promise promise) {
        try {
            int result = BiometricManager.from(getReactApplicationContext()).canAuthenticate(authenticators());
            promise.resolve(result == BiometricManager.BIOMETRIC_SUCCESS);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void authenticate(String title, String subtitle, String cancelLabel, Promise promise) {
        Activity activity = getCurrentActivity();
        if (!(activity instanceof FragmentActivity)) {
            promise.reject("NO_ACTIVITY", "Activity não disponível");
            return;
        }
        FragmentActivity fragmentActivity = (FragmentActivity) activity;

        fragmentActivity.runOnUiThread(() -> {
            try {
                BiometricPrompt.PromptInfo.Builder info = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title)
                    .setSubtitle(subtitle);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    info.setAllowedAuthenticators(authenticators());
                } else {
                    // Até o Android 10 a alternativa PIN/padrão usa a API antiga.
                    info.setDeviceCredentialAllowed(true);
                }

                BiometricPrompt prompt = new BiometricPrompt(
                    fragmentActivity,
                    ContextCompat.getMainExecutor(fragmentActivity),
                    new BiometricPrompt.AuthenticationCallback() {
                        private boolean settled = false;

                        @Override
                        public void onAuthenticationSucceeded(@Nonnull BiometricPrompt.AuthenticationResult result) {
                            if (settled) return;
                            settled = true;
                            promise.resolve(true);
                        }

                        @Override
                        public void onAuthenticationError(int errorCode, @Nonnull CharSequence errString) {
                            if (settled) return;
                            settled = true;
                            promise.resolve(false);
                        }
                    });
                prompt.authenticate(info.build());
            } catch (Exception e) {
                promise.reject("AUTH_ERROR", e.getMessage());
            }
        });
    }
}
